import { supabase } from "@/integrations/supabase/client";

export interface AIScenario {
  idea: string;
  description: string;
  "small-description": string;
}

export interface GenerateScenariosParams {
  audience: string;
  productSpecs?: string;
  language: string;
  imageUrl?: string;
}

/**
 * Generate UGC scenario ideas using Claude Sonnet via OpenRouter
 * This is a stateless API call - no thread management needed
 */
export async function generateScenarios(
  params: GenerateScenariosParams
): Promise<AIScenario[]> {
  const { data, error } = await supabase.functions.invoke("scenario-generate", {
    body: params,
  });

  if (error) {
    console.error("[scenario-api] Error generating scenarios:", error);
    throw new Error(error.message || "Failed to generate scenarios");
  }

  if (data.error) {
    console.error("[scenario-api] API error:", data.error);
    throw new Error(data.error);
  }

  if (!data.scenarios || !Array.isArray(data.scenarios)) {
    console.error("[scenario-api] Invalid response:", data);
    throw new Error("Invalid response from scenario generator");
  }

  return data.scenarios;
}
