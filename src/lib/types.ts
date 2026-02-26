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
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  background: string | null;
  skills: string[] | null;
  created_at: string | null;
}

export interface Entry {
  id: string;
  case_id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string | null;
}
