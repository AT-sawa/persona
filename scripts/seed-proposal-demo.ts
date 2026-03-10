/**
 * Seed demo data for proposal management.
 * Run: npx tsx scripts/seed-proposal-demo.ts
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("=== Creating Proposal Demo Data ===\n");

  // 1. Create a demo client account
  const clientEmail = "demo-client@example.com";
  const clientPassword = "DemoClient2026!";

  // Check if client already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", clientEmail)
    .single();

  let clientId: string;

  if (existingProfile) {
    clientId = existingProfile.id;
    console.log(`Client already exists: ${clientId}`);
  } else {
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: clientEmail,
        password: clientPassword,
        email_confirm: true,
        user_metadata: { full_name: "デモクライアント担当者" },
      });

    if (authError) {
      console.error("Auth error:", authError.message);
      return;
    }
    clientId = authUser.user!.id;

    // Create profile with is_client = true
    await supabase.from("profiles").upsert({
      id: clientId,
      full_name: "佐藤 太郎",
      email: clientEmail,
      is_client: true,
      company_name: "株式会社サンプルコーポレーション",
    });
    console.log(`Created client: ${clientEmail} / ${clientPassword}`);
  }

  // Ensure is_client is set
  await supabase
    .from("profiles")
    .update({ is_client: true, company_name: "株式会社サンプルコーポレーション" })
    .eq("id", clientId);

  // 2. Pick 2 active cases for proposals
  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, category, fee")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(2);

  if (!cases || cases.length === 0) {
    console.error("No active cases found");
    return;
  }

  console.log(`\nUsing cases:`);
  cases.forEach((c) => console.log(`  - ${c.title} (${c.fee})`));

  // 3. Pick some registered users to add as talent
  const { data: talents } = await supabase
    .from("profiles")
    .select("id, full_name, skills, bio, years_experience, background")
    .eq("is_looking", true)
    .not("skills", "is", null)
    .limit(6);

  if (!talents || talents.length < 2) {
    console.error("Not enough talent profiles found");
    return;
  }

  console.log(`\nUsing talents (${talents.length}):`);
  talents.forEach((t) =>
    console.log(`  - ${t.full_name} (${(t.skills || []).slice(0, 3).join(", ")})`)
  );

  // 4. Create proposals
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const proposalTitle = `${c.title} - 人材ご提案`;

    // Check if proposal already exists
    const { data: existingProposal } = await supabase
      .from("proposals")
      .select("id")
      .eq("case_id", c.id)
      .eq("client_id", clientId)
      .single();

    if (existingProposal) {
      console.log(`\nProposal already exists for case: ${c.title}`);
      continue;
    }

    const status = i === 0 ? "sent" : "draft";

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .insert({
        case_id: c.id,
        client_id: clientId,
        title: proposalTitle,
        message:
          i === 0
            ? "ご依頼の案件につき、弊社登録コンサルタントの中から厳選した候補者をご提案いたします。ご検討のほどよろしくお願いいたします。"
            : "下書き提案です。人材を追加して送信してください。",
        status,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (proposalError) {
      console.error(`Proposal error:`, proposalError.message);
      continue;
    }

    console.log(`\nCreated proposal: "${proposalTitle}" (${status})`);

    // 5. Add talents to proposal
    const talentsForProposal = talents.slice(
      i * 3,
      Math.min((i + 1) * 3, talents.length)
    );

    for (let j = 0; j < talentsForProposal.length; j++) {
      const t = talentsForProposal[j];
      const nameParts = (t.full_name || "候補者").split(/\s+/);
      const initial =
        nameParts.length >= 2
          ? `${nameParts[0].charAt(0)}.${nameParts[1].charAt(0)}.`
          : `候補者${String.fromCharCode(65 + j)}`;

      const baseFee = 120 + j * 20; // 120, 140, 160

      const { error: talentError } = await supabase
        .from("proposal_talents")
        .insert({
          proposal_id: proposal!.id,
          profile_id: t.id,
          display_label: initial,
          sort_order: j + 1,
          client_fee: baseFee,
          internal_cost: baseFee - 30,
          internal_note: `${t.full_name} - 即戦力`,
          summary_position: t.background || "コンサルタント",
          summary_experience: t.years_experience
            ? `${t.years_experience}年の実務経験`
            : "豊富な実務経験",
          summary_skills: (t.skills || []).slice(0, 5),
          summary_background:
            t.bio || "大手コンサルティングファーム出身。複数のプロジェクトで成果を上げてきた実績があります。",
          summary_work_style: "フルリモート可",
        });

      if (talentError) {
        console.error(`  Talent error:`, talentError.message);
      } else {
        console.log(`  Added talent: ${initial} (${baseFee}万円/月)`);
      }
    }
  }

  // 6. Add a demo message to the sent proposal
  const { data: sentProposal } = await supabase
    .from("proposals")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "sent")
    .single();

  if (sentProposal) {
    const { data: existingMsgs } = await supabase
      .from("proposal_messages")
      .select("id")
      .eq("proposal_id", sentProposal.id)
      .limit(1);

    if (!existingMsgs?.length) {
      await supabase.from("proposal_messages").insert({
        proposal_id: sentProposal.id,
        sender_id: clientId,
        body: "ご提案ありがとうございます。候補者Aの方に特に興味があります。面談の調整をお願いできますか？",
        is_admin: false,
      });
      console.log("\nAdded demo message from client");
    }
  }

  console.log("\n=== Demo data created successfully ===");
  console.log(`\nClient login: ${clientEmail} / ${clientPassword}`);
  console.log("Client portal: /dashboard/portal");
  console.log("Admin proposals: /dashboard/admin/proposals");
}

main().catch(console.error);
