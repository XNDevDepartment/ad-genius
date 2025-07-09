
import { supabase } from '@/integrations/supabase/client';

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

// Export the supabase client from the integrated client
export { supabase };
