import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateScore } from "@/lib/matching/calculateScore";
import { Resend } from "resend";
import type { Case, Profile, UserPreferences, UserExperience } from "@/lib/types";

export async function GET(request: NextRequest) {
  // Verify cron secret (fail-closed: reject if not configured or too short)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error("CRON_SECRET is not configured or too short");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all active users with is_looking = true
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_looking", true);

  if (!profiles?.length) {
    return NextResponse.json({ message: "No active users", processed: 0 });
  }

  // Fetch active cases
  const { data: cases } = await supabase
    .from("cases")
    .select("*")
    .eq("is_active", true);

  if (!cases?.length) {
    return NextResponse.json({ message: "No active cases", processed: 0 });
  }

  let totalMatches = 0;
  let emailsSent = 0;

  for (const profile of profiles as Profile[]) {
    // Fetch preferences and experiences
    const [prefsRes, expsRes] = await Promise.all([
      supabase.from("user_preferences").select("*").eq("user_id", profile.id).single(),
      supabase.from("user_experiences").select("*").eq("user_id", profile.id),
    ]);

    const preferences = prefsRes.data as UserPreferences | null;
    const experiences = (expsRes.data as UserExperience[]) ?? [];

    // Calculate scores
    const results = (cases as Case[]).map((c) => {
      const { score, factors } = calculateScore(c, profile, preferences, experiences);
      return { case_id: c.id, user_id: profile.id, score, factors };
    });

    const filtered = results.filter((r) => r.score > 20);
    filtered.sort((a, b) => b.score - a.score);

    if (filtered.length > 0) {
      await supabase.from("matching_results").upsert(
        filtered.map((r) => ({
          case_id: r.case_id,
          user_id: r.user_id,
          score: r.score,
          factors: r.factors,
          matched_at: new Date().toISOString(),
        })),
        { onConflict: "case_id,user_id" }
      );
      totalMatches += filtered.length;
    }

    // Send email for new high-score matches (not yet notified)
    const topNew = filtered.filter((r) => r.score >= 60).slice(0, 5);
    if (topNew.length > 0 && profile.email && process.env.RESEND_API_KEY) {
      try {
        const caseMap = new Map((cases as Case[]).map((c) => [c.id, c]));
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmail = process.env.FROM_EMAIL || "noreply@persona-consultant.com";

        const caseLines = topNew
          .map((m) => {
            const c = caseMap.get(m.case_id);
            return c ? `- ${c.title}（マッチ度 ${m.score}%）${c.fee ? ` / ${c.fee}` : ""}` : null;
          })
          .filter(Boolean)
          .join("\n");

        await resend.emails.send({
          from: `PERSONA <${fromEmail}>`,
          to: profile.email,
          subject: `【PERSONA】あなたにマッチする案件が${topNew.length}件見つかりました`,
          text: [
            `${profile.full_name || ""}さん`,
            "",
            `AIマッチングの結果、マッチ度60%以上の案件が${topNew.length}件見つかりました。`,
            "",
            caseLines,
            "",
            "詳細はダッシュボードからご確認ください。",
            "https://persona-consultant.com/dashboard/matching",
            "",
            "---",
            "PERSONA - フリーコンサル案件紹介サービス",
            "",
            "このメールの配信を停止するには、ダッシュボードの",
            "「設定」から通知設定を変更してください。",
            "https://persona-consultant.com/dashboard/preferences",
          ].join("\n"),
        });
        emailsSent++;
      } catch {
        // Email error - continue processing
      }
    }
  }

  return NextResponse.json({
    processed: profiles.length,
    totalMatches,
    emailsSent,
  });
}
