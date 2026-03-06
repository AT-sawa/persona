import { parseFee, parseOccupancy } from "./parseFee";
import { matchSkills, aggregateSkills } from "./matchSkills";
import type { Case, Profile, UserPreferences, UserExperience } from "@/lib/types";

interface MatchFactors {
  skills: { score: number; max: number; matched: string[]; total: number; active: boolean };
  category: { score: number; max: number; matched: boolean; active: boolean };
  industry: { score: number; max: number; matched: string | null; active: boolean };
  rate: { score: number; max: number; caseRange: string; userRange: string; active: boolean };
  location: { score: number; max: number; details: string; active: boolean };
  occupancy: { score: number; max: number; details: string; active: boolean };
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
  };

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

  // 4. Rate Compatibility (20pts) — active only if user set rate preferences
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
        const overlapStart = Math.max(cMin, uMin);
        const overlapEnd = Math.min(cMax, uMax);
        const overlapSize = overlapEnd - overlapStart;
        const userRange = uMax - uMin || 1;
        const overlapRatio = Math.min(overlapSize / userRange, 1);
        factors.rate.score = Math.round(overlapRatio * WEIGHTS.rate);
      }
    }
  }

  // 5. Location/Remote Match (15pts) — active only if user set location prefs
  const userRemote = preferences?.remote_preference ?? profile.remote_preference;
  const userLocations = preferences?.preferred_locations ?? [];

  if (userRemote || userLocations.length > 0) {
    factors.location.active = true;
    if (caseData.location || caseData.work_style) {
      // Prefer structured work_style, fall back to keyword matching
      const ws = caseData.work_style;
      const caseIsRemote = ws === "フルリモート" ||
        ws === "ミーティング出社" ||
        (!ws && (caseData.office_days?.includes("フルリモート") || caseData.location?.includes("リモート")));
      const caseIsHybrid = ws === "一部リモート" ||
        (!ws && caseData.office_days?.includes("一部リモート"));
      const caseIsOnsite = ws === "常駐";

      if (caseIsRemote && (userRemote === "remote_only" || userRemote === "any")) {
        factors.location.score = WEIGHTS.location;
        factors.location.details = "リモートマッチ";
      } else if (caseIsHybrid && (userRemote === "hybrid" || userRemote === "any")) {
        factors.location.score = WEIGHTS.location;
        factors.location.details = "ハイブリッドマッチ";
      } else if (caseIsOnsite && (userRemote === "onsite" || userRemote === "any")) {
        factors.location.score = WEIGHTS.location;
        factors.location.details = "常駐マッチ";
      } else if (userLocations.length > 0) {
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
    } else {
      factors.location.details = "案件情報なし";
    }
  }

  // 6. Occupancy Match (10pts) — active only if user set occupancy prefs
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
        factors.occupancy.score = WEIGHTS.occupancy;
        factors.occupancy.details = "稼働率マッチ";
      }
    } else {
      factors.occupancy.details = "案件情報なし";
    }
  }

  // Total score — only from active (user-filled) factors
  const activeFactors = Object.values(factors).filter((f) => f.active);
  const activeMaxWeight = activeFactors.reduce((sum, f) => sum + f.max, 0);
  const activeScore = activeFactors.reduce((sum, f) => sum + f.score, 0);

  // Normalize: score out of 100 based on active factors only
  // If no factors are active (empty profile), score = 0
  const normalizedScore = activeMaxWeight > 0
    ? Math.round((activeScore / activeMaxWeight) * 100)
    : 0;

  const profileCompleteness = activeMaxWeight / 100;

  return {
    score: normalizedScore,
    factors,
    profileCompleteness,
  };
}
