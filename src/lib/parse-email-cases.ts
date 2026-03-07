/**
 * メールテキストから案件情報をパースするユーティリティ
 *
 * 対応フォーマット:
 * - Format A: XIENZ / LASINVA 形式（**** 区切り + 【】括弧）
 * - Format B: コロニー等（[案件名][単価][必須スキル] 半角角括弧）
 */

import { sanitizeParsedCase } from "./sanitize-case-text";

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
  work_style: string;
  office_days: string;
  flow: string;
  client_company: string;
  commercial_flow: string;
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
 * 自動的にフォーマットを検出して適切なパーサーを使用
 */
export function parseEmailCases(emailBody: string): ParseResult {
  // Format B 検出: [案件名] パターン
  let result: ParseResult;
  if (/\[案件名\]/i.test(emailBody)) {
    result = parseBracketFormat(emailBody);
  } else {
    // Format A: XIENZ/LASINVA 形式
    result = parseXienzFormat(emailBody);
  }

  // 全案件テキストをサニタイズ（元請け連絡先・提案注意書き等を除去）
  result.cases = result.cases.map((c) => sanitizeParsedCase(c));

  return result;
}

// ═══════════════════════════════════════════════
// Format A: XIENZ / LASINVA 形式
// 区切り: ***** + 【】フィールド
// ═══════════════════════════════════════════════

