import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding, buildCaseEmbeddingText } from "@/lib/embedding";
import type { Case } from "@/lib/types";

/**
 * GET /api/cron/embed-cases
 * Hourly cron to backfill embeddings for cases that don't have one.
 * Safety net for cases that missed inline embedding generation.
 *
 * Schedule: 0 * * * * (every hour, via Vercel Cron)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error("CRON_SECRET is not configured or too short");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      skipped: true,
      reason: "OPENAI_API_KEY not configured",
    });
  }

  const supabase = createServiceClient();
  let embedded = 0;
  const errors: string[] = [];

  try {
    // Fetch active cases without embeddings (limit 100 per run)
    const { data: unembeddedCases, error: fetchError } = await supabase
      .from("cases")
      .select("*")
      .eq("is_active", true)
      .is("embedding", null)
      .limit(100);

    if (fetchError) {
      return NextResponse.json(
        { error: `Fetch error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!unembeddedCases || unembeddedCases.length === 0) {
      return NextResponse.json({ embedded: 0, pending: 0 });
    }

    for (const c of unembeddedCases as Case[]) {
      try {
        const text = buildCaseEmbeddingText(c);
        if (!text.trim()) continue;

        const embedding = await generateEmbedding(text);
        if (embedding) {
          const { error: updateError } = await supabase
            .from("cases")
            .update({ embedding: JSON.stringify(embedding) })
            .eq("id", c.id);

          if (updateError) {
            errors.push(`${c.id}: ${updateError.message}`);
          } else {
            embedded++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        errors.push(`${c.id}: ${msg}`);
      }
    }

    console.log(
      `[Cron] embed-cases: embedded=${embedded}/${unembeddedCases.length}, errors=${errors.length}`
    );

    return NextResponse.json({
      embedded,
      pending: unembeddedCases.length - embedded,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("embed-cases cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
