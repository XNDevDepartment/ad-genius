
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database schema types
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  profile_picture?: string;
  profession?: string;
  account_id: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
