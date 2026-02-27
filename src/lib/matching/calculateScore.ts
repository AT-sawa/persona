import { parseFee, parseOccupancy } from "./parseFee";
import { matchSkills, aggregateSkills } from "./matchSkills";
import type { Case, Profile, UserPreferences, UserExperience } from "@/lib/types";

interface MatchFactors {
  skills: { score: number; max: number; matched: string[]; total: number };
  category: { score: number; max: number; matched: boolean };
  industry: { score: number; max: number; matched: string | null };
  rate: { score: number; max: number; caseRange: string; userRange: string };
  location: { score: number; max: number; details: string };
  occupancy: { score: number; max: number; details: string };
}

interface MatchResult {
  score: number;
  factors: MatchFactors;
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
    skills: { score: 0, max: WEIGHTS.skills, matched: [], total: allSkills.length },
    category: { score: 0, max: WEIGHTS.category, matched: false },
    industry: { score: 0, max: WEIGHTS.industry, matched: null },
    rate: { score: 0, max: WEIGHTS.rate, caseRange: "", userRange: "" },
    location: { score: 0, max: WEIGHTS.location, details: "" },
    occupancy: { score: 0, max: WEIGHTS.occupancy, details: "" },
  };

  // 1. Skills Match (30pts)
  const caseText = [
    caseData.must_req || "",
    caseData.nice_to_have || "",
    caseData.description || "",
    caseData.title || "",
  ].join(" ");

  if (allSkills.length > 0) {
    const { ratio, matched } = matchSkills(allSkills, caseText);
    factors.skills.score = Math.round(ratio * WEIGHTS.skills);
    factors.skills.matched = matched;
  }

  // 2. Category Match (10pts)
  if (preferences?.desired_categories?.length && caseData.category) {
    const match = preferences.desired_categories.some(
      (c) => caseData.category?.includes(c)
    );
    if (match) {
      factors.category.score = WEIGHTS.category;
      factors.category.matched = true;
    }
  } else {
    // No preference set → partial score
    factors.category.score = WEIGHTS.category / 2;
  }

  // 3. Industry Match (15pts)
  if (preferences?.desired_industries?.length && caseData.industry) {
    const matchedIndustry = preferences.desired_industries.find((ind) =>
      caseData.industry?.includes(ind)
    );
    if (matchedIndustry) {
      factors.industry.score = WEIGHTS.industry;
      factors.industry.matched = matchedIndustry;
    }
  } else {
    factors.industry.score = WEIGHTS.industry / 2;
  }

  // 4. Rate Compatibility (20pts)
  const caseFee = parseFee(caseData.fee);
  const userRateMin = preferences?.desired_rate_min ?? profile.hourly_rate_min;
  const userRateMax = preferences?.desired_rate_max ?? profile.hourly_rate_max;

  factors.rate.caseRange = `${caseFee.min ?? "?"}~${caseFee.max ?? "?"}`;
  factors.rate.userRange = `${userRateMin ?? "?"}~${userRateMax ?? "?"}`;

  if (caseFee.min !== null || caseFee.max !== null) {
    if (userRateMin !== null || userRateMax !== null) {
      const cMin = caseFee.min ?? 0;
      const cMax = caseFee.max ?? 9999;
      const uMin = userRateMin ?? 0;
      const uMax = userRateMax ?? 9999;

      // Check overlap
      if (cMax >= uMin && uMax >= cMin) {
        // Full overlap
        const overlapStart = Math.max(cMin, uMin);
        const overlapEnd = Math.min(cMax, uMax);
        const overlapSize = overlapEnd - overlapStart;
        const userRange = uMax - uMin || 1;
        const overlapRatio = Math.min(overlapSize / userRange, 1);
        factors.rate.score = Math.round(overlapRatio * WEIGHTS.rate);
      }
    } else {
      factors.rate.score = WEIGHTS.rate / 2;
    }
  } else {
    factors.rate.score = WEIGHTS.rate / 2;
  }

  // 5. Location/Remote Match (15pts)
  const userRemote = preferences?.remote_preference ?? profile.remote_preference;
  const userLocations = preferences?.preferred_locations ?? [];

  if (caseData.location) {
    // Check remote
    const caseIsRemote =
      caseData.office_days?.includes("フルリモート") ||
      caseData.location?.includes("リモート");

    if (caseIsRemote && (userRemote === "remote_only" || userRemote === "any")) {
      factors.location.score = WEIGHTS.location;
      factors.location.details = "リモートマッチ";
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
    } else {
      factors.location.score = WEIGHTS.location / 2;
      factors.location.details = "条件未設定";
    }
  } else {
    factors.location.score = WEIGHTS.location / 2;
    factors.location.details = "案件情報なし";
  }

  // 6. Occupancy Match (10pts)
  const caseOccupancy = parseOccupancy(caseData.occupancy);
  const userMinOcc = preferences?.min_occupancy;
  const userMaxOcc = preferences?.max_occupancy;

  if (caseOccupancy.min !== null || caseOccupancy.max !== null) {
    if (userMinOcc !== null || userMaxOcc !== null) {
      const cMin = caseOccupancy.min ?? 0;
      const cMax = caseOccupancy.max ?? 1;
      const uMin = userMinOcc ?? 0;
      const uMax = userMaxOcc ?? 1;

      if (cMax >= uMin && uMax >= cMin) {
        factors.occupancy.score = WEIGHTS.occupancy;
        factors.occupancy.details = "稼働率マッチ";
      }
    } else {
      factors.occupancy.score = WEIGHTS.occupancy / 2;
      factors.occupancy.details = "条件未設定";
    }
  } else {
    factors.occupancy.score = WEIGHTS.occupancy / 2;
    factors.occupancy.details = "案件情報なし";
  }

  // Total score
  const totalScore =
    factors.skills.score +
    factors.category.score +
    factors.industry.score +
    factors.rate.score +
    factors.location.score +
    factors.occupancy.score;

  return {
    score: Math.round(totalScore),
    factors,
  };
}
