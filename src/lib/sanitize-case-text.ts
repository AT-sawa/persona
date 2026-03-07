/**
 * 案件テキストのサニタイズ
 *
 * 元請け企業・パートナー企業の連絡先情報、提案方法の注意書き、
 * 担当者名などを案件公開前に自動除去する。
 */

import type { ParsedCase } from "./parse-email-cases";

// ── 削除対象パターン ──

/** 行単位で完全除去するパターン（行頭〜行末にマッチ） */
const LINE_REMOVE_PATTERNS: RegExp[] = [
  // 提案方法の注意書き
  /^.*(?:ご提案|ご紹介|ご連絡|ご推薦|エントリー)(?:いただく|の|時|する)際.*(?:お願い|ください|下さい|頂き|いたし).*$/,
  /^.*(?:LINE|メール|Slack|チャットワーク|Chatwork)(?:で|にて|から)(?:ご提案|ご連絡|ご推薦|ご紹介).*$/,
  /^.*No\.?を(?:記載|ご記載|明記).*(?:ご連絡|お願い|ください).*$/,
  /^.*案件(?:番号|No|NO|no).*(?:記載|明記|お書き).*$/,
  // 営業担当・連絡先情報
  /^.*(?:担当|営業担当|窓口|連絡先)[：:]\s*.+$/,
  /^.*(?:担当者|営業|窓口担当)[：:].+$/,
  // 注意事項の定型文
  /^[※＊\*].*(?:ご提案|ご紹介|ご連絡|エントリー|応募).*(?:際|時|の方).*$/,
  /^[※＊\*].*(?:他社|他エージェント|他案件).*(?:NG|不可|禁止|ご遠慮).*$/,
  /^[※＊\*].*(?:情報管理|秘密保持|守秘義務|NDA).*$/,
  // ローカルルール・エントリー時の運用指示
  /^[※＊\*]?.*(?:エントリー|応募|ご推薦|ご提案|ご紹介)(?:時|の際|にあたり).*(?:記載|ご記載|明記|ご協力|お願い|ください|下さい|頂き|いたし).*$/,
  /^[※＊\*]?.*(?:◯×|○×|〇×|マルバツ|丸バツ|可否).*(?:記載|ご記載|明記|ご協力|お願い).*$/,
  /^[※＊\*]?.*(?:ご協力|ご対応).*(?:お願い(?:いたし|申し上げ|致し)).*(?:ます|す).*$/,
  /^[※＊\*]?.*(?:スキルシート|経歴書|レジュメ).*(?:添付|送付|提出|ご提出).*(?:お願い|ください|下さい).*$/,
  /^[※＊\*]?.*(?:面談|面接)(?:可能|希望|NG)(?:日|日程|時間)?.*(?:記載|ご記載|明記|お知らせ|お願い).*$/,
  /^[※＊\*]?.*(?:単価|希望単価|金額).*(?:記載|ご記載|明記|お知らせ|お願い).*$/,
  /^[※＊\*]?.*(?:抵触日|契約期間|稼働開始).*(?:記載|ご記載|明記|お知らせ|お願い).*$/,
  // 会社署名ブロック
  /^[-─━=＝]{5,}$/,
  /^.*(?:株式会社|㈱|合同会社|LLC|Inc\.).*(?:事業部|部門|グループ|チーム)?\s*$/,
  // メールフッター
  /^.*(?:配信停止|メール配信|購読解除|unsubscribe).*$/i,
  /^.*(?:本メールは|このメールは).*(?:自動配信|送信しています|お届けして).*$/,
];

/** 部分的に除去するパターン（行の中から該当部分だけ削除） */
const PARTIAL_REMOVE_PATTERNS: RegExp[] = [
  // 「～の上ご連絡ください」等の末尾注釈
  /[。、]\s*(?:ご提案|ご紹介|ご連絡|エントリー)の際は[^。]*(?:お願い[^。]*)?[。]?/g,
  // 「※提案時は～」
  /[※＊]\s*(?:提案|ご提案|ご紹介)時[^。\n]*[。]?/g,
];

/**
 * テキストフィールド1つをサニタイズ
 */
export function sanitizeCaseField(text: string | null | undefined): string {
  if (!text) return "";
  let result = text;

  // 行単位で除去パターンをチェック
  const lines = result.split("\n");
  const cleaned = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true; // 空行は保持
    return !LINE_REMOVE_PATTERNS.some((pattern) => pattern.test(trimmed));
  });
  result = cleaned.join("\n");

  // 部分除去パターンを適用
  for (const pattern of PARTIAL_REMOVE_PATTERNS) {
    result = result.replace(pattern, "");
  }

  // 末尾の連続改行を整理
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

/**
 * ParsedCase の公開向けフィールドをまとめてサニタイズ
 * _salesRep 等のメタフィールドは管理用なのでそのまま。
 */
export function sanitizeParsedCase(c: ParsedCase): ParsedCase {
  return {
    ...c,
    title: c.title, // タイトルはそのまま
    description: sanitizeCaseField(c.description),
    background: sanitizeCaseField(c.background),
    must_req: sanitizeCaseField(c.must_req),
    nice_to_have: sanitizeCaseField(c.nice_to_have),
    flow: sanitizeCaseField(c.flow),
    _other: sanitizeCaseField(c._other),
  };
}

/**
 * DB insert 用の案件オブジェクトをサニタイズ
 * Record 形式（CSV import, webhook insert 等）に対応
 */
export function sanitizeCaseRecord<
  T extends Record<string, unknown>,
>(c: T): T {
  const textFields = [
    "description",
    "background",
    "must_req",
    "nice_to_have",
    "flow",
  ] as const;

  const sanitized = { ...c };
  for (const key of textFields) {
    if (key in sanitized && typeof sanitized[key] === "string") {
      (sanitized as Record<string, unknown>)[key] = sanitizeCaseField(
        sanitized[key] as string
      );
    }
  }
  return sanitized;
}
