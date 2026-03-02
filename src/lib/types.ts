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
  location: string | null;
  must_req: string | null;
  nice_to_have: string | null;
  flow: string | null;
  status: string | null;
  published_at: string | null;
  created_at: string | null;
  is_active: boolean;
  // Dedup / source tracking
  source: string | null;
  source_url: string | null;
  synced_at: string | null;
  title_normalized: string | null;
  source_hash: string | null;
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