function parseXienzFormat(emailBody: string): ParseResult {
  const errors: string[] = [];

  // ***** 区切りでセクションを分割
  const sections = emailBody.split(/\*{5,}/);

  const cases: ParsedCase[] = [];
  let rawSections = 0;

  // セクションは「ヘッダー」「ボディ」が交互に来る
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;

    if (section.includes("案件タイトル")) {
      rawSections++;
      const headerSection = section;
      const bodySection = i + 1 < sections.length ? sections[i + 1].trim() : "";
      i++;

      try {
        const parsed = parseXienzSingleCase(headerSection, bodySection);
        if (parsed) cases.push(parsed);
      } catch (e) {
        const titleMatch = headerSection.match(/案件タイトル[：:](.+)/);
        const title = titleMatch ? titleMatch[1].trim() : `セクション ${rawSections}`;
        errors.push(`「${title}」のパースに失敗: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // 区切りが無い場合、行ベースで再試行
  if (cases.length === 0 && emailBody.includes("案件タイトル")) {
    const parts = emailBody.split(/(?=案件タイトル[：:])/);
    let idx = 0;
    for (const part of parts) {
      if (!part.includes("案件タイトル")) continue;
      rawSections = ++idx;
      try {
        const parsed = parseXienzSingleCase(part, part);
        if (parsed) cases.push(parsed);
      } catch (e) {
        errors.push(`セクション ${idx} のパースに失敗: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { cases, errors, rawSections };
}

/**
 * XIENZ形式の1案件パース
 */
function parseXienzSingleCase(header: string, body: string): ParsedCase | null {
  const titleMatch = header.match(/案件タイトル[：:](.+?)(?:\n|$)/);
  if (!titleMatch) return null;

  const rawTitle = titleMatch[1].trim();
  let caseNo = "";
  let title = rawTitle;
  const noMatch = rawTitle.match(/^(\d+)[_＿](.+)$/);
  if (noMatch) {
    caseNo = noMatch[1];
    title = noMatch[2].trim();
  }

  const salesMatch = header.match(/担当営業[：:](.+?)(?:\n|$)/);
  const salesRep = salesMatch ? salesMatch[1].trim() : "";

  const urlMatch = header.match(/(?:XIENZ|リンク)[^：:]*[：:]?\s*(https?:\/\/[^\s]+)/i);
  const sourceUrl = urlMatch ? urlMatch[1].trim() : "";

  const combined = header + "\n" + body;

  const industry = extractKakko(combined, "業種");
  const commercialFlow = extractKakko(combined, "商流");
  const caseContent = extractKakko(combined, "案件内容");
  const roleTask = extractKakko(combined, "役割／タスク") || extractKakko(combined, "役割/タスク") || extractKakko(combined, "タスク");

  // 人材要件: MUST / NTH を分離
  const reqBlock = extractKakko(combined, "人材要件");
  const { must, nth } = splitMustNth(reqBlock);

  const startDate = extractKakko(combined, "期間");
  const fee = extractKakko(combined, "月額報酬") || extractKakko(combined, "報酬") || extractKakko(combined, "単価");
  const occupancy = extractKakko(combined, "稼働率") || extractKakko(combined, "稼働");
  const settlement = extractKakko(combined, "精算幅");
  const headcount = extractKakko(combined, "募集人数");
  const location = extractKakko(combined, "勤務地");
  const workStyle = extractKakko(combined, "勤務形態");
  const contractType = extractKakko(combined, "契約形態");
  const interviews = extractKakko(combined, "面談回数") || extractKakko(combined, "面談");
  const other = extractKakko(combined, "その他");

  const category = guessCategory(title, caseContent, roleTask);

  let description = "";
  if (caseContent) description += caseContent;
  if (roleTask) {
    if (description) description += "\n\n【役割／タスク】\n";
    description += roleTask;
  }

  let flow = "";
  if (interviews) flow += `面談${interviews}`;
  if (contractType) flow += flow ? ` / ${contractType}` : contractType;

  return {
    case_no: caseNo,
    title,
    category,
    industry: industry || "",
    background: "",
    description,
    must_req: must,
    nice_to_have: nth,
    start_date: startDate || "",
    fee: fee || "",
    occupancy: occupancy || "",
    location: location || "",
    work_style: inferWorkStyle(workStyle || location || ""),
    office_days: workStyle || "",
    flow,
    client_company: "",
    commercial_flow: commercialFlow || "",
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

// ═══════════════════════════════════════════════
// Format B: 半角角括弧 [フィールド名]値 形式
// コロニー等のパートナー
// ═══════════════════════════════════════════════

function parseBracketFormat(emailBody: string): ParseResult {
  const errors: string[] = [];

  // [案件名] で分割して複数案件に対応
  const parts = emailBody.split(/(?=\[案件名\])/);
  const cases: ParsedCase[] = [];
  let rawSections = 0;

  for (const part of parts) {
    if (!part.includes("[案件名]")) continue;
    rawSections++;

    try {
      const parsed = parseBracketSingleCase(part);
      if (parsed) cases.push(parsed);
    } catch (e) {
      errors.push(`案件 ${rawSections} のパースに失敗: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { cases, errors, rawSections };
}

/**
 * 半角角括弧形式の1案件パース
 */
function parseBracketSingleCase(text: string): ParsedCase | null {
  const title = extractBracket(text, "案件名");
  if (!title) return null;

  const rawTitle = title;

  // タイトルから案件番号抽出
  let caseNo = "";
  let cleanTitle = title;
  const noMatch = title.match(/^(\d+)[_＿](.+)$/);
  if (noMatch) {
    caseNo = noMatch[1];
    cleanTitle = noMatch[2].trim();
  }

  const commercialFlow = extractBracket(text, "商流");
  const industry = extractBracket(text, "業種");

  // 単価: 数値のみの場合は「万円/月」を付加
  let fee = extractBracket(text, "単価.*?") || extractBracket(text, "単価") || "";
  if (fee && /^\d+$/.test(fee.trim())) {
    fee = `${fee.trim()}万円/月`;
  }

  // 場所
  const location = extractBracket(text, "作業場所") || extractBracket(text, "勤務地") || "";

  // 期間: 契約開始日〜契約終了日 を結合
  const startDateRaw = extractBracket(text, "契約開始日") || "";
  const endDateRaw = extractBracket(text, "契約終了日") || "";
  let startDate = startDateRaw;
  if (startDateRaw && endDateRaw) {
    startDate = `${startDateRaw}～${endDateRaw}`;
  }

  const extendable = extractBracket(text, "継続可能性") || "";
  const occupancy = extractBracket(text, "稼働率.*?") || extractBracket(text, "稼働率") || "";
  const headcount = extractBracket(text, "募集人数") || "";
  const interviews = extractBracket(text, "面談回数") || "";

  // 作業内容 → description
  const description = extractBracket(text, "作業内容") || "";

  // 必須/尚可スキル
  const mustReq = extractBracket(text, "必須スキル") || "";
  const nthReq = extractBracket(text, "尚可スキル") || "";

  const other = extractBracket(text, "補足事項") || "";
  const salesRep = extractBracket(text, "案件担当者") || "";
  const caseStatus = extractBracket(text, "案件状況") || "";

  // カテゴリ推定
  const category = guessCategory(cleanTitle, description, "");

  // flow
  let flow = "";
  if (interviews) flow += `面談${interviews}回`;
  if (caseStatus) flow += flow ? ` / ${caseStatus}` : caseStatus;

  // extendable を開始日に付加
  if (extendable && extendable !== "-" && extendable !== "なし") {
    if (startDate) {
      startDate += `（継続${extendable}）`;
    }
  }

  // 占有率: %を付加
  let occupancyStr = occupancy;
  if (occupancyStr && /^\d+$/.test(occupancyStr.trim())) {
    occupancyStr = `${occupancyStr.trim()}%`;
  }

  return {
    case_no: caseNo,
    title: cleanTitle,
    category,
    industry: industry || "",
    background: "",
    description,
    must_req: mustReq,
    nice_to_have: nthReq,
    start_date: startDate || "",
    fee,
    occupancy: occupancyStr,
    location,
    work_style: inferWorkStyle(location || ""),
    office_days: "",
    flow,
    client_company: "",
    commercial_flow: commercialFlow || "",
    source_url: "",
    _raw_title: rawTitle,
    _commercial_flow: commercialFlow || "",
    _headcount: headcount || "",
    _contract_type: "",
    _settlement: "",
    _other: other || "",
    _sales_rep: salesRep,
  };
}

// ═══════════════════════════════════════════════
// 共通ユーティリティ
// ═══════════════════════════════════════════════

/**
 * 【フィールド名】の後に続くテキストを抽出
 */
function extractKakko(text: string, fieldName: string): string {
  const pattern = new RegExp(
    `【${escapeRegex(fieldName)}】\\s*([\\s\\S]*?)(?=【[^】]+】|$)`,
    "i"
  );
  const match = text.match(pattern);
  if (!match) return "";

  let value = match[1].trim();
  const starIdx = value.indexOf("*****");
  if (starIdx >= 0) value = value.substring(0, starIdx).trim();
  value = value.replace(/\n\s*$/, "").trim();
  return value;
}

/**
 * [フィールド名]の後に続くテキストを抽出（半角角括弧）
 * 次の [フィールド] が現れるまで、または末尾まで
 */
function extractBracket(text: string, fieldName: string): string {
  // [フィールド名]値 or [フィールド名]\n値 の両方に対応
  const pattern = new RegExp(
    `\\[${escapeRegex(fieldName)}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`,
    "i"
  );
  const match = text.match(pattern);
  if (!match) return "";

  let value = match[1].trim();
  // 末尾の空行を除去
  value = value.replace(/\n\s*$/, "").trim();
  return value;
}

/**
 * 人材要件からMUSTとNTHを分離
 */
function splitMustNth(reqBlock: string): { must: string; nth: string } {
  if (!reqBlock) return { must: "", nth: "" };

  const mustNthSplit = reqBlock.split(/[（(]\s*(?:NTH|NICE\s*TO\s*HAVE|尚可)\s*[）)]/i);
  if (mustNthSplit.length >= 2) {
    return {
      must: mustNthSplit[0].replace(/[（(]\s*MUST\s*[）)]/gi, "").trim(),
      nth: mustNthSplit[1].trim(),
    };
  }

  const mustMatch = reqBlock.match(/[（(]\s*MUST\s*[）)]([\s\S]*?)(?=[（(]\s*(?:NTH|NICE)|$)/i);
  const nthMatch = reqBlock.match(/[（(]\s*(?:NTH|NICE\s*TO\s*HAVE|尚可)\s*[）)]([\s\S]*?)$/i);
  return {
    must: mustMatch ? mustMatch[1].trim() : reqBlock.replace(/[（(]\s*MUST\s*[）)]/gi, "").trim(),
    nth: nthMatch ? nthMatch[1].trim() : "",
  };
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
    "kafka", "cdc", "アーキテクチャ",
  ];
  const nonItKeywords = [
    "戦略", "経営", "m&a", "pmi", "組織", "人事", "マーケティング",
    "bpr", "業務改革",
  ];

  const itScore = itKeywords.filter(k => combined.includes(k)).length;
  const nonItScore = nonItKeywords.filter(k => combined.includes(k)).length;

  if (combined.includes("pmo") || combined.includes("dx")) {
    return itScore > nonItScore ? "IT" : "非IT";
  }

  return itScore >= nonItScore ? "IT" : "非IT";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}

/**
 * 勤務形態テキストから構造化された work_style 値を推定
 */
export function inferWorkStyle(text: string): string {
  if (!text) return "";
  const t = text.toLowerCase();
  if (t.includes("フルリモート") || t === "リモート" || t.includes("完全リモート") || t.includes("在宅")) return "フルリモート";
  if (t.includes("ミーティング") || t.includes("mtg") || t.includes("会議のみ")) return "ミーティング出社";
  if (t.includes("常駐") || t.includes("フル出社") || t.includes("毎日出社") || t.includes("週5")) return "常駐";
  if (t.includes("一部リモート") || t.includes("ハイブリッド") || /週\d日.*出社/.test(t) || t.includes("リモート")) return "一部リモート";
  return "";
}
