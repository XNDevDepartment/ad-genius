// API client for Genius Agent functionality
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = "https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/genius-agent";

export interface GeniusAgentConfig {
  id?: string;
  user_id?: string;
  is_active: boolean;
  audiences: string[];
  schedule_days: number[];
  schedule_hours: number[];
  content_per_run: number;
  preferred_style: string;
  highlight_product: string;
  created_at?: string;
  updated_at?: string;
}

export interface GeniusAgentJob {
  id: string;
  user_id: string;
  config_id: string | null;
  source_image_id: string | null;
  audience: string;
  prompt: string;
  status: string;
  image_job_id: string | null;
  result_url: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  source_images?: {
    file_name: string;
    public_url: string;
  };
  profiles?: {
    email: string;
    name: string;
  };
}

async function callApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, ...payload })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export const geniusAgentApi = {
  /**
   * Get user's agent configuration
   */
  async getConfig(): Promise<GeniusAgentConfig | null> {
    const result = await callApi<{ config: GeniusAgentConfig | null }>("getConfig");
    return result.config;
  },

  /**
   * Save or update user's agent configuration
   */
  async saveConfig(config: Partial<GeniusAgentConfig>): Promise<GeniusAgentConfig> {
    const result = await callApi<{ config: GeniusAgentConfig; success: boolean }>("saveConfig", { config });
    return result.config;
  },

  /**
   * Get user's agent job history
   */
  async getHistory(limit = 50): Promise<GeniusAgentJob[]> {
    const result = await callApi<{ jobs: GeniusAgentJob[] }>("getAgentHistory", { limit });
    return result.jobs;
  },

  /**
   * Get all configs (admin only)
   */
  async getAllConfigs(): Promise<(GeniusAgentConfig & { profiles?: { email: string; name: string } })[]> {
    const result = await callApi<{ configs: (GeniusAgentConfig & { profiles?: { email: string; name: string } })[] }>("getAllConfigs");
    return result.configs;
  },

  /**
   * Get all jobs (admin only)
   */
  async getAllJobs(limit = 100): Promise<GeniusAgentJob[]> {
    const result = await callApi<{ jobs: GeniusAgentJob[] }>("getAllJobs", { limit });
    return result.jobs;
  }
};
