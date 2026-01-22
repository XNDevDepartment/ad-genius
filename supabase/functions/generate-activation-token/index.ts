import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request): Promise<Response> => {
  console.log("[generate-activation-token] Function invoked");
  console.log("[generate-activation-token] RESEND_API_KEY exists:", !!Deno.env.get("RESEND_API_KEY"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate activation token
    const activationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update profile with activation token
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        activation_token: activationToken,
        activation_token_expires_at: expiresAt.toISOString(),
        account_activated: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile with token:", updateError);
      return new Response(JSON.stringify({ error: "Failed to generate activation token" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user's name from profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const userName = profile?.name || user.user_metadata?.name || "there";

    // Build activation URL
    const activationUrl = `https://produktpix.com/activate?token=${activationToken}`;

    // Send activation email
    console.log("[generate-activation-token] Sending activation email to:", user.email);
    const emailResponse = await resend.emails.send({
      from: "ProduktPix <onboarding@produktpix.com>",
      to: [user.email!],
      subject: "Activate Your ProduktPix Account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
              <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to ProduktPix!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">
                  Hi ${userName},
                </p>
                <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">
                  Thank you for signing up! To unlock all features including <strong>video generation</strong>, please activate your account by clicking the button below.
                </p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${activationUrl}" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Activate My Account
                  </a>
                </p>
                <p style="font-size: 14px; color: #666666; margin-top: 30px;">
                  This activation link will expire in 7 days. If you didn't create an account with ProduktPix, you can safely ignore this email.
                </p>
                <p style="font-size: 14px; color: #666666;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${activationUrl}" style="color: #667eea; word-break: break-all;">${activationUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
                <p style="font-size: 12px; color: #999999; margin: 0;">
                  © ${new Date().getFullYear()} ProduktPix. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("[generate-activation-token] Email response:", JSON.stringify(emailResponse));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Activation email sent",
        expiresAt: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-activation-token:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
