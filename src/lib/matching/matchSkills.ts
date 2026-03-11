/**
 * 関連スキルのマッピング
 * スキルAを持っていれば、関連スキルBの案件にも部分マッチする
 */
const RELATED_SKILLS: Record<string, string[]> = {
  // PM/PMO系
  "pmo": ["プロジェクト管理", "プロジェクトマネジメント", "pm", "プロジェクトリーダー"],
  "pm": ["pmo", "プロジェクト管理", "プロジェクトマネジメント"],
  "プロジェクト管理": ["pmo", "pm", "プロジェクトマネジメント"],
  "プロジェクトマネジメント": ["pmo", "pm", "プロジェクト管理"],
  // CRM/SFA系
  "crm": ["salesforce", "sfa", "顧客管理", "dynamics"],
  "salesforce": ["crm", "sfa", "顧客管理"],
  "sfa": ["crm", "salesforce", "顧客管理"],
  // ERP/SAP系
  "sap": ["erp", "s/4hana", "s4hana", "基幹システム"],
  "erp": ["sap", "基幹システム", "s/4hana"],
  "s/4hana": ["sap", "erp", "基幹システム"],
  "基幹システム": ["erp", "sap"],
  // DX/デジタル系
  "dx": ["デジタルトランスフォーメーション", "デジタル変革", "デジタル化"],
  "デジタルトランスフォーメーション": ["dx", "デジタル変革"],
  // BPR系
  "bpr": ["業務改革", "業務改善", "業務プロセス改革"],
  "業務改革": ["bpr", "業務改善"],
  "業務改善": ["bpr", "業務改革"],
  // データ系
  "データ分析": ["bi", "データサイエンス", "分析"],
  "bi": ["データ分析", "tableau", "power bi"],
  // クラウド/インフラ系
  "aws": ["クラウド", "azure", "gcp"],
  "azure": ["クラウド", "aws", "gcp"],
  "gcp": ["クラウド", "aws", "azure"],
  "クラウド": ["aws", "azure", "gcp"],
  // セキュリティ系
  "セキュリティ": ["ゼロトラスト", "情報セキュリティ", "csirt"],
  // AI系
  "ai": ["機械学習", "生成ai", "人工知能", "llm"],
  "機械学習": ["ai", "深層学習", "データサイエンス"],
  "生成ai": ["ai", "llm", "chatgpt"],
  // SCM系
  "scm": ["サプライチェーン", "物流", "在庫管理"],
  "サプライチェーン": ["scm", "物流", "在庫管理"],
  // 戦略系
  "戦略策定": ["戦略コンサルティング", "経営戦略", "中期経営計画"],
  "m&a": ["デューデリジェンス", "pmi", "dd"],
  "pmi": ["m&a", "統合"],
  // 人事系
  "人事": ["hr", "人事制度", "組織設計"],
  "hr": ["人事", "人事制度"],
  // 会計系
  "会計": ["fi", "財務", "経理"],
  "fi": ["会計", "財務会計", "管理会計"],
};

/**
 * 関連スキルを含めて拡張したスキルセットを返す
 */
function expandSkillsWithRelated(skills: string[]): { original: string[]; expanded: Set<string> } {
  const expanded = new Set<string>();
  for (const skill of skills) {
    expanded.add(skill.toLowerCase());
    const related = RELATED_SKILLS[skill.toLowerCase()];
    if (related) {
      related.forEach((r) => expanded.add(r.toLowerCase()));
    }
  }
  return { original: skills, expanded };
}

/**
 * ユーザーのスキルと案件テキスト（must_req/nice_to_have）を比較してマッチ率を計算
 * 直接マッチ: 1.0倍、関連スキルマッチ: 0.5倍
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
  let score = 0;

  for (const skill of userSkills) {
    const normalizedSkill = skill.toLowerCase();
    if (normalizedText.includes(normalizedSkill)) {
      // 直接マッチ: 1.0点
      matched.push(skill);
      score += 1.0;
    } else {
      // 関連スキルで部分マッチを試行
      const related = RELATED_SKILLS[normalizedSkill];
      if (related) {
        const relatedMatch = related.some((r) => normalizedText.includes(r.toLowerCase()));
        if (relatedMatch) {
          matched.push(skill + "（関連）");
          score += 0.5; // 関連スキルは半分のスコア
        }
      }
    }
  }

  return {
    ratio: Math.min(score / userSkills.length, 1.0),
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
 * 直接マッチ: 1.0、関連スキルマッチ: 0.6
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
  const { expanded: expandedSkills } = expandSkillsWithRelated(userSkills);
  const matched: string[] = [];
  let score = 0;

  for (const req of required) {
    const normalizedReq = req.toLowerCase();

    // 直接マッチ: キーワード⊂スキル or スキル⊂キーワード
    const directMatch = normalizedSkills.some(
      (skill) => normalizedReq.includes(skill) || skill.includes(normalizedReq)
    );

    if (directMatch) {
      matched.push(req);
      score += 1.0;
    } else {
      // 関連スキルで部分マッチ（0.6倍の充足率）
      const relatedMatch = Array.from(expandedSkills).some(
        (expSkill) => normalizedReq.includes(expSkill) || expSkill.includes(normalizedReq)
      );
      if (relatedMatch) {
        matched.push(req + "（関連）");
        score += 0.6;
      }
    }
  }

  return {
    fulfillment: Math.min(score / required.length, 1.0),
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
