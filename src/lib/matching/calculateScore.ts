import { parseFee, parseOccupancy } from "./parseFee";
import { matchSkills, matchMustHaveRequirements, aggregateSkills } from "./matchSkills";
import type { Case, Profile, UserPreferences, UserExperience } from "@/lib/types";

interface MatchFactors {
  skills: { score: number; max: number; matched: string[]; total: number; active: boolean };
  category: { score: number; max: number; matched: boolean; active: boolean };
  industry: { score: number; max: number; matched: string | null; active: boolean };
  rate: { score: number; max: number; caseRange: string; userRange: string; active: boolean };
  location: { score: number; max: number; details: string; active: boolean };
  occupancy: { score: number; max: number; details: string; active: boolean };
  must_have: { fulfillment: number; matched: string[]; required: string[]; active: boolean };
}

interface MatchResult {
  score: number;
  factors: MatchFactors;
  /** 0-1: ratio of factor weights that had actual user data */
  profileCompleteness: number;
}

const WEIGHTS = {
  skills: 30,
  category: 10,
  industry: 15,
  rate: 20,
  location: 15,
  occupancy: 10,
};

/**
 * 1つの案件に対するユーザーのマッチングスコアを計算
 *
 * 改善ポイント:
 * - 稼働率: バイナリ → 差分に応じた段階スコア
 * - 報酬: レンジ外でもニアミスに部分点
 * - 必須要件: 80%閾値の崖 → なだらかなカーブ
 * - スキル: 関連スキルボーナス
 * - 勤務地: 部分マッチの拡充
 */
