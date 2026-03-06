/**
 * Shared matching execution service.
 *
 * Extracted from cron/matching and matching/run routes to provide
 * a single reusable matching engine for:
 *   - Daily batch cron
 *   - Debounced post-sync trigger
 *   - Admin manual trigger
 *   - User registration / preference update trigger
 *
 * Supports two pipelines:
 *   - Rule-based (default): keyword/criteria matching via calculateScore
 *   - Semantic (when OPENAI_API_KEY is set): vector similarity + rules + LLM analysis
 */

import { createServiceClient } from "@/lib/supabase/service";
import { calculateScore } from "@/lib/matching/calculateScore";
import { Resend } from "resend";
import type { Case, Profile, UserPreferences, UserExperience } from "@/lib/types";
import { BASE_URL } from "@/lib/constants";
import {
  generateEmbedding,
  buildProfileEmbeddingText,
} from "@/lib/embedding";
import { batchAnalyzeMatches } from "@/lib/matching/llmAnalysis";

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
 * Delegates to semantic pipeline when OPENAI_API_KEY is available,
 * otherwise falls back to rule-based pipeline.
 */
export async function runMatching(
  options: MatchingOptions = {}
): Promise<MatchingRunResult> {
  // If OpenAI key is available, use semantic pipeline
  if (process.env.OPENAI_API_KEY) {
    return runSemanticMatching(options);
  }
  // Otherwise, use the existing rule-based pipeline
  return runRuleBasedMatching(options);
}

/**
 * Original rule-based matching pipeline.
 * Scores every active case against each profile using calculateScore().
 */
