import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseEmailCases } from "@/lib/parse-email-cases";
import { Resend } from "resend";
import { generateEmbedding, buildCaseEmbeddingText } from "@/lib/embedding";
import { queueMatchingRun } from "@/lib/matching/runMatching";
import type { Case } from "@/lib/types";

/**
 * メール転送 Webhook — 案件メールを自動パース・登録
 *
 * 対応する転送サービス:
 * 1. Resend Inbound (推奨) — email.received webhook → Resend APIでbody取得
 * 2. Zapier / Make — POST with JSON {text, from, subject}
 * 3. Cloudflare Email Workers — POST with text body
 * 4. 汎用 — POST with raw text or JSON
 *
 * 認証: EMAIL_INTAKE_SECRET を x-intake-key ヘッダーまたは ?key= で検証
 */

const INTAKE_SECRET = process.env.EMAIL_INTAKE_SECRET || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@persona-consultant.com";

const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB

interface EmailAttachment {
  filename: string;
  content_type: string;
  content: string; // base64
}

/**
 * Resend Inbound のイベント形式を検出
 */
function isResendInboundEvent(
  body: Record<string, unknown>
): body is {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
  };
} {
  return (
    typeof body.type === "string" &&
    body.type === "email.received" &&
    typeof body.data === "object" &&
    body.data !== null &&
    "email_id" in (body.data as Record<string, unknown>)
  );
}

/**
 * Resend API でメール本文＋添付ファイルを取得
 */
async function fetchResendEmailBody(
  emailId: string
): Promise<{
  text: string;
  from: string;
  subject: string;
  attachments: EmailAttachment[];
} | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(
        `Failed to fetch Resend email ${emailId}: ${res.status}`
      );
      return null;
    }
    const data = await res.json();

    // テキスト本文を優先、なければHTMLからテキスト抽出
    let text = data.text || "";
    if (!text && data.html) {
      text = data.html.replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n");
    }

    // 添付ファイルを抽出
    const attachments: EmailAttachment[] = [];
    if (Array.isArray(data.attachments)) {
      for (const att of data.attachments) {
        if (att.filename && att.content) {
          attachments.push({
            filename: att.filename,
            content_type: att.content_type || "application/octet-stream",
            content: att.content,
          });
        }
      }
    }

    return {
      text,
      from: data.from || "",
      subject: data.subject || "",
      attachments,
    };
  } catch (err) {
    console.error("Error fetching Resend email:", err);
    return null;
  }
}

/**
 * メール取込イベントをDBに記録（サイレント失敗）
 */
async function logIntakeEvent(
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    fromAddress?: string;
    subject?: string;
    bodyPreview?: string;
    casesExtracted: number;
    casesImported: number;
    duplicatesSkipped: number;
    errors: string[];
    status: "success" | "partial" | "failed" | "no_cases";
    processingTimeMs: number;
  }
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("email_intake_logs")
      .insert({
        from_address: params.fromAddress || null,
        subject: params.subject || null,
        body_preview: params.bodyPreview || null,
        cases_extracted: params.casesExtracted,
        cases_imported: params.casesImported,
        duplicates_skipped: params.duplicatesSkipped,
        errors: params.errors.length > 0 ? params.errors : [],
        status: params.status,
        processing_time_ms: params.processingTimeMs,
      })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch {
    console.error("Failed to log email intake event");
    return null;
  }
}

/**
 * 添付ファイルをSupabase Storageに保存（ベストエフォート）
 */
