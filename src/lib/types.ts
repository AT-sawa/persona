export interface Case {
  id: string;
  case_no: string | null;
  title: string;
  category: string | null;
  background: string | null;
  description: string | null;
  industry: string | null;
  start_date: string | null;
  extendable: string | null;
  occupancy: string | null;
  fee: string | null;
  office_days: string | null;
  // Work style (フルリモート | 一部リモート | 常駐 | ミーティング出社)
  work_style: string | null;
  location: string | null;
  must_req: string | null;
  nice_to_have: string | null;
  flow: string | null;
  status: string | null;
  published_at: string | null;
  created_at: string | null;
  is_active: boolean;
  // Client company (admin-only, hidden from users)
  client_company: string | null;
  // Commercial flow / 商流 (admin-only, hidden from users)
  commercial_flow: string | null;
  // Dedup / source tracking
  source: string | null;
  source_url: string | null;
  synced_at: string | null;
  title_normalized: string | null;
  source_hash: string | null;
  // Email intake tracking
  email_intake_id: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  background: string | null;
  skills: string[] | null;
  avatar_url: string | null;
  bio: string | null;
  years_experience: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  linkedin_url: string | null;
  available_from: string | null;
  prefecture: string | null;
  remote_preference: "remote_only" | "hybrid" | "onsite" | "any" | null;
  profile_complete: boolean;
  is_admin: boolean;
  is_looking: boolean;
  is_client: boolean;
  company_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Entry {
  id: string;
  case_id: string;
  user_id: string;
  status: string;
  message: string | null;
  resume_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  desired_rate_min: number | null;
  desired_rate_max: number | null;
  desired_industries: string[] | null;
  desired_categories: string[] | null;
  desired_roles: string[] | null;
  preferred_locations: string[] | null;
  remote_preference: "remote_only" | "hybrid" | "onsite" | "any" | null;
  min_occupancy: number | null;
  max_occupancy: number | null;
  available_from: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserExperience {
  id: string;
  user_id: string;
  company_name: string;
  role: string;
  industry: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  skills_used: string[] | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  is_primary: boolean;
  uploaded_at: string | null;
}

export interface MatchingResult {
  id: string;
  case_id: string;
  user_id: string;
  score: number;
  factors: Record<string, unknown>;
  is_notified: boolean;
  matched_at: string | null;
  semantic_score: number | null;
  llm_reasoning: string | null;
  cases?: Case;
}

export interface Favorite {
  id: string;
  user_id: string;
  case_id: string;
  created_at: string | null;
  cases?: Case;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "info" | "matching" | "entry" | "system";
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string | null;
}

export interface PerkCategory {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Perk {
  id: string;
  category_id: string;
  title: string;
  provider: string | null;
  description: string | null;
  benefit_summary: string | null;
  details: string | null;
  how_to_use: string | null;
  external_url: string | null;
  image_url: string | null;
  tier: "standard" | "gold" | "platinum";
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string | null;
  updated_at: string | null;
  perk_categories?: PerkCategory;
}

export interface SeoKeyword {
  id: string;
  keyword: string;
  target_url: string | null;
  is_primary: boolean;
  created_at: string | null;
}

export interface SeoSnapshot {
  id: string;
  keyword_id: string;
  position: number | null;
  clicks: number;
  impressions: number;
  ctr: number;
  snapshot_date: string;
  source: string;
  created_at: string | null;
}

// ============================================
// Proposal Portal types
// ============================================

export interface Proposal {
  id: string;
  case_id: string;
  client_id: string;
  title: string;
  message: string | null;
  status: "draft" | "sent" | "viewed" | "responded" | "closed";
  sent_at: string | null;
  viewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (optional)
  cases?: Case;
  profiles?: Pick<Profile, "id" | "full_name" | "email" | "company_name">;
  proposal_talents?: ProposalTalent[];
}

export interface ProposalTalent {
  id: string;
  proposal_id: string;
  profile_id: string | null;
  external_talent_id: string | null;
  display_label: string;
  sort_order: number;
  client_fee: number | null;
  internal_cost: number | null;
  internal_note: string | null;
  summary_position: string | null;
  summary_experience: string | null;
  summary_skills: string[] | null;
  summary_background: string | null;
  summary_work_style: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (optional)
  proposal_reactions?: ProposalReaction[];
}

export interface ProposalReaction {
  id: string;
  proposal_talent_id: string;
  client_id: string;
  reaction: "interested" | "pass";
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalMessage {
  id: string;
  proposal_id: string;
  sender_id: string;
  body: string;
  is_admin: boolean;
  created_at: string;
  // Joined relations (optional)
  profiles?: Pick<Profile, "id" | "full_name" | "company_name">;
}
