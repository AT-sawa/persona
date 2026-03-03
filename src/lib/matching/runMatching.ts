/**
 * Shared matching execution service.
 *
 * Extracted from cron/matching and matching/run routes to provide
 * a single reusable matching engine for:
 *   - Daily batch cron
 *   - Debounced post-sync trigger
 *   - Admin manual trigger
 *   - User registration / preference update trigger
 */

import { createServiceClient } from "@/lib/supabase/service";
import { calculateScore } from "@/lib/matching/calculateScore";
import { Resend } from "resend";
import type { Case, Profile, UserPreferences, UserExperience } from "@/lib/types";
import { BASE_URL } from "@/lib/constants";

export interface MatchingRunResult {
  processed: number;
  totalMatches: number;
  emailsSent: number;
  errors: string[];
}

interface MatchingOptions {
  /** Run for a specific user only (null = all active users) */
  targetUserId?: string | null;
  /** Send email notifications for high-score matches */
  sendEmails?: boolean;
  /** Source label for logging */
  triggerType?: string;
}

/**
 * Run matching for one or all users against all active cases.
 *
 * - Single user: calculates scores, upserts results, removes stale matches
 * - All users: iterates over all is_looking=true profiles
 */
export async function runMatching(
  options: MatchingOptions = {}
): Promise<MatchingRunResult> {
  const {
    targetUserId = null,
    sendEmails = true,
    triggerType = "unknown",
  } = options;

  const supabase = createServiceClient();
  const result: MatchingRunResult = {
    processed: 0,
    totalMatches: 0,
    emailsSent: 0,
    errors: [],
  };

  try {
    // 1. Fetch target profiles
    let profilesQuery = supabase.from("profiles").select("*");

    if (targetUserId) {
      profilesQuery = profilesQuery.eq("id", targetUserId);
    } else {
      profilesQuery = profilesQuery.eq("is_looking", true);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      result.errors.push(`プロフィール取得エラー: ${profilesError.message}`);
      return result;
    }

    if (!profiles?.length) {
      return result;
    }

    // 2. Fetch all active cases (once)
    const { data: cases, error: casesError } = await supabase
      .from("cases")
      .select("*")
      .eq("is_active", true);

    if (casesError) {
      result.errors.push(`案件取得エラー: ${casesError.message}`);
      return result;
    }

    if (!cases?.length) {
      return result;
    }

    const caseMap = new Map((cases as Case[]).map((c) => [c.id, c]));

    // 3. Process each profile
    for (const profile of profiles as Profile[]) {
      try {
        // Fetch preferences & experiences concurrently
        const [prefsRes, expsRes] = await Promise.all([
          supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", profile.id)
            .single(),
          supabase
            .from("user_experiences")
            .select("*")
            .eq("user_id", profile.id),
        ]);

        const preferences = prefsRes.data as UserPreferences | null;
        const experiences = (expsRes.data as UserExperience[]) ?? [];

        // Calculate scores for all active cases
        const scored = (cases as Case[]).map((c) => {
          const { score, factors } = calculateScore(
            c,
            profile,
            preferences,
            experiences
          );
          return { case_id: c.id, user_id: profile.id, score, factors };
        });

        const filtered = scored.filter((r) => r.score > 20);
        filtered.sort((a, b) => b.score - a.score);

        if (filtered.length > 0) {
          const { error: upsertError } = await supabase
            .from("matching_results")
            .upsert(
              filtered.map((r) => ({
                case_id: r.case_id,
                user_id: r.user_id,
                score: r.score,
                factors: r.factors,
                matched_at: new Date().toISOString(),
              })),
              { onConflict: "case_id,user_id" }
            );

          if (upsertError) {
            result.errors.push(
              `${profile.full_name}: upsertエラー - ${upsertError.message}`
            );
          } else {
            result.totalMatches += filtered.length;
          }
        }

        // Remove stale results for single-user runs
        if (targetUserId) {
          const matchedCaseIds = filtered.map((r) => r.case_id);
          if (matchedCaseIds.length > 0) {
            await supabase
              .from("matching_results")
              .delete()
              .eq("user_id", profile.id)
              .not("case_id", "in", `(${matchedCaseIds.join(",")})`);
          } else {
            // No matches at all — remove all old results
            await supabase
              .from("matching_results")
              .delete()
              .eq("user_id", profile.id);
          }
        }

        result.processed++;

        // 4. Email notification for high-score matches
        if (sendEmails && process.env.RESEND_API_KEY) {
          const topNew = filtered.filter((r) => r.score >= 60).slice(0, 5);
          if (topNew.length > 0 && profile.email) {
            try {
              const resend = new Resend(process.env.RESEND_API_KEY);
              const fromEmail =
                process.env.FROM_EMAIL || "noreply@persona-consultant.com";

              const caseLines = topNew
                .map((m) => {
                  const c = caseMap.get(m.case_id);
                  return c
                    ? `- ${c.title}（マッチ度 ${m.score}%）${c.fee ? ` / ${c.fee}` : ""}`
                    : null;
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
                  `${BASE_URL}/dashboard/matching`,
                  "",
                  "---",
                  "PERSONA - フリーコンサル案件紹介サービス",
                  "",
                  "このメールの配信を停止するには、ダッシュボードの",
                  "「設定」から通知設定を変更してください。",
                  `${BASE_URL}/dashboard/preferences`,
                ].join("\n"),
              });
              result.emailsSent++;
            } catch {
              // Email error — don't fail the whole run
            }
          }
        }
      } catch (profileErr) {
        const msg =
          profileErr instanceof Error ? profileErr.message : "unknown error";
        result.errors.push(`${profile.full_name}: ${msg}`);
      }
    }

    // 5. Log the run
    console.log(
      `[Matching] ${triggerType}: processed=${result.processed}, matches=${result.totalMatches}, emails=${result.emailsSent}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    result.errors.push(`Fatal: ${msg}`);
  }

  return result;
}

/**
 * Queue a matching run (debounced for bulk operations).
 * Inserts a pending record into matching_queue.
 * The cron processor will pick it up after the cooldown period.
 */
export async function queueMatchingRun(options: {
  triggerType: "sync" | "manual" | "user_register" | "user_update";
  targetUserId?: string | null;
  createdBy?: string | null;
}): Promise<void> {
  const supabase = createServiceClient();

  // For sync triggers, check if there's already a recent pending request
  // If so, update its timestamp (reset debounce timer)
  if (options.triggerType === "sync") {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("matching_queue")
      .select("id")
      .eq("status", "pending")
      .eq("trigger_type", "sync")
      .is("target_user_id", null)
      .gte("requested_at", fiveMinAgo)
      .order("requested_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      // Reset the debounce timer — update the existing pending request
      await supabase
        .from("matching_queue")
        .update({ requested_at: new Date().toISOString() })
        .eq("id", existing[0].id);
      return;
    }
  }

  await supabase.from("matching_queue").insert({
    trigger_type: options.triggerType,
    target_user_id: options.targetUserId || null,
    created_by: options.createdBy || null,
  });
}
