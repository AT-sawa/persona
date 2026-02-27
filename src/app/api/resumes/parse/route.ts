import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Skill keywords to detect in resume text
const SKILL_KEYWORDS = [
  // Strategy
  "戦略策定", "戦略立案", "経営戦略", "事業戦略", "新規事業", "M&A", "PMI", "DD",
  "デューデリジェンス", "ビジネスプラン", "市場調査", "競合分析",
  // BPR
  "BPR", "業務改革", "業務改善", "組織改革", "SCM", "サプライチェーン",
  "人事制度", "経営管理", "管理会計", "原価管理", "KPI",
  // IT
  "PMO", "プロジェクト管理", "PM", "SAP", "Salesforce", "DX", "DX推進",
  "システム導入", "ERP", "クラウド", "AWS", "Azure", "GCP",
  "データ分析", "AI", "機械学習", "RPA", "セキュリティ", "ISMS",
  "要件定義", "基本設計", "詳細設計", "テスト", "移行",
  // Tech
  "Python", "Java", "JavaScript", "TypeScript", "React", "Next.js",
  "SQL", "Oracle", "PostgreSQL", "MySQL", "Tableau", "Power BI",
  "Agile", "Scrum", "DevOps", "CI/CD", "Docker", "Kubernetes",
  // Consulting firms (useful as background markers)
  "コンサルティング", "コンサルタント", "マネージャー", "シニアマネージャー",
  "ディレクター", "パートナー", "アソシエイト", "アナリスト",
  // Industries
  "金融", "銀行", "保険", "証券", "製造", "自動車", "医薬", "ヘルスケア",
  "通信", "メディア", "小売", "流通", "エネルギー", "不動産", "公共",
];

function extractSkills(text: string): string[] {
  const found = new Set<string>();
  const normalized = text.toLowerCase();

  for (const skill of SKILL_KEYWORDS) {
    if (normalized.includes(skill.toLowerCase())) {
      found.add(skill);
    }
  }

  return Array.from(found);
}

interface ExperienceEntry {
  company_name: string;
  role: string;
  industry: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string;
  skills_used: string[];
}

function extractExperiences(text: string): ExperienceEntry[] {
  const experiences: ExperienceEntry[] = [];

  // Pattern: company name followed by dates and roles
  // Try to detect blocks with date patterns like 2020年4月 〜 2023年3月
  const datePattern =
    /(\d{4})[年/.-](\d{1,2})?[月]?\s*[〜~\-–—]\s*(\d{4})?[年/.-]?(\d{1,2})?[月]?\s*(現在|至今|present)?/gi;

  const lines = text.split(/\n/);
  let currentExp: Partial<ExperienceEntry> | null = null;
  let descLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      // Save previous experience
      if (currentExp?.company_name) {
        currentExp.description = descLines.join("\n").trim();
        currentExp.skills_used = extractSkills(currentExp.description);
        experiences.push(currentExp as ExperienceEntry);
      }

      // Parse date range
      const fullMatch = datePattern.exec(line) ?? dateMatch;
      const startYear = dateMatch[0]?.match(/(\d{4})/)?.[1] ?? "";
      const isCurrent = /現在|至今|present/i.test(line);

      // Try to find company name from current or adjacent lines
      const companyLine = line.replace(datePattern, "").trim() || lines[i - 1]?.trim() || "";
      const roleLine = lines[i + 1]?.trim() || "";

      currentExp = {
        company_name: companyLine.replace(/[【】\[\]]/g, "").trim().slice(0, 100) || "不明",
        role: roleLine.slice(0, 100) || "コンサルタント",
        industry: "",
        start_date: `${startYear}-01-01`,
        end_date: isCurrent ? null : null,
        is_current: isCurrent,
        skills_used: [],
      };
      descLines = [];
    } else if (currentExp) {
      descLines.push(line);
    }
  }

  // Save last experience
  if (currentExp?.company_name) {
    currentExp.description = descLines.join("\n").trim();
    currentExp.skills_used = extractSkills(currentExp.description || "");
    experiences.push(currentExp as ExperienceEntry);
  }

  return experiences.slice(0, 10); // Cap at 10 entries
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { resumeId } = await request.json();

    if (!resumeId) {
      return NextResponse.json(
        { error: "レジュメIDが必要です" },
        { status: 400 }
      );
    }

    // Get resume metadata
    const { data: resume } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .single();

    if (!resume) {
      return NextResponse.json(
        { error: "レジュメが見つかりません" },
        { status: 404 }
      );
    }

    // Download file from storage
    const serviceClient = createServiceClient();
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from("resumes")
      .download(resume.file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return NextResponse.json(
        { error: "ファイルのダウンロードに失敗しました" },
        { status: 500 }
      );
    }

    let extractedText = "";

    if (resume.mime_type === "application/pdf") {
      // Parse PDF using pdf-parse v2 API
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      extractedText = textResult.text;
      await parser.destroy();
    } else if (
      resume.mime_type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      resume.filename.endsWith(".docx")
    ) {
      // Parse DOCX
      const mammoth = await import("mammoth");
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return NextResponse.json(
        { error: "PDF または DOCX ファイルのみ対応しています" },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "ファイルからテキストを抽出できませんでした" },
        { status: 400 }
      );
    }

    // Extract skills
    const skills = extractSkills(extractedText);

    // Extract experiences
    const experiences = extractExperiences(extractedText);

    return NextResponse.json({
      success: true,
      text_length: extractedText.length,
      skills,
      experiences,
      preview: extractedText.slice(0, 500),
    });
  } catch (err) {
    console.error("Resume parse error:", err);
    return NextResponse.json(
      { error: "レジュメの解析に失敗しました" },
      { status: 500 }
    );
  }
}
