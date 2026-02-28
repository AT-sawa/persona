/**
 * Parse case/project information from email body text.
 * Uses pattern matching to extract structured fields from
 * Japanese consulting case notification emails.
 */

export interface ParsedCase {
  title: string;
  category: string;
  industry: string;
  fee: string;
  occupancy: string;
  location: string;
  office_days: string;
  start_date: string;
  extendable: string;
  background: string;
  description: string;
  must_req: string;
  nice_to_have: string;
  flow: string;
  case_no: string;
  /** Fields that were successfully extracted */
  _extractedFields: string[];
  /** Original email text */
  _rawEmail: string;
}

// ── Label aliases for each field ──
const FIELD_PATTERNS: {
  key: keyof Omit<ParsedCase, "_extractedFields" | "_rawEmail">;
  labels: string[];
  multiline?: boolean;
}[] = [
  {
    key: "title",
    labels: [
      "案件名", "案件タイトル", "タイトル", "件名", "プロジェクト名",
      "PJ名", "案件概要", "ポジション名", "ポジション",
    ],
  },
  {
    key: "case_no",
    labels: [
      "案件番号", "案件No", "案件NO", "案件ID", "管理番号",
      "No.", "NO.", "Ref",
    ],
  },
  {
    key: "category",
    labels: ["カテゴリ", "カテゴリー", "分類", "種別", "領域"],
  },
  {
    key: "industry",
    labels: [
      "業界", "業種", "クライアント業界", "クライアント業種",
      "顧客業界", "産業",
    ],
  },
  {
    key: "fee",
    labels: [
      "報酬", "単価", "金額", "月額", "月単価", "予算",
      "想定単価", "想定報酬", "フィー", "Fee",
    ],
  },
  {
    key: "occupancy",
    labels: [
      "稼働率", "稼働", "稼動率", "稼動", "工数",
      "アサイン率", "コミットメント",
    ],
  },
  {
    key: "location",
    labels: [
      "勤務地", "場所", "勤務場所", "就業場所", "エリア",
      "勤務エリア", "拠点", "ロケーション",
    ],
  },
  {
    key: "office_days",
    labels: [
      "出社日数", "出社", "出社頻度", "リモート", "テレワーク",
      "働き方", "勤務形態", "就業形態", "出勤",
    ],
  },
  {
    key: "start_date",
    labels: [
      "開始日", "開始時期", "開始", "参画時期", "参画開始",
      "スタート", "着任", "想定開始", "期間",
    ],
  },
  {
    key: "extendable",
    labels: [
      "延長", "延長可否", "延長可能", "契約更新", "更新",
      "期間延長",
    ],
  },
  {
    key: "background",
    labels: [
      "案件背景", "背景", "プロジェクト背景", "PJ背景",
      "経緯", "概要",
    ],
    multiline: true,
  },
  {
    key: "description",
    labels: [
      "業務内容", "業務", "作業内容", "内容", "職務内容",
      "ミッション", "担当業務", "募集内容", "支援内容",
      "具体的な業務",
    ],
    multiline: true,
  },
  {
    key: "must_req",
    labels: [
      "必須要件", "必須スキル", "必須経験", "MUST", "Must",
      "必須条件", "必要スキル", "必要経験", "必要要件",
      "求めるスキル",
    ],
    multiline: true,
  },
  {
    key: "nice_to_have",
    labels: [
      "歓迎要件", "歓迎スキル", "歓迎経験", "WANT", "Want",
      "尚可", "あれば尚可", "歓迎条件", "優遇", "Nice to have",
      "あると望ましい",
    ],
    multiline: true,
  },
  {
    key: "flow",
    labels: [
      "選考フロー", "選考", "選考プロセス", "面談",
      "面談回数", "商流", "選考ステップ",
    ],
    multiline: true,
  },
];

/**
 * Build a regex that matches a labelled field.
 * Handles patterns like:
 *   ■案件名：xxx
 *   【案件名】xxx
 *   ・案件名: xxx
 *   案件名 : xxx
 */