export function calculateScore(
  caseData: Case,
  profile: Profile,
  preferences: UserPreferences | null,
  experiences: UserExperience[]
): MatchResult {
  const allSkills = aggregateSkills(
    profile.skills,
    experiences.map((e) => e.skills_used || [])
  );

  const factors: MatchFactors = {
    skills: { score: 0, max: WEIGHTS.skills, matched: [], total: allSkills.length, active: false },
    category: { score: 0, max: WEIGHTS.category, matched: false, active: false },
    industry: { score: 0, max: WEIGHTS.industry, matched: null, active: false },
    rate: { score: 0, max: WEIGHTS.rate, caseRange: "", userRange: "", active: false },
    location: { score: 0, max: WEIGHTS.location, details: "", active: false },
    occupancy: { score: 0, max: WEIGHTS.occupancy, details: "", active: false },
    must_have: { fulfillment: 1, matched: [], required: [], active: false },
  };

  // 0. Must-have requirements evaluation
  if (caseData.must_req) {
    const mustHaveResult = matchMustHaveRequirements(allSkills, caseData.must_req);
    factors.must_have = {
      fulfillment: mustHaveResult.fulfillment,
      matched: mustHaveResult.matched,
      required: mustHaveResult.required,
      active: mustHaveResult.required.length > 0,
    };
  }

  // 1. Skills Match (30pts) — active only if user has skills
  const caseText = [
    caseData.must_req || "",
    caseData.nice_to_have || "",
    caseData.description || "",
    caseData.title || "",
  ].join(" ");

  if (allSkills.length > 0) {
    factors.skills.active = true;
    const { ratio, matched } = matchSkills(allSkills, caseText);
    factors.skills.score = Math.round(ratio * WEIGHTS.skills);
    factors.skills.matched = matched;
  }

  // 2. Category Match (10pts) — active only if user set desired categories
  if (preferences?.desired_categories?.length) {
    factors.category.active = true;
    if (caseData.category) {
      const match = preferences.desired_categories.some(
        (c) => caseData.category?.includes(c)
      );
      if (match) {
        factors.category.score = WEIGHTS.category;
        factors.category.matched = true;
      }
    }
  }

  // 3. Industry Match (15pts) — active only if user set desired industries
  if (preferences?.desired_industries?.length) {
    factors.industry.active = true;
    if (caseData.industry) {
      const matchedIndustry = preferences.desired_industries.find((ind) =>
        caseData.industry?.includes(ind)
      );
      if (matchedIndustry) {
        factors.industry.score = WEIGHTS.industry;
        factors.industry.matched = matchedIndustry;
      }
    }
  }

  // 4. Rate Compatibility (20pts) — 段階的スコアリング（ニアミスに部分点）
  const caseFee = parseFee(caseData.fee);
  const userRateMin = preferences?.desired_rate_min ?? profile.hourly_rate_min;
  const userRateMax = preferences?.desired_rate_max ?? profile.hourly_rate_max;

  factors.rate.caseRange = `${caseFee.min ?? "?"}~${caseFee.max ?? "?"}`;
  factors.rate.userRange = `${userRateMin ?? "?"}~${userRateMax ?? "?"}`;

  if (userRateMin !== null || userRateMax !== null) {
    factors.rate.active = true;
    if (caseFee.min !== null || caseFee.max !== null) {
      const cMin = caseFee.min ?? 0;
      const cMax = caseFee.max ?? 9999;
      const uMin = userRateMin ?? 0;
      const uMax = userRateMax ?? 9999;

      if (cMax >= uMin && uMax >= cMin) {
        // 重複あり → 重複度に応じたスコア
        const overlapStart = Math.max(cMin, uMin);
        const overlapEnd = Math.min(cMax, uMax);
        const overlapSize = overlapEnd - overlapStart;
        const userRange = uMax - uMin || 1;
        const overlapRatio = Math.min(overlapSize / userRange, 1);
        factors.rate.score = Math.round(overlapRatio * WEIGHTS.rate);
      } else {
        // 重複なしでもニアミス（±20%以内）なら部分点
        const gap = cMax < uMin
          ? (uMin - cMax) / (uMin || 1)  // 案件が安い
          : (cMin - uMax) / (uMax || 1);  // 案件が高い
        if (gap <= 0.2) {
          // 差が20%以内なら最大50%のスコア（差に反比例）
          const nearMissRatio = 1 - gap / 0.2; // 1.0（ギリギリ） → 0.0（20%差）
          factors.rate.score = Math.round(nearMissRatio * WEIGHTS.rate * 0.5);
        }
      }
    }
  }

  // 5. Location/Remote Match (15pts) — 部分マッチの拡充
  const userRemote = preferences?.remote_preference ?? profile.remote_preference;
  const userLocations = preferences?.preferred_locations ?? [];

  if (userRemote || userLocations.length > 0) {
    factors.location.active = true;
    if (caseData.location || caseData.work_style) {
      const ws = caseData.work_style;
      const caseIsRemote = ws === "フルリモート" ||
        ws === "ミーティング出社" ||
        (!ws && (caseData.office_days?.includes("フルリモート") || caseData.location?.includes("リモート")));
      const caseIsHybrid = ws === "一部リモート" ||
        (!ws && caseData.office_days?.includes("一部リモート"));
      const caseIsOnsite = ws === "常駐";

      // 完全一致: 100%
      if (caseIsRemote && (userRemote === "remote_only" || userRemote === "any")) {
        factors.location.score = WEIGHTS.location;
        factors.location.details = "リモートマッチ";
      } else if (caseIsHybrid && (userRemote === "hybrid" || userRemote === "any")) {
        factors.location.score = WEIGHTS.location;
        factors.location.details = "ハイブリッドマッチ";
      } else if (caseIsOnsite && (userRemote === "onsite" || userRemote === "any")) {
        factors.location.score = WEIGHTS.location;
        factors.location.details = "常駐マッチ";
      }
      // 部分マッチ: remote希望 ↔ ハイブリッド（60%）
      else if (caseIsHybrid && userRemote === "remote_only") {
        factors.location.score = Math.round(WEIGHTS.location * 0.6);
        factors.location.details = "ハイブリッド（リモート希望）";
      } else if (caseIsRemote && userRemote === "hybrid") {
        factors.location.score = WEIGHTS.location;
        factors.location.details = "フルリモート（ハイブリッド希望）";
      }
      // 部分マッチ: 常駐 ↔ ハイブリッド（40%）
      else if (caseIsOnsite && userRemote === "hybrid") {
        factors.location.score = Math.round(WEIGHTS.location * 0.4);
        factors.location.details = "常駐（ハイブリッド希望）";
      } else if (caseIsHybrid && userRemote === "onsite") {
        factors.location.score = Math.round(WEIGHTS.location * 0.8);
        factors.location.details = "ハイブリッド（常駐希望）";
      }
      // 勤務地マッチ
      else if (userLocations.length > 0) {
        const locationMatch = userLocations.some((loc) =>
          caseData.location?.includes(loc)
        );
        if (locationMatch) {
          factors.location.score = WEIGHTS.location;
          factors.location.details = "勤務地マッチ";
        } else if (userRemote === "any" || userRemote === "hybrid") {
          factors.location.score = Math.round(WEIGHTS.location * 0.5);
          factors.location.details = "一部マッチ";
        }
      }
      // 勤務形態不一致でも最低20%
      else if (!factors.location.score) {
        factors.location.score = Math.round(WEIGHTS.location * 0.2);
        factors.location.details = "勤務形態不一致";
      }
    } else {
      // 案件に勤務地情報がない → 不明なので50%
      factors.location.score = Math.round(WEIGHTS.location * 0.5);
      factors.location.details = "案件情報なし";
    }
  }

  // 6. Occupancy Match (10pts) — 段階的スコアリング
  const caseOccupancy = parseOccupancy(caseData.occupancy);
  const userMinOcc = preferences?.min_occupancy;
  const userMaxOcc = preferences?.max_occupancy;

  if (userMinOcc !== null && userMinOcc !== undefined ||
      userMaxOcc !== null && userMaxOcc !== undefined) {
    factors.occupancy.active = true;
    if (caseOccupancy.min !== null || caseOccupancy.max !== null) {
      const cMin = caseOccupancy.min ?? 0;
      const cMax = caseOccupancy.max ?? 1;
      const uMin = userMinOcc ?? 0;
      const uMax = userMaxOcc ?? 1;

      if (cMax >= uMin && uMax >= cMin) {
        // 完全重複 → 満点
        factors.occupancy.score = WEIGHTS.occupancy;
        factors.occupancy.details = "稼働率マッチ";
      } else {
        // ニアミス: 差分が20%以内なら段階的スコア
        // 例: ユーザー希望100%、案件80% → 差分0.2 → 50%スコア
        const gap = cMax < uMin
          ? uMin - cMax  // 案件が少ない
          : cMin - uMax; // 案件が多い
        if (gap <= 0.2) {
          const nearMissRatio = 1 - gap / 0.2;
          factors.occupancy.score = Math.round(nearMissRatio * WEIGHTS.occupancy * 0.7);
          factors.occupancy.details = `稼働率ニアミス（差${Math.round(gap * 100)}%）`;
        } else {
          factors.occupancy.details = "稼働率不一致";
        }
      }
    } else {
      // 案件に稼働率情報がない → 不明なので50%
      factors.occupancy.score = Math.round(WEIGHTS.occupancy * 0.5);
      factors.occupancy.details = "案件情報なし";
    }
  }

  // Total score — only from active (user-filled) factors
  const scoringFactors = Object.entries(factors)
    .filter(([key, f]) => key !== "must_have" && f.active)
    .map(([, f]) => f);
  const activeMaxWeight = scoringFactors.reduce((sum, f) => sum + (f.max ?? 0), 0);
  const activeScore = scoringFactors.reduce((sum, f) => sum + f.score, 0);

  // Normalize: score out of 100 based on active factors only
  let normalizedScore = activeMaxWeight > 0
    ? Math.round((activeScore / activeMaxWeight) * 100)
    : 0;

  // Must-have gate — なだらかなカーブ（充足率に比例したスコア調整）
  // 旧: 80%未満は一律0.3倍 → 新: 充足率に応じた段階的減額
  // 100% → 1.0倍, 80% → 0.9倍, 60% → 0.7倍, 40% → 0.5倍, 20% → 0.35倍, 0% → 0.25倍
  if (factors.must_have.active && factors.must_have.fulfillment < 1.0) {
    const f = factors.must_have.fulfillment;
    // 線形補間: fulfillment 0.0 → 0.25, fulfillment 1.0 → 1.0
    const multiplier = 0.25 + f * 0.75;
    normalizedScore = Math.round(normalizedScore * multiplier);
  }

  const profileCompleteness = activeMaxWeight / 100;

  return {
    score: normalizedScore,
    factors,
    profileCompleteness,
  };
}
