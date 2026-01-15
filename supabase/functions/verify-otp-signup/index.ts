import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cryptographically secure token generation
function generateVerificationToken(): string {
  // Generate secure random token using crypto API
  return crypto.randomUUID() + '-' + crypto.randomUUID();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, session_id } = await req.json();

    if (!code || !session_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Code and session_id are required',
          code: 'MISSING_FIELDS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the verification record by session_id
    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('phone_verifications')
      .select('*')
      .eq('session_id', session_id)
      .eq('verified', false)
      .is('user_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verification) {
      console.error('[verify-otp-signup] Verification not found:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Verification session not found. Please start the verification process again.',
          code: 'SESSION_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'Your verification code has expired. Please request a new one.',
          code: 'CODE_EXPIRED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Bulkgate
    const applicationId = Deno.env.get('BULKGATE_APPLICATION_ID');
    const applicationToken = Deno.env.get('BULKGATE_APPLICATION_TOKEN');

    if (!applicationId || !applicationToken) {
      console.error('[verify-otp-signup] Missing Bulkgate credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-otp-signup] Verifying OTP for session: ${session_id}`);

    const bulkgateResponse = await fetch('https://portal.bulkgate.com/api/1.0/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        application_id: applicationId,
        application_token: applicationToken,
        id: verification.otp_id,
        code: code,
      }),
    });

    const bulkgateData = await bulkgateResponse.json();
    console.log('[verify-otp-signup] Bulkgate verify response:', JSON.stringify(bulkgateData));

    if (bulkgateData.data?.verified !== true) {
      console.error('[verify-otp-signup] Verification failed:', bulkgateData);
      
      // Parse Bulkgate error type for specific messaging
      const bulkgateError = bulkgateData.error?.type || bulkgateData.data?.error;
      let errorCode = 'INVALID_CODE';
      let errorMessage = 'The code you entered is incorrect. Please check and try again.';
      
      if (bulkgateError === 'expired') {
        errorCode = 'CODE_EXPIRED';
        errorMessage = 'Your verification code has expired. Please request a new one.';
      } else if (bulkgateError === 'attempts_exceeded' || bulkgateError === 'max_attempts') {
        errorCode = 'MAX_ATTEMPTS_EXCEEDED';
        errorMessage = 'Too many incorrect attempts. Please request a new verification code.';
      } else if (bulkgateError === 'already_verified') {
        errorCode = 'CODE_ALREADY_USED';
        errorMessage = 'This code has already been used. Please request a new one.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: errorCode,
          verified: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate cryptographically secure verification token
    const verificationToken = generateVerificationToken();

    // Update the verification record
    const { error: updateError } = await supabaseAdmin
      .from('phone_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        verification_token: verificationToken,
      })
      .eq('id', verification.id);

    if (updateError) {
      console.error('[verify-otp-signup] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update verification status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-otp-signup] Phone verified successfully: ${verification.phone_number.substring(0, 6)}***`);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        phone_number: verification.phone_number,
        verification_token: verificationToken,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-otp-signup] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
