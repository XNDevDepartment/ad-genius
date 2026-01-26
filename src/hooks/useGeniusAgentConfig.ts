// Hook for managing Genius Agent configuration
import { useState, useEffect, useCallback } from "react";
import { geniusAgentApi, GeniusAgentConfig, GeniusAgentJob } from "@/api/genius-agent-api";
import { useToast } from "@/hooks/use-toast";

export function useGeniusAgentConfig() {
  const [config, setConfig] = useState<GeniusAgentConfig | null>(null);
  const [history, setHistory] = useState<GeniusAgentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await geniusAgentApi.getConfig();
      setConfig(result || getDefaultConfig());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load configuration";
      setError(message);
      console.error("[useGeniusAgentConfig] Error fetching config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (limit = 50) => {
    try {
      const jobs = await geniusAgentApi.getHistory(limit);
      setHistory(jobs);
    } catch (err) {
      console.error("[useGeniusAgentConfig] Error fetching history:", err);
    }
  }, []);

  const saveConfig = useCallback(async (updates: Partial<GeniusAgentConfig>) => {
    try {
      setSaving(true);
      setError(null);
      
      const updatedConfig = { ...config, ...updates };
      const result = await geniusAgentApi.saveConfig(updatedConfig);
      setConfig(result);
      
      toast({
        title: "Configuration Saved",
        description: "Your Genius Agent settings have been updated.",
      });
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save configuration";
      setError(message);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: message,
      });
      throw err;
    } finally {
      setSaving(false);
    }
  }, [config, toast]);

  const toggleActive = useCallback(async () => {
    if (!config) return;
    await saveConfig({ is_active: !config.is_active });
  }, [config, saveConfig]);

  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, [fetchConfig, fetchHistory]);

  return {
    config,
    history,
    loading,
    saving,
    error,
    saveConfig,
    toggleActive,
    refetch: fetchConfig,
    refetchHistory: fetchHistory
  };
}

function getDefaultConfig(): GeniusAgentConfig {
  return {
    is_active: false,
    audiences: [],
    schedule_days: [],
    schedule_hours: [],
    content_per_run: 1,
    preferred_style: 'lifestyle',
    highlight_product: 'yes'
  };
}
