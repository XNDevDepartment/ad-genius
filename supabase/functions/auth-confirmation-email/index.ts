import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

interface ConfirmationEmailRequest {
  email: string;
  confirmationUrl: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[auth-confirmation-email] Function called, RESEND_API_KEY exists:", !!Deno.env.get("RESEND_API_KEY"));
    
    const { email, confirmationUrl, name }: ConfirmationEmailRequest = await req.json();
    console.log("[auth-confirmation-email] Sending to:", email);

    const emailResponse = await resend.emails.send({
      from: "ProduktPix <onboarding@produktpix.com>",
      to: [email],
      subject: "Welcome to ProduktPix - Confirm Your Account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm Your Account</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to ProduktPix!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #333; margin-top: 0; font-size: 24px;">Hi${name ? ` ${name}` : ''}! 👋</h2>
              
              <p style="font-size: 16px; margin-bottom: 24px;">
                Thank you for joining ProduktPix! We're excited to have you on board. To get started with creating amazing AI-generated product images, please confirm your email address.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${confirmationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; transition: transform 0.2s;">
                  Confirm Your Email Address
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 32px;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="font-size: 14px; color: #667eea; word-break: break-all; background: #f8f9fa; padding: 12px; border-radius: 4px; border-left: 4px solid #667eea;">
                ${confirmationUrl}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 32px 0;">
              
              <div style="font-size: 14px; color: #666;">
                <p><strong>What's next?</strong></p>
                <ul style="padding-left: 20px;">
                  <li>Generate stunning product images with AI</li>
                  <li>Customize your brand settings</li>
                  <li>Export high-quality images for your store</li>
                </ul>
              </div>
              
              <p style="font-size: 12px; color: #999; margin-top: 32px; text-align: center;">
                If you didn't create an account with ProduktPix, you can safely ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>© 2024 ProduktPix. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in auth-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);