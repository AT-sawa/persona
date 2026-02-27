import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { skills, experiences } = await request.json();

    // Update profile skills (merge with existing)
    if (skills && skills.length > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("skills")
        .eq("id", user.id)
        .single();

      const existingSkills = profile?.skills ?? [];
      const merged = Array.from(
        new Set([...existingSkills, ...skills])
      );

      await supabase
        .from("profiles")
        .update({ skills: merged, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    // Insert experiences (if not duplicates)
    if (experiences && experiences.length > 0) {
      // Get existing experiences to avoid duplicates
      const { data: existing } = await supabase
        .from("user_experiences")
        .select("company_name, role")
        .eq("user_id", user.id);

      const existingSet = new Set(
        (existing ?? []).map(
          (e: { company_name: string; role: string }) =>
            `${e.company_name}::${e.role}`
        )
      );

      const newExperiences = experiences
        .filter(
          (exp: { company_name: string; role: string }) =>
            !existingSet.has(`${exp.company_name}::${exp.role}`)
        )
        .map(
          (
            exp: {
              company_name: string;
              role: string;
              industry: string;
              start_date: string;
              end_date: string | null;
              is_current: boolean;
              description: string;
              skills_used: string[];
            },
            idx: number
          ) => ({
            user_id: user.id,
            company_name: exp.company_name,
            role: exp.role,
            industry: exp.industry || null,
            start_date: exp.start_date,
            end_date: exp.end_date,
            is_current: exp.is_current,
            description: exp.description || null,
            skills_used: exp.skills_used || [],
            sort_order: idx,
          })
        );

      if (newExperiences.length > 0) {
        await supabase.from("user_experiences").insert(newExperiences);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply resume data error:", err);
    return NextResponse.json(
      { error: "データの反映に失敗しました" },
      { status: 500 }
    );
  }
}
