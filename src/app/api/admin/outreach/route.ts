import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@persona-consultant.com";

/* ── Auth helper: require admin ── */
async function requireAdmin(req: NextRequest) {
  const cookie = req.cookies.get("sb-urikwrakbafnsllimcbl-auth-token");
  const accessToken =
    cookie?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!accessToken) return null;

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(accessToken);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? user : null;
}

/* ── Default HTML template (AI Assessment) ── */
function buildDefaultTemplate(utm: string): string {
  const LP_URL = `https://persona-consultant.com/services/assessment${utm}`;
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
<tr><td style="background:#0f0f0f;padding:28px 40px;text-align:center">
  <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:800;letter-spacing:3px;color:#ffffff">PERSONA</span>
</td></tr>
<tr><td style="padding:48px 40px 32px;text-align:center">
  <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:3px;color:#e8390e;text-transform:uppercase">AI導入効果アセスメント</p>
  <h1 style="margin:0 0 20px;font-size:24px;font-weight:900;color:#0f0f0f;line-height:1.4">AIで、どの業務が、<br>どれだけ削減できるか。</h1>
  <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.8;max-width:440px;display:inline-block;text-align:left">
    <strong style="color:#0f0f0f">業務プロセス分析 × AI × ファーム出身コンサルの伴走</strong>で、<br>導入効果を定量的にアセスメント。
    どの業務にどのAIツールを入れれば、どれだけ工数が減るか——具体的な数値でレポートします。
  </p>
</td></tr>
<tr><td style="padding:0 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border-radius:10px;overflow:hidden">
<tr>
  <td style="width:25%;padding:20px 8px;text-align:center;border-right:1px solid rgba(255,255,255,0.06)">
    <div style="font-size:22px;font-weight:800;color:#ffffff">125<span style="font-size:12px;font-weight:500">万円〜</span></div>
    <div style="font-size:9px;color:rgba(255,255,255,0.35);margin-top:2px">診断費用</div>
  </td>
  <td style="width:25%;padding:20px 8px;text-align:center;border-right:1px solid rgba(255,255,255,0.06)">
    <div style="font-size:22px;font-weight:800;color:#ffffff">2<span style="font-size:12px;font-weight:500">週間〜</span></div>
    <div style="font-size:9px;color:rgba(255,255,255,0.35);margin-top:2px">最短納期</div>
  </td>
  <td style="width:25%;padding:20px 8px;text-align:center;border-right:1px solid rgba(255,255,255,0.06)">
    <div style="font-size:22px;font-weight:800;color:#ffffff">1,200<span style="font-size:12px;font-weight:500">名+</span></div>
    <div style="font-size:9px;color:rgba(255,255,255,0.35);margin-top:2px">登録コンサル</div>
  </td>
  <td style="width:25%;padding:20px 8px;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#e8390e">3.7<span style="font-size:12px;font-weight:500">x</span></div>
    <div style="font-size:9px;color:rgba(255,255,255,0.35);margin-top:2px">初年度ROI</div>
  </td>
</tr>
</table>
</td></tr>
<tr><td style="padding:32px 40px">
  <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:2px;color:#a8a8a8">▼ レポートサンプル（経理部の一例）</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden">
    <tr>
      <td style="width:50%;padding:20px;background:#f3f3f3;vertical-align:top;border-right:1px solid #e8e8e8">
        <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:2px;color:#a8a8a8">BEFORE</p>
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0f0f0f">紙/PDF → 手入力で仕訳</p>
        <p style="margin:0 0 8px;font-size:12px;color:#6b6b6b;line-height:1.6">月200件を目視確認→転記</p>
        <span style="display:inline-block;background:#e8e8e8;color:#6b6b6b;font-size:14px;font-weight:800;padding:4px 12px;border-radius:4px">月50時間</span>
      </td>
      <td style="width:50%;padding:20px;background:#edfcf2;vertical-align:top">
        <p style="margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:2px;color:#0a8754">AFTER</p>
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0f0f0f">AI-OCR → 自動仕訳連携</p>
        <p style="margin:0 0 8px;font-size:12px;color:#6b6b6b;line-height:1.6">確認ボタンを押すだけ</p>
        <span style="display:inline-block;background:#0a8754;color:#ffffff;font-size:14px;font-weight:800;padding:4px 12px;border-radius:4px">月10時間 (−80%)</span>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:0 40px 32px">
  <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:2px;color:#e8390e">DELIVERABLES</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 0;font-size:13px;color:#2d2d2d;line-height:1.6;border-bottom:1px solid #f3f3f3">✓&nbsp; 業務棚卸シート（全部署 × 全業務）</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#2d2d2d;line-height:1.6;border-bottom:1px solid #f3f3f3">✓&nbsp; Before/After業務フロー図</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#2d2d2d;line-height:1.6;border-bottom:1px solid #f3f3f3">✓&nbsp; 施策一覧 + 削減効果 + ROI試算</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#2d2d2d;line-height:1.6;border-bottom:1px solid #f3f3f3">✓&nbsp; 優先順位マトリクス</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#2d2d2d;line-height:1.6">✓&nbsp; 12ヶ月導入ロードマップ</td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 40px 40px;text-align:center">
  <a href="${LP_URL}" style="display:inline-block;background:#e8390e;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;letter-spacing:0.5px">
    詳細を見る →
  </a>
  <p style="margin:16px 0 0;font-size:12px;color:#a8a8a8">まずはお気軽にご相談ください（無料）</p>
</td></tr>
<tr><td style="background:#fafafa;padding:28px 40px;border-top:1px solid #e8e8e8;text-align:center">
  <p style="margin:0 0 4px;font-size:13px;font-weight:800;letter-spacing:2px;color:#0f0f0f">PERSONA</p>
  <p style="margin:0 0 4px;font-size:11px;color:#a8a8a8">Activated Trigger株式会社 | プロフェッショナルクラウド「PERSONA」</p>
  <p style="margin:0;font-size:11px;color:#a8a8a8">&copy; 2026 Activated Trigger Inc.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/* ── GET: list campaigns or get campaign detail ── */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("id");
  const preview = searchParams.get("preview");

  // HTML preview for default template
  if (preview === "default") {
    const html = buildDefaultTemplate("?utm_source=preview&utm_medium=email");
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Campaign detail
  if (campaignId) {
    const { data: campaign, error } = await supabaseAdmin
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get all sends for this campaign with user names
    const { data: sends } = await supabaseAdmin
      .from("email_sends")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    // Get send counts
    const sentCount = (sends || []).filter((s: { status: string }) => s.status === "sent").length;
    const failedCount = (sends || []).filter((s: { status: string }) => s.status === "failed").length;

    return NextResponse.json({
      campaign: {
        ...campaign,
        total_sends: (sends || []).length,
        sent_count: sentCount,
        failed_count: failedCount,
      },
      sends: sends || [],
    });
  }

  // Campaign list with counts
  const { data: campaigns, error } = await supabaseAdmin
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get send counts per campaign
  const campaignsWithCounts = await Promise.all(
    (campaigns || []).map(async (c: { id: string }) => {
      const { data: sends } = await supabaseAdmin
        .from("email_sends")
        .select("status")
        .eq("campaign_id", c.id);

      const total = (sends || []).length;
      const sent = (sends || []).filter((s: { status: string }) => s.status === "sent").length;
      const failed = (sends || []).filter((s: { status: string }) => s.status === "failed").length;

      return { ...c, total_sends: total, sent_count: sent, failed_count: failed };
    }),
  );

  return NextResponse.json({ campaigns: campaignsWithCounts });
}

/* ── POST: campaign CRUD + send emails ── */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  // ── Create campaign ──
  if (action === "create_campaign") {
    const { name, subject, html_body, utm_source, utm_campaign } = body;
    if (!name || !subject || !html_body) {
      return NextResponse.json(
        { error: "name, subject, html_body are required" },
        { status: 400 },
      );
    }

    const { data: campaign, error } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        name,
        subject,
        html_body,
        utm_source: utm_source || "outreach",
        utm_campaign: utm_campaign || "",
        created_by: admin.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, campaign });
  }

  // ── Update campaign ──
  if (action === "update_campaign") {
    const { campaign_id, ...updates } = body;
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { action: _a, ...fieldsToUpdate } = updates;
    const { error } = await supabaseAdmin
      .from("email_campaigns")
      .update({ ...fieldsToUpdate, updated_at: new Date().toISOString() })
      .eq("id", campaign_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Delete campaign ──
  if (action === "delete_campaign") {
    const { campaign_id } = body;
    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("email_campaigns")
      .delete()
      .eq("id", campaign_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Send emails ──
  if (action === "send_emails") {
    const { campaign_id, user_ids } = body;
    if (!campaign_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: "campaign_id and user_ids are required" },
        { status: 400 },
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 500 },
      );
    }

    // Get campaign
    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (cErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get target user emails
    const { data: users, error: uErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", user_ids);

    if (uErr || !users || users.length === 0) {
      return NextResponse.json({ error: "No valid users found" }, { status: 400 });
    }

    // Build UTM
    const utmParts = [];
    if (campaign.utm_source) utmParts.push(`utm_source=${encodeURIComponent(campaign.utm_source)}`);
    if (campaign.utm_campaign) utmParts.push(`utm_campaign=${encodeURIComponent(campaign.utm_campaign)}`);
    utmParts.push("utm_medium=email");
    const utmString = utmParts.length > 0 ? `?${utmParts.join("&")}` : "";

    // Apply UTM to HTML (replace {{UTM}} placeholder if present)
    const html = campaign.html_body.includes("{{UTM}}")
      ? campaign.html_body.replace(/\{\{UTM\}\}/g, utmString)
      : campaign.html_body;

    // Upsert pending records
    const sendRecords = users
      .filter((u: { email: string | null }) => u.email)
      .map((u: { id: string; email: string }) => ({
        campaign_id,
        user_id: u.id,
        email: u.email,
        status: "pending",
      }));

    await supabaseAdmin
      .from("email_sends")
      .upsert(sendRecords, { onConflict: "campaign_id,user_id" });

    // Send in batches
    const BATCH_SIZE = 50;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    const validUsers = users.filter((u: { email: string | null }) => u.email);

    for (let i = 0; i < validUsers.length; i += BATCH_SIZE) {
      const batch = validUsers.slice(i, i + BATCH_SIZE);
      const batchPayload = batch.map((u: { email: string }) => ({
        from: `PERSONA <${FROM_EMAIL}>`,
        to: u.email,
        subject: campaign.subject,
        html,
      }));

      try {
        const result = await resend.batch.send(batchPayload);
        if (result.error) {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.error.message}`);
          // Mark batch as failed
          for (const u of batch) {
            await supabaseAdmin
              .from("email_sends")
              .update({ status: "failed", error: result.error.message })
              .eq("campaign_id", campaign_id)
              .eq("user_id", u.id);
          }
          failed += batch.length;
        } else {
          // Mark batch as sent
          for (const u of batch) {
            await supabaseAdmin
              .from("email_sends")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("campaign_id", campaign_id)
              .eq("user_id", u.id);
          }
          sent += batch.length;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${msg}`);
        for (const u of batch) {
          await supabaseAdmin
            .from("email_sends")
            .update({ status: "failed", error: msg })
            .eq("campaign_id", campaign_id)
            .eq("user_id", u.id);
        }
        failed += batch.length;
      }

      // Rate limit delay
      if (i + BATCH_SIZE < validUsers.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total: validUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
