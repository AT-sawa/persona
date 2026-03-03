/**
 * メールテキストから案件情報をパースするユーティリティ
 *
 * 対応フォーマット:
 * - XIENZ / LASINVA 形式（**** 区切り）
 * - 【】括弧によるフィールド定義
 */

export interface ParsedCase {
  case_no: string;
  title: string;
  category: string;
  industry: string;
  background: string;
  description: string;
  must_req: string;
  nice_to_have: string;
  start_date: string;
  fee: string;
  occupancy: string;
  location: string;
  office_days: string;
  flow: string;
  source_url: string;
  // メタ情報（表示用）
  _raw_title: string;
  _commercial_flow: string;
  _headcount: string;
  _contract_type: string;
  _settlement: string;
  _other: string;
  _sales_rep: string;
}

export interface ParseResult {
  cases: ParsedCase[];
  errors: string[];
  rawSections: number;
}

/**
 * メール本文から案件を抽出してパースする
 */
export function parseEmailCases(emailBody: string): ParseResult {
  const errors: string[] = [];

  // ***** 区切りでセクションを分割
  // 区切り線: 5個以上の * が連続
  const sections = emailBody.split(/\*{5,}/);

  const cases: ParsedCase[] = [];
  let rawSections = 0;

  // セクションは「ヘッダー」「ボディ」が交互に来る
  // ヘッダー: 案件タイトル・担当営業・XIENZリンク
  // ボディ: 【業種】【案件内容】...
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;

    // 案件タイトルを含むセクションを探す
    if (section.includes("案件タイトル")) {
      rawSections++;
      const headerSection = section;

      // 次のセクションがボディ
      const bodySection = i + 1 < sections.length ? sections[i + 1].trim() : "";
      i++; // ボディをスキップ

      try {
        const parsed = parseSingleCase(headerSection, bodySection);
        if (parsed) {
          cases.push(parsed);
        }
      } catch (e) {
        const titleMatch = headerSection.match(/案件タイトル[：:](.+)/);
        const title = titleMatch ? titleMatch[1].trim() : `セクション ${rawSections}`;
        errors.push(`「${title}」のパースに失敗: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // セクション分割がうまくいかない場合、行ベースで再試行
  if (cases.length === 0 && emailBody.includes("案件タイトル")) {
    const lineBasedResult = parseLineBasedFormat(emailBody);
    if (lineBasedResult.cases.length > 0) {
      return lineBasedResult;
    }
  }

  return { cases, errors, rawSections };
}

/**
 * 行ベースのパース（区切り線がない場合のフォールバック）
 */
function parseLineBasedFormat(text: string): ParseResult {
  const cases: ParsedCase[] = [];
  const errors: string[] = [];

  // 「案件タイトル」で分割
  const parts = text.split(/(?=案件タイトル[：:])/);
  let rawSections = 0;

  for (const part of parts) {
    if (!part.includes("案件タイトル")) continue;
    rawSections++;

    try {
      const parsed = parseSingleCase(part, part);
      if (parsed) {
        cases.push(parsed);
      }
    } catch (e) {
      errors.push(`セクション ${rawSections} のパースに失敗: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { cases, errors, rawSections };
}

/**
 * 1案件分のヘッダー+ボディをパース
 */
function parseSingleCase(header: string, body: string): ParsedCase | null {
  // === ヘッダーパース ===
  const titleMatch = header.match(/案件タイトル[：:](.+?)(?:\n|$)/);
  if (!titleMatch) return null;

  const rawTitle = titleMatch[1].trim();

  // タイトルから案件番号を抽出（例: "1695_官公庁向け..." → case_no="1695", title="官公庁向け..."）
  let caseNo = "";
  let title = rawTitle;
  const noMatch = rawTitle.match(/^(\d+)[_＿](.+)$/);
  if (noMatch) {
    caseNo = noMatch[1];
    title = noMatch[2].trim();
  }

  // 担当営業
  const salesMatch = header.match(/担当営業[：:](.+?)(?:\n|$)/);
  const salesRep = salesMatch ? salesMatch[1].trim() : "";

  // ソースURL（XIENZリンクなど）
  const urlMatch = header.match(/(?:XIENZ|リンク)[^：:]*[：:]?\s*(https?:\/\/[^\s]+)/i);
  const sourceUrl = urlMatch ? urlMatch[1].trim() : "";

  // === ボディパース ===
  const combined = header + "\n" + body;

  const industry = extractField(combined, "業種");
  const commercialFlow = extractField(combined, "商流");
  const caseContent = extractField(combined, "案件内容");
  const roleTask = extractField(combined, "役割／タスク") || extractField(combined, "役割/タスク") || extractField(combined, "タスク");

  // 人材要件: MUST / NTH を分離
  const reqBlock = extractField(combined, "人材要件");
  let mustReq = "";
  let nthReq = "";

  if (reqBlock) {
    const mustNthSplit = reqBlock.split(/[（(]\s*(?:NTH|NICE\s*TO\s*HAVE|尚可)\s*[）)]/i);
    if (mustNthSplit.length >= 2) {
      // MUST部分（（MUST）の文字を除去）
      mustReq = mustNthSplit[0].replace(/[（(]\s*MUST\s*[）)]/gi, "").trim();
      nthReq = mustNthSplit[1].trim();
    } else {
      // MUSTとNTHの分離がうまくいかない場合
      const mustMatch = reqBlock.match(/[（(]\s*MUST\s*[）)]([\s\S]*?)(?=[（(]\s*(?:NTH|NICE)|$)/i);
      const nthMatch = reqBlock.match(/[（(]\s*(?:NTH|NICE\s*TO\s*HAVE|尚可)\s*[）)]([\s\S]*?)$/i);
      mustReq = mustMatch ? mustMatch[1].trim() : reqBlock.replace(/[（(]\s*MUST\s*[）)]/gi, "").trim();
      nthReq = nthMatch ? nthMatch[1].trim() : "";
    }
  }

  const startDate = extractField(combined, "期間");
  const fee = extractField(combined, "月額報酬") || extractField(combined, "報酬") || extractField(combined, "単価");
  const occupancy = extractField(combined, "稼働率") || extractField(combined, "稼働");
  const settlement = extractField(combined, "精算幅");
  const headcount = extractField(combined, "募集人数");
  const location = extractField(combined, "勤務地");
  const workStyle = extractField(combined, "勤務形態");
  const contractType = extractField(combined, "契約形態");
  const interviews = extractField(combined, "面談回数") || extractField(combined, "面談");
  const other = extractField(combined, "その他");

  // カテゴリ推定
  const category = guessCategory(title, caseContent, roleTask);

  // description: 案件内容 + 役割/タスク を結合
  let description = "";
  if (caseContent) description += caseContent;
  if (roleTask) {
    if (description) description += "\n\n【役割／タスク】\n";
    description += roleTask;
  }

  // flow: 面談回数 + 契約形態
  let flow = "";
  if (interviews) flow += `面談${interviews}`;
  if (contractType) flow += flow ? ` / ${contractType}` : contractType;

  // office_days: 勤務形態
  const officeDays = workStyle || "";

  return {
    case_no: caseNo,
    title,
    category,
    industry: industry || "",
    background: "",
    description,
    must_req: mustReq,
    nice_to_have: nthReq,
    start_date: startDate || "",
    fee: fee || "",
    occupancy: occupancy || "",
    location: location || "",
    office_days: officeDays,
    flow,
    source_url: sourceUrl,
    _raw_title: rawTitle,
    _commercial_flow: commercialFlow || "",
    _headcount: headcount || "",
    _contract_type: contractType || "",
    _settlement: settlement || "",
    _other: other || "",
    _sales_rep: salesRep,
  };
}

/**
 * 【フィールド名】の後に続くテキストを抽出
 */
function extractField(text: string, fieldName: string): string {
  // 【フィールド名】値 のパターン
  const pattern = new RegExp(
    `【${escapeRegex(fieldName)}】\\s*([\\s\\S]*?)(?=【[^】]+】|$)`,
    "i"
  );
  const match = text.match(pattern);
  if (!match) return "";

  let value = match[1].trim();

  // 次の*****区切り以降を除去
  const starIdx = value.indexOf("*****");
  if (starIdx >= 0) value = value.substring(0, starIdx).trim();

  // 末尾の空行を除去
  value = value.replace(/\n\s*$/, "").trim();

  return value;
}

/**
 * タイトル・内容からカテゴリ（IT / 非IT）を推定
 */
function guessCategory(title: string, content: string, roleTask: string): string {
  const combined = `${title} ${content} ${roleTask}`.toLowerCase();
  const itKeywords = [
    "システム", "開発", "it", "sap", "erp", "aws", "azure", "gcp",
    "フロントエンド", "バックエンド", "インフラ", "ai", "ml", "データ",
    "クラウド", "saas", "api", "react", "typescript", "python",
    "terraform", "devops", "cicd", "ci/cd", "マイクロサービス",
    "セキュリティ", "ネットワーク", "db", "データベース",
  ];
  const nonItKeywords = [
    "戦略", "経営", "m&a", "pmi", "組織", "人事", "マーケティング",
    "bpr", "業務改革",
  ];

  const itScore = itKeywords.filter(k => combined.includes(k)).length;
  const nonItScore = nonItKeywords.filter(k => combined.includes(k)).length;

  // PMO/DXは両方に該当しうる
  if (combined.includes("pmo") || combined.includes("dx")) {
    return itScore > nonItScore ? "IT" : "非IT";
  }

  return itScore >= nonItScore ? "IT" : "非IT";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}
