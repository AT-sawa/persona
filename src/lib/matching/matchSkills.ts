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