async function saveAttachments(
  supabase: ReturnType<typeof createServiceClient>,
  logId: string,
  attachments: EmailAttachment[]
): Promise<number> {
  let savedCount = 0;

  for (const att of attachments) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(att.content_type)) continue;
    if (!att.content) continue;

    try {
      const buffer = Buffer.from(att.content, "base64");
      if (buffer.length > MAX_ATTACHMENT_SIZE) continue;

      const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `email-intake/${logId}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("resumes")
        .upload(storagePath, buffer, {
          contentType: att.content_type,
          upsert: false,
        });

      if (uploadErr) {
        console.error("Attachment upload error:", uploadErr);
        continue;
      }

      await supabase.from("email_attachments").insert({
        email_intake_id: logId,
        filename: att.filename,
        file_path: storagePath,
        file_size: buffer.length,
        mime_type: att.content_type,
      });

      savedCount++;
    } catch (err) {
      console.error("Error saving attachment:", err);
    }
  }

  // 添付件数をログに記録
  if (savedCount > 0) {
    await supabase
      .from("email_intake_logs")
      .update({ attachments_count: savedCount })
      .eq("id", logId);
  }

  return savedCount;
}

export async function POST(request: NextRequest) {
  // ── 認証 ──
  if (!INTAKE_SECRET) {
    return NextResponse.json(
      { error: "EMAIL_INTAKE_SECRET not configured" },
      { status: 500 }
    );
  }

  const keyFromHeader = request.headers.get("x-intake-key") || "";
  const keyFromQuery = request.nextUrl.searchParams.get("key") || "";
  if (keyFromHeader !== INTAKE_SECRET && keyFromQuery !== INTAKE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    // ── メール本文を取得 ──
    let emailText = "";
    let emailFrom = "";
    let emailSubject = "";
    let attachments: EmailAttachment[] = [];

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();

      // ── Pattern 1: Resend Inbound webhook ──
      if (isResendInboundEvent(body)) {
        const emailData = await fetchResendEmailBody(body.data.email_id);
        if (!emailData || !emailData.text) {
          await notifyAdmin(
            "⚠️ 案件メール転送: 本文取得失敗",
            `Resend email_id: ${body.data.email_id}\nFrom: ${body.data.from}\nSubject: ${body.data.subject}\n\nResend APIからメール本文を取得できませんでした。`
          );
          await logIntakeEvent(supabase, {
            fromAddress: body.data.from,
            subject: body.data.subject,
            casesExtracted: 0,
            casesImported: 0,
            duplicatesSkipped: 0,
            errors: ["Resend APIからメール本文を取得できませんでした"],
            status: "failed",
            processingTimeMs: Date.now() - startTime,
          });
          return NextResponse.json({
            imported: 0,
            message: "Could not fetch email body from Resend",
          });
        }
        emailText = emailData.text;
        emailFrom = emailData.from;
        emailSubject = emailData.subject;
        attachments = emailData.attachments;
      } else {
        // ── Pattern 2: Direct JSON (Zapier / Make / etc.) ──
        emailText =
          body.text ||
          body.body ||
          body.plain ||
          body["stripped-text"] ||
          "";
        emailFrom = body.from || body.sender || body.From || "";
        emailSubject = body.subject || body.Subject || "";

        // HTML only の場合、htmlからテキスト抽出
        if (!emailText && body.html) {
          emailText = body.html
            .replace(/<[^>]+>/g, "\n")
            .replace(/\n{3,}/g, "\n\n");
        }

        // 添付ファイル（Zapier/Make経由）
        if (Array.isArray(body.attachments)) {
          attachments = body.attachments.filter(
            (a: Record<string, unknown>) =>
              typeof a.filename === "string" && typeof a.content === "string"
          ) as EmailAttachment[];
        }
      }
    } else if (
      contentType.includes("text/plain") ||
      contentType.includes("multipart/form-data")
    ) {
      // ── Pattern 3: Raw text ──
      emailText = await request.text();
    } else {
      // フォールバック: テキストとして読む
      emailText = await request.text();
    }

    if (!emailText || emailText.trim().length < 20) {
      await logIntakeEvent(supabase, {
        fromAddress: emailFrom,
        subject: emailSubject,
        bodyPreview: emailText?.substring(0, 500),
        casesExtracted: 0,
        casesImported: 0,
        duplicatesSkipped: 0,
        errors: ["メール本文が空または短すぎます"],
        status: "failed",
        processingTimeMs: Date.now() - startTime,
      });
      return NextResponse.json(
        { error: "Empty or too short email body" },
        { status: 400 }
      );
    }

    // ── パース ──
    const result = parseEmailCases(emailText);

    if (result.cases.length === 0) {
      // パースできなかった場合、管理者に通知
      await notifyAdmin(
        "⚠️ 案件メール転送: パース失敗",
        `案件を抽出できませんでした。\n\nFrom: ${emailFrom}\nSubject: ${emailSubject}\n\n--- メール本文（先頭500文字） ---\n${emailText.substring(0, 500)}`
      );
      const noParseLogId = await logIntakeEvent(supabase, {
        fromAddress: emailFrom,
        subject: emailSubject,
        bodyPreview: emailText.substring(0, 500),
        casesExtracted: 0,
        casesImported: 0,
        duplicatesSkipped: 0,
        errors: result.errors.length > 0 ? result.errors : ["案件を抽出できませんでした"],
        status: "no_cases",
        processingTimeMs: Date.now() - startTime,
      });

      // 案件がなくても添付ファイルは保存（レジュメの可能性）
      if (noParseLogId && attachments.length > 0) {
        await saveAttachments(supabase, noParseLogId, attachments);
      }

      return NextResponse.json({
        imported: 0,
        message: "No cases found in email",
        errors: result.errors,
      });
    }

    // ── DB登録 ──
    const casesForInsert = result.cases.map((c) => ({
      case_no: c.case_no || null,
      title: c.title,
      category: c.category || null,
      background: c.background || null,
      description: c.description || null,
      industry: c.industry || null,
      start_date: c.start_date || null,
      fee: c.fee || null,
      occupancy: c.occupancy || null,
      location: c.location || null,
      work_style: c.work_style || null,
      office_days: c.office_days || null,
      must_req: c.must_req || null,
      nice_to_have: c.nice_to_have || null,
      flow: c.flow || null,
      client_company: c.client_company || null,
      commercial_flow: c.commercial_flow || null,
      source: "email",
      source_url: c.source_url || null,
      status: "active",
      is_active: true,
    }));

    // 重複チェック
    const titles = casesForInsert.map((c) => c.title.trim());
    const caseNos = casesForInsert
      .map((c) => c.case_no)
      .filter(Boolean) as string[];

    const { data: existingByTitle } = await supabase
      .from("cases")
      .select("title")
      .in("title", titles);

    const { data: existingByCaseNo } =
      caseNos.length > 0
        ? await supabase.from("cases").select("case_no").in("case_no", caseNos)
        : { data: [] };

    const existingTitles = new Set(
      (existingByTitle ?? []).map((c: { title: string }) => c.title.trim())
    );
    const existingCaseNos = new Set(
      (existingByCaseNo ?? []).map((c: { case_no: string }) => c.case_no)
    );

    const newCases = casesForInsert.filter((c) => {
      if (c.case_no && existingCaseNos.has(c.case_no)) return false;
      if (existingTitles.has(c.title.trim())) return false;
      return true;
    });

    const duplicates = casesForInsert.length - newCases.length;

    let imported = 0;
    let insertedCaseIds: string[] = [];
    if (newCases.length > 0) {
      const { data } = await supabase
        .from("cases")
        .insert(newCases)
        .select("*");
      imported = data?.length ?? 0;
      insertedCaseIds = (data as Case[] ?? []).map((c) => c.id);

      // Generate embeddings for newly inserted cases (best effort)
      if (data && data.length > 0) {
        for (const c of data as Case[]) {
          try {
            const text = buildCaseEmbeddingText(c);
            if (!text.trim()) continue;
            const embedding = await generateEmbedding(text);
            if (embedding) {
              await supabase
                .from("cases")
                .update({ embedding: JSON.stringify(embedding) })
                .eq("id", c.id);
            }
          } catch {
            // Best effort — hourly cron will catch any missed cases
          }
        }
      }
    }

    // Queue matching for newly created cases
    if (insertedCaseIds.length > 0) {
      try {
        if (insertedCaseIds.length <= 5) {
          for (const caseId of insertedCaseIds) {
            await queueMatchingRun({
              triggerType: "case_create",
              targetCaseId: caseId,
            });
          }
        } else {
          await queueMatchingRun({ triggerType: "sync" });
        }
      } catch {
        // Best effort — don't fail the intake
      }
    }

    // ── ログ記録 + 案件との紐付け ──
    const logStatus: "success" | "partial" =
      result.errors.length > 0 || duplicates > 0 ? "partial" : "success";

    const logId = await logIntakeEvent(supabase, {
      fromAddress: emailFrom,
      subject: emailSubject,
      bodyPreview: emailText.substring(0, 500),
      casesExtracted: result.cases.length,
      casesImported: imported,
      duplicatesSkipped: duplicates,
      errors: result.errors,
      status: logStatus,
      processingTimeMs: Date.now() - startTime,
    });

    // 取込まれた案件にログIDを紐付け
    if (logId && insertedCaseIds.length > 0) {
      await supabase
        .from("cases")
        .update({ email_intake_id: logId })
        .in("id", insertedCaseIds);
    }

    // ── 添付ファイルを保存 ──
    let attachmentsSaved = 0;
    if (logId && attachments.length > 0) {
      attachmentsSaved = await saveAttachments(supabase, logId, attachments);
    }

    // ── 管理者に結果通知 ──
    const caseList = result.cases
      .map(
        (c, i) =>
          `${i + 1}. ${c.case_no ? `#${c.case_no} ` : ""}${c.title}${
            c.fee ? ` (${c.fee})` : ""
          }`
      )
      .join("\n");

    await notifyAdmin(
      `✅ 案件メール転送: ${imported}件登録${attachmentsSaved > 0 ? ` / 添付${attachmentsSaved}件保存` : ""}`,
      `From: ${emailFrom}\nSubject: ${emailSubject}\n\n登録: ${imported}件 / 重複スキップ: ${duplicates}件${
        attachmentsSaved > 0 ? ` / 添付ファイル: ${attachmentsSaved}件保存` : ""
      }\n\n--- 抽出された案件 ---\n${caseList}${
        result.errors.length > 0
          ? `\n\n--- パースエラー ---\n${result.errors.join("\n")}`
          : ""
      }`
    );

    return NextResponse.json({
      imported,
      duplicates,
      total: result.cases.length,
      attachments_saved: attachmentsSaved,
      errors: result.errors,
    });
  } catch (err) {
    console.error("Email intake error:", err);
    // ログ記録（ベストエフォート）
    await logIntakeEvent(supabase, {
      casesExtracted: 0,
      casesImported: 0,
      duplicatesSkipped: 0,
      errors: [err instanceof Error ? err.message : "Internal server error"],
      status: "failed",
      processingTimeMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 管理者にメール通知
 */
async function notifyAdmin(subject: string, body: string) {
  if (!ADMIN_EMAIL || !process.env.RESEND_API_KEY) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `PERSONA System <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject,
      text: body,
    });
  } catch {
    // Best effort
  }
}
