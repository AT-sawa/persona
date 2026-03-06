import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseEmailCases } from "@/lib/parse-email-cases";
import { Resend } from "resend";
import { generateEmbedding, buildCaseEmbeddingText } from "@/lib/embedding";
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
 * Resend API でメール本文を取得
 */
async function fetchResendEmailBody(
  emailId: string
): Promise<{ text: string; from: string; subject: string } | null> {
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

    return {
      text,
      from: data.from || "",
      subject: data.subject || "",
    };
  } catch (err) {
    console.error("Error fetching Resend email:", err);
    return null;
  }
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

  try {
    // ── メール本文を取得 ──
    let emailText = "";
    let emailFrom = "";
    let emailSubject = "";

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
          return NextResponse.json({
            imported: 0,
            message: "Could not fetch email body from Resend",
          });
        }
        emailText = emailData.text;
        emailFrom = emailData.from;
        emailSubject = emailData.subject;
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
      return NextResponse.json({
        imported: 0,
        message: "No cases found in email",
        errors: result.errors,
      });
    }

    // ── DB登録 ──
    const supabase = createServiceClient();

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
      office_days: c.office_days || null,
      must_req: c.must_req || null,
      nice_to_have: c.nice_to_have || null,
      flow: c.flow || null,
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
    if (newCases.length > 0) {
      const { data } = await supabase
        .from("cases")
        .insert(newCases)
        .select("*");
      imported = data?.length ?? 0;

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
      `✅ 案件メール転送: ${imported}件登録`,
      `From: ${emailFrom}\nSubject: ${emailSubject}\n\n登録: ${imported}件 / 重複スキップ: ${duplicates}件\n\n--- 抽出された案件 ---\n${caseList}${
        result.errors.length > 0
          ? `\n\n--- パースエラー ---\n${result.errors.join("\n")}`
          : ""
      }`
    );

    return NextResponse.json({
      imported,
      duplicates,
      total: result.cases.length,
      errors: result.errors,
    });
  } catch (err) {
    console.error("Email intake error:", err);
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