async function runRuleBasedMatching(
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
          const { score, factors, profileCompleteness } = calculateScore(
            c,
            profile,
            preferences,
            experiences
          );
          return { case_id: c.id, user_id: profile.id, score, factors, profileCompleteness };
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
        await sendMatchEmails(
          sendEmails,
          filtered,
          profile,
          caseMap,
          result
        );
      } catch (profileErr) {
        const msg =
          profileErr instanceof Error ? profileErr.message : "unknown error";
        result.errors.push(`${profile.full_name}: ${msg}`);
      }
    }

    // 5. Log the run
    console.log(
      `[Matching] ${triggerType} (rule-based): processed=${result.processed}, matches=${result.totalMatches}, emails=${result.emailsSent}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    result.errors.push(`Fatal: ${msg}`);
  }

  return result;
}

/**
 * Semantic matching pipeline (3 stages):
 *
 * Stage 1: Vector similarity search (pgvector RPC) → top 30 candidates
 * Stage 2: Rule-based scoring (calculateScore) on those candidates
 * Stage 3: LLM analysis (Claude) on top 10 → final combined score
 *
 * Final score = rule_score * 0.4 + (vector_similarity * 100) * 0.3 + llm_relevance * 0.3
 */
async function runSemanticMatching(
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

    // 2. Process each profile through the 3-stage pipeline
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

        // --- Stage 1: Vector similarity search ---
        // Generate profile embedding if missing
        let profileEmbedding: number[] | null = null;

        // Check if the profile already has an embedding
        const { data: profileWithEmb } = await supabase
          .from("profiles")
          .select("embedding")
          .eq("id", profile.id)
          .single();

        if (profileWithEmb?.embedding) {
          profileEmbedding = profileWithEmb.embedding as unknown as number[];
        } else {
          // Generate and save embedding
          const embeddingText = buildProfileEmbeddingText(
            profile,
            experiences,
            preferences
          );
          profileEmbedding = await generateEmbedding(embeddingText);

          if (profileEmbedding) {
            await supabase
              .from("profiles")
              .update({
                embedding: JSON.stringify(profileEmbedding),
              })
              .eq("id", profile.id);
          }
        }

        // If we have an embedding, use vector search; otherwise fall back to all cases
        let candidateCases: Case[] = [];
        const similarityMap = new Map<string, number>();

        if (profileEmbedding) {
          // Call the pgvector RPC function
          const { data: vectorResults, error: vectorError } = await supabase
            .rpc("match_cases_by_embedding", {
              query_embedding: JSON.stringify(profileEmbedding),
              match_count: 30,
              match_threshold: 0.3,
            });

          if (vectorError) {
            console.error("Vector search error:", vectorError.message);
            // Fall back to fetching all active cases
            const { data: allCases } = await supabase
              .from("cases")
              .select("*")
              .eq("is_active", true);
            candidateCases = (allCases as Case[]) ?? [];
          } else if (vectorResults && vectorResults.length > 0) {
            // Store similarity scores
            for (const vr of vectorResults) {
              similarityMap.set(vr.id, vr.similarity);
            }

            // Fetch full case data for the matched IDs
            const caseIds = vectorResults.map(
              (vr: { id: string }) => vr.id
            );
            const { data: fullCases } = await supabase
              .from("cases")
              .select("*")
              .in("id", caseIds);
            candidateCases = (fullCases as Case[]) ?? [];
          } else {
            // No vector results — fetch all active cases as fallback
            const { data: allCases } = await supabase
              .from("cases")
              .select("*")
              .eq("is_active", true);
            candidateCases = (allCases as Case[]) ?? [];
          }
        } else {
          // No embedding available — fetch all active cases
          const { data: allCases } = await supabase
            .from("cases")
            .select("*")
            .eq("is_active", true);
          candidateCases = (allCases as Case[]) ?? [];
        }

        if (!candidateCases.length) {
          result.processed++;
          continue;
        }

        const caseMap = new Map(candidateCases.map((c) => [c.id, c]));

        // --- Stage 2: Rule-based scoring on candidates ---
        const scored = candidateCases.map((c) => {
          const { score, factors, profileCompleteness } = calculateScore(
            c,
            profile,
            preferences,
            experiences
          );
          const vectorSimilarity = similarityMap.get(c.id) ?? 0;
          return {
            case_id: c.id,
            user_id: profile.id,
            rule_score: score,
            vector_similarity: vectorSimilarity,
            factors,
            profileCompleteness,
          };
        });

        // Sort by combined preliminary score (rule + vector) to pick top 10 for LLM
        scored.sort((a, b) => {
          const aCombo =
            a.rule_score * 0.6 + a.vector_similarity * 100 * 0.4;
          const bCombo =
            b.rule_score * 0.6 + b.vector_similarity * 100 * 0.4;
          return bCombo - aCombo;
        });

        // --- Stage 3: LLM analysis on top 10 ---
        const top10 = scored.slice(0, 10);
        let llmResults: Array<{ relevance: number; reasoning: string }> = [];

        if (process.env.ANTHROPIC_API_KEY) {
          const matchInputs = top10.map((s) => ({
            caseData: caseMap.get(s.case_id)!,
            profile,
            experiences,
          }));
          llmResults = await batchAnalyzeMatches(matchInputs, 5);
        }

        // Compute final scores
        const finalResults: Array<{
          case_id: string;
          user_id: string;
          score: number;
          factors: Record<string, unknown>;
          semantic_score: number | null;
          llm_reasoning: string | null;
        }> = [];

        for (let i = 0; i < scored.length; i++) {
          const s = scored[i];
          let finalScore: number;
          let semanticScore: number | null = null;
          let llmReasoning: string | null = null;

          if (i < top10.length && llmResults.length > 0) {
            // This candidate went through LLM analysis
            const llm = llmResults[i];
            semanticScore = s.vector_similarity * 100;
            llmReasoning = llm.reasoning || null;

            // Final score = rule_score * 0.4 + (vector_similarity * 100) * 0.3 + llm_relevance * 0.3
            finalScore = Math.round(
              s.rule_score * 0.4 +
                s.vector_similarity * 100 * 0.3 +
                llm.relevance * 0.3
            );
          } else if (similarityMap.size > 0) {
            // Has vector similarity but no LLM — use rule + vector
            semanticScore = s.vector_similarity * 100;
            finalScore = Math.round(
              s.rule_score * 0.6 + s.vector_similarity * 100 * 0.4
            );
          } else {
            // Pure rule-based fallback
            finalScore = s.rule_score;
          }

          if (finalScore > 20) {
            finalResults.push({
              case_id: s.case_id,
              user_id: s.user_id,
              score: finalScore,
              factors: s.factors as unknown as Record<string, unknown>,
              semantic_score: semanticScore,
              llm_reasoning: llmReasoning,
            });
          }
        }

        finalResults.sort((a, b) => b.score - a.score);

        if (finalResults.length > 0) {
          const { error: upsertError } = await supabase
            .from("matching_results")
            .upsert(
              finalResults.map((r) => ({
                case_id: r.case_id,
                user_id: r.user_id,
                score: r.score,
                factors: r.factors,
                semantic_score: r.semantic_score,
                llm_reasoning: r.llm_reasoning,
                matched_at: new Date().toISOString(),
              })),
              { onConflict: "case_id,user_id" }
            );

          if (upsertError) {
            result.errors.push(
              `${profile.full_name}: upsertエラー - ${upsertError.message}`
            );
          } else {
            result.totalMatches += finalResults.length;
          }
        }

        // Remove stale results for single-user runs
        if (targetUserId) {
          const matchedCaseIds = finalResults.map((r) => r.case_id);
          if (matchedCaseIds.length > 0) {
            await supabase
              .from("matching_results")
              .delete()
              .eq("user_id", profile.id)
              .not("case_id", "in", `(${matchedCaseIds.join(",")})`);
          } else {
            await supabase
              .from("matching_results")
              .delete()
              .eq("user_id", profile.id);
          }
        }

        result.processed++;

        // Email notification for high-score matches
        await sendMatchEmails(
          sendEmails,
          finalResults,
          profile,
          caseMap,
          result
        );
      } catch (profileErr) {
        const msg =
          profileErr instanceof Error ? profileErr.message : "unknown error";
        result.errors.push(`${profile.full_name}: ${msg}`);
      }
    }

    // Log the run
    console.log(
      `[Matching] ${triggerType} (semantic): processed=${result.processed}, matches=${result.totalMatches}, emails=${result.emailsSent}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    result.errors.push(`Fatal: ${msg}`);
  }

  return result;
}

/**
 * Shared email notification logic for both pipelines.
 */
async function sendMatchEmails(
  sendEmails: boolean,
  filtered: Array<{ case_id: string; score: number }>,
  profile: Profile,
  caseMap: Map<string, Case>,
  result: MatchingRunResult
): Promise<void> {
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