function buildLabelRegex(labels: string[]): RegExp {
  const escaped = labels.map((l) =>
    l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const group = escaped.join("|");
  // Matches optional decorators (■●◆▼▶・★☆【) before the label,
  // optional closing decorator (】),
  // then separator (:：\s), then capture the value
  return new RegExp(
    `(?:^|\\n)\\s*[■●◆▼▶・★☆【〈《]?\\s*(?:${group})\\s*[】〉》]?\\s*[:：]?\\s*(.+)`,
    "i"
  );
}

/**
 * Extract a multiline block value.
 * Captures everything from the label until the next labelled field.
 */
function extractMultilineBlock(
  text: string,
  labels: string[]
): string | null {
  const escaped = labels.map((l) =>
    l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const group = escaped.join("|");

  const startPattern = new RegExp(
    `(?:^|\\n)\\s*[■●◆▼▶・★☆【〈《]?\\s*(?:${group})\\s*[】〉》]?\\s*[:：]?\\s*`,
    "i"
  );

  const match = startPattern.exec(text);
  if (!match) return null;

  const startIdx = match.index + match[0].length;

  // Find the next field label (any decorator + Japanese label + colon pattern)
  const nextFieldPattern =
    /\n\s*[■●◆▼▶・★☆【〈《]\s*[\u3000-\u9FFF\w]+\s*[】〉》]?\s*[:：]/;
  const nextMatch = nextFieldPattern.exec(text.slice(startIdx));

  const endIdx = nextMatch
    ? startIdx + nextMatch.index
    : text.length;

  const value = text.slice(startIdx, endIdx).trim();
  return value || null;
}

/**
 * Try to extract the title from the email subject line.
 */
function extractSubjectTitle(text: string): string | null {
  // Common patterns: "Subject: xxx", "件名: xxx", "Re: Fw: [案件] xxx"
  const subjectMatch = text.match(
    /(?:Subject|件名)\s*[:：]\s*(?:Re:\s*)?(?:Fw?:\s*)?(?:Fwd:\s*)?(.+)/i
  );
  if (subjectMatch) {
    // Clean up common prefixes
    return subjectMatch[1]
      .replace(/^\[.*?\]\s*/, "")
      .replace(/^【.*?】\s*/, "")
      .trim();
  }
  return null;
}

/**
 * Extract fee info from anywhere in the text if not found by label.
 */
function extractFeeFromText(text: string): string | null {
  const feePatterns = [
    /(\d{2,3})\s*[~～〜-]\s*(\d{2,3})\s*万\s*[\/月円]/,
    /月額?\s*[:：]?\s*(\d{2,3})\s*[~～〜-]\s*(\d{2,3})\s*万/,
    /(\d{2,3})\s*万円?\s*[\/月]/,
    /~\s*(\d{2,3})\s*万/,
  ];
  for (const pattern of feePatterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

/**
 * Main parse function: extract structured case data from email text.
 */
export function parseCaseEmail(emailText: string): ParsedCase {
  const text = emailText
    // Normalize line breaks
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const result: ParsedCase = {
    title: "",
    category: "",
    industry: "",
    fee: "",
    occupancy: "",
    location: "",
    office_days: "",
    start_date: "",
    extendable: "",
    background: "",
    description: "",
    must_req: "",
    nice_to_have: "",
    flow: "",
    case_no: "",
    _extractedFields: [],
    _rawEmail: emailText,
  };

  for (const field of FIELD_PATTERNS) {
    let value: string | null = null;

    if (field.multiline) {
      value = extractMultilineBlock(text, field.labels);
    }

    if (!value) {
      const regex = buildLabelRegex(field.labels);
      const match = regex.exec(text);
      if (match) {
        value = match[1].trim();
      }
    }

    if (value) {
      result[field.key] = value;
      result._extractedFields.push(field.key);
    }
  }

  // Fallback: try to get title from subject line
  if (!result.title) {
    const subjectTitle = extractSubjectTitle(text);
    if (subjectTitle) {
      result.title = subjectTitle;
      result._extractedFields.push("title");
    }
  }

  // Fallback: try to extract fee from body text
  if (!result.fee) {
    const bodyFee = extractFeeFromText(text);
    if (bodyFee) {
      result.fee = bodyFee;
      result._extractedFields.push("fee");
    }
  }

  return result;
}
