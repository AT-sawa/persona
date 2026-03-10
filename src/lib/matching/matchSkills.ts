/**
 * ユーザーのスキルと案件テキスト（must_req/nice_to_have）を比較してマッチ率を計算
 */
export function matchSkills(
  userSkills: string[],
  caseText: string
): { ratio: number; matched: string[] } {
  if (!userSkills.length || !caseText) {
    return { ratio: 0, matched: [] };
  }

  const normalizedText = caseText.toLowerCase();
  const matched: string[] = [];

  for (const skill of userSkills) {
    const normalizedSkill = skill.toLowerCase();
    if (normalizedText.includes(normalizedSkill)) {
      matched.push(skill);
    }
  }

  return {
    ratio: matched.length / userSkills.length,
    matched,
  };
}

// 必須要件テキストから除外する汎用語
const STOP_WORDS = new Set([
  "必須", "経験", "以上", "年", "程度", "スキル", "知識", "実務",
  "業務", "案件", "プロジェクト", "できる方", "ある方", "有する方",
  "歓迎", "尚可", "優遇", "要件", "条件", "必要", "求める",
  "もしくは", "または", "いずれか", "等", "など", "の", "を",
  "が", "に", "で", "は", "と", "から", "まで", "における",
]);

/**
 * 必須要件テキストからスキルキーワードを抽出
 */
export function extractRequirementKeywords(mustReqText: string): string[] {
  if (!mustReqText) return [];

  // 区切り文字で分割
  const tokens = mustReqText
    .split(/[、,\/／・\n\r]+|(?:及び|および|もしくは|または)/)
    .map((t) => t.trim())
    .filter(Boolean);

  const keywords: string[] = [];

  for (const token of tokens) {
    // 短すぎるものは除外
    if (token.length < 2) continue;

    // ストップワードのみで構成されるトークンを除外
    let cleaned = token;
    for (const sw of STOP_WORDS) {
      cleaned = cleaned.replace(new RegExp(sw, "g"), "");
    }
    cleaned = cleaned.trim();

    // クリーニング後に何か残っていればキーワードとして採用
    if (cleaned.length >= 2) {
      keywords.push(token.trim());
    }
  }

  return keywords;
}

/**
 * 必須要件の充足率を計算（案件の必須要件をユーザースキルがどの程度カバーしているか）
 */
export function matchMustHaveRequirements(
  userSkills: string[],
  mustReqText: string
): { fulfillment: number; matched: string[]; required: string[] } {
  const required = extractRequirementKeywords(mustReqText);

  if (required.length === 0) {
    return { fulfillment: 1, matched: [], required: [] };
  }

  if (userSkills.length === 0) {
    return { fulfillment: 0, matched: [], required };
  }

  const normalizedSkills = userSkills.map((s) => s.toLowerCase());
  const matched: string[] = [];

  for (const req of required) {
    const normalizedReq = req.toLowerCase();
    // 双方向部分一致: キーワード⊂スキル or スキル⊂キーワード
    const isMatched = normalizedSkills.some(
      (skill) => normalizedReq.includes(skill) || skill.includes(normalizedReq)
    );
    if (isMatched) {
      matched.push(req);
    }
  }

  return {
    fulfillment: matched.length / required.length,
    matched,
    required,
  };
}

/**
 * 経歴のスキルも含めてすべてのスキルを集約
 */
export function aggregateSkills(
  profileSkills: string[] | null,
  experienceSkills: string[][] | null
): string[] {
  const set = new Set<string>();

  if (profileSkills) {
    profileSkills.forEach((s) => set.add(s));
  }

  if (experienceSkills) {
    experienceSkills.forEach((skills) => {
      if (skills) skills.forEach((s) => set.add(s));
    });
  }

  return Array.from(set);
}
