import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Activation token is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find profile with this token
    const { data: profile, error: findError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, activation_token_expires_at, account_activated")
      .eq("activation_token", token)
      .single();

    if (findError || !profile) {
      console.error("Token not found:", findError);
      return new Response(JSON.stringify({ 
        error: "Invalid activation token",
        code: "INVALID_TOKEN"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if already activated
    if (profile.account_activated) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Account is already activated",
        alreadyActivated: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if token expired
    if (profile.activation_token_expires_at) {
      const expiresAt = new Date(profile.activation_token_expires_at);
      if (expiresAt < new Date()) {
        return new Response(JSON.stringify({ 
          error: "Activation token has expired. Please request a new activation email.",
          code: "TOKEN_EXPIRED"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Activate the account
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        account_activated: false,
        activation_token: null,
        activation_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error activating account:", updateError);
      return new Response(JSON.stringify({ error: "Failed to activate account" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Account activated for user ${profile.id} (${profile.email})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account activated successfully! You now have full access to all features."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in activate-account:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
