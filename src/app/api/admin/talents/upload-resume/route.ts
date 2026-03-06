import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logAudit } from "@/lib/audit";

// Singleton Claude client (same pattern as parse-text/route.ts)
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_anthropic)
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const RESUME_PARSE_PROMPT = `あなたはフリーランスコンサルタントの職務経歴書（レジュメ）の構造化パーサーです。
以下のレジュメテキストから人材プロフィール情報を抽出し、JSON形式で返してください。

## 出力形式
以下のJSONオブジェクトのみを返してください：

{
  "name": "氏名（フルネームまたはイニシャル）",
  "position": "直近の職種・役職（例: PMOコンサルタント、SAP FIコンサルタント、データ分析マネージャー）",
  "age_range": "年代（例: 30代前半、40代後半）推定不可なら空文字",
  "introduction": "この人材の強みを3〜5行で簡潔に要約した紹介文",
  "personnel_info": "経歴の詳細サマリー（主要プロジェクト、年数、得意分野など）",
  "project_type": "この人材に最適な案件タイプ（例: PMO案件、SAP導入、DX推進、業務改革）",
  "skills": "主要スキル・技術のカンマ区切りリスト",
  "work_style": "勤務形態の希望（テキストから推定できれば。例: フルリモート、常駐可能）",
  "fee_min": null,
  "fee_max": null
}

## ルール
- 日本語で回答してください
- 名前が見つからない場合は空文字にしてください
- introductionは案件提案時に使える簡潔な人物紹介文を生成してください
- personnel_infoは詳細な経歴サマリーを含めてください
- 推定できない項目は空文字にしてください
- JSON以外のテキストは一切不要です
- fee_min, fee_maxは数値（円）。テキストから読み取れなければnullにしてください`;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // 1. Admin auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileHash = formData.get("fileHash") as string | null;
    const sourceName =
      (formData.get("sourceName") as string) || "PDF Upload";

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが必要です" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "PDFファイルのみ対応しています" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは10MB以下にしてください" },
        { status: 400 }
      );
    }

    if (!fileHash) {
      return NextResponse.json(
        { error: "ファイルハッシュが必要です" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // 3. Duplicate check
    const { data: existing } = await serviceClient
      .from("external_talents")
      .select("id, name")
      .eq("source_sheet_url", "pdf-upload")
      .eq("source_row_key", fileHash)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        status: "duplicate",
        existingId: existing.id,
        existingName: existing.name,
        message: `この履歴書は既にアップロード済みです（${existing.name || "名前未設定"}）`,
      });
    }

    // 4. Upload to storage
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${sourceName.replace(/[^a-zA-Z0-9_-]/g, "_")}/${timestamp}_${safeName}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await serviceClient.storage
      .from("talent-resumes")
      .upload(filePath, arrayBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "ファイルのアップロードに失敗しました" },
        { status: 500 }
      );
    }

    // 5. Extract text from PDF (same pattern as /api/resumes/parse/route.ts)
    let extractedText = "";
    try {
      const buffer = Buffer.from(arrayBuffer);
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      extractedText = textResult.text;
      await parser.destroy();
    } catch (parseErr) {
      console.error("PDF parse error:", parseErr);
      // Still save the file even if text extraction fails
    }

    if (!extractedText.trim()) {
      // Save without AI — file is in storage but no text extracted
      const { data: inserted, error: insertError } = await serviceClient
        .from("external_talents")
        .insert({
          source_name: sourceName,
          source_sheet_url: "pdf-upload",
          source_row_key: fileHash,
          resume_file_path: filePath,
          resume_text: "",
          raw_data: { filename: file.name, fileSize: String(file.size) },
          source_hash: fileHash,
        })
        .select("id, name")
        .single();

      if (insertError) {
        await serviceClient.storage.from("talent-resumes").remove([filePath]);
        return NextResponse.json(
          { error: `DB保存に失敗しました: ${insertError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: "saved_no_text",
        talent: inserted,
        message: `${file.name}: PDFからテキストを抽出できませんでしたが、ファイルは保存しました`,
      });
    }

    // 6. Claude AI profile generation
    const anthropic = getAnthropic();
    let parsed: Record<string, unknown> = {};

    if (anthropic) {
      try {
        // Truncate text for Claude (keep under ~30k chars)
        const textForClaude = extractedText.slice(0, 30000);

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: RESUME_PARSE_PROMPT,
          messages: [
            {
              role: "user",
              content: `以下のレジュメテキストを解析してください:\n\n${textForClaude}`,
            },
          ],
        });

        const responseText =
          response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            // Use empty parsed
          }
        }
      } catch (aiErr) {
        console.error("Claude API error:", aiErr);
        // Continue without AI — save the raw text
      }
    }

    // 7. Insert into external_talents
    const { data: inserted, error: insertError } = await serviceClient
      .from("external_talents")
      .insert({
        source_name: sourceName,
        source_sheet_url: "pdf-upload",
        source_row_key: fileHash,
        name: (parsed.name as string) || null,
        position: (parsed.position as string) || null,
        age_range: (parsed.age_range as string) || null,
        introduction: (parsed.introduction as string) || null,
        personnel_info: (parsed.personnel_info as string) || null,
        project_type: (parsed.project_type as string) || null,
        work_style: (parsed.work_style as string) || null,
        fee_min:
          typeof parsed.fee_min === "number" ? parsed.fee_min : null,
        fee_max:
          typeof parsed.fee_max === "number" ? parsed.fee_max : null,
        resume_file_path: filePath,
        resume_text: extractedText.slice(0, 50000),
        raw_data: {
          filename: file.name,
          fileSize: String(file.size),
          skills: (parsed.skills as string) || "",
          ai_parsed: !!anthropic,
        },
        source_hash: fileHash,
      })
      .select("id, name, position")
      .single();

    if (insertError) {
      await serviceClient.storage.from("talent-resumes").remove([filePath]);
      return NextResponse.json(
        { error: `DB保存に失敗しました: ${insertError.message}` },
        { status: 500 }
      );
    }

    // 8. Audit log
    await logAudit({
      action: "talents.pdf_upload",
      resourceType: "external_talents",
      resourceId: inserted.id,
      details: {
        filename: file.name,
        sourceName,
        parsedName: (parsed.name as string) || null,
      },
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        undefined,
    });

    return NextResponse.json({
      status: "success",
      talent: inserted,
      message: `${inserted.name || file.name} を登録しました`,
    });
  } catch (err) {
    console.error("Resume upload error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
