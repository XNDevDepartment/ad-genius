import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, session_id } = await req.json();

    if (!phone_number || !session_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Phone number and session_id are required',
          code: 'MISSING_FIELDS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format (basic check)
    const cleanPhone = phone_number.replace(/\s+/g, '');
    if (!/^\+?\d{9,15}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ 
          error: 'Please enter a valid phone number with country code (e.g., +351912345678)',
          code: 'INVALID_PHONE_FORMAT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Rate limiting: Check for recent OTP requests from this phone (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentRequests, error: countError } = await supabaseAdmin
      .from('phone_verifications')
      .select('id')
      .eq('phone_number', cleanPhone)
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('[send-otp-signup] Rate limit check error:', countError);
    } else if (recentRequests && recentRequests.length >= 3) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many verification attempts. Please wait before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 3600
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via Bulkgate
    const applicationId = Deno.env.get('BULKGATE_APPLICATION_ID');
    const applicationToken = Deno.env.get('BULKGATE_APPLICATION_TOKEN');

    if (!applicationId || !applicationToken) {
      console.error('[send-otp-signup] Missing Bulkgate credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-otp-signup] Sending OTP to ${cleanPhone.substring(0, 6)}***`);

    const bulkgateResponse = await fetch('https://portal.bulkgate.com/api/1.0/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        application_id: applicationId,
        application_token: applicationToken,
        number: cleanPhone,
        text: 'Your ProduktPix verification code is <code>. Valid for 10 minutes.',
        code_type: 'int',
        code_length: 6,
        expiration: 600, // 10 minutes
        sender_id: 'gText',
        sender_id_value: 'ProduktPix',
        request_quota_identification: cleanPhone,
      }),
    });

    const bulkgateData = await bulkgateResponse.json();
    console.log('[send-otp-signup] Bulkgate response:', JSON.stringify(bulkgateData));

    if (bulkgateData.data?.message?.status !== 'accepted') {
      console.error('[send-otp-signup] Bulkgate error:', bulkgateData);
      
      // Check for specific Bulkgate error types
      const bulkgateError = bulkgateData.error?.type || bulkgateData.data?.error;
      let errorCode = 'SMS_FAILED';
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (bulkgateError === 'invalid_number' || bulkgateError === 'invalid_recipient') {
        errorCode = 'INVALID_PHONE_FORMAT';
        errorMessage = 'This phone number is invalid. Please check and try again.';
      } else if (bulkgateError === 'quota_exceeded' || bulkgateError === 'rate_limit') {
        errorCode = 'RATE_LIMIT_EXCEEDED';
        errorMessage = 'Too many verification attempts. Please wait before trying again.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: errorCode
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otpId = bulkgateData.data?.id;

    // Store the verification attempt (user_id is NULL for signup flow)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    
    const { error: insertError } = await supabaseAdmin
      .from('phone_verifications')
      .insert({
        phone_number: cleanPhone,
        otp_id: otpId,
        session_id: session_id,
        expires_at: expiresAt,
        verified: false,
        user_id: null,
      });

    if (insertError) {
      console.error('[send-otp-signup] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store verification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-otp-signup] OTP sent successfully, session: ${session_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent',
        expires_in: 600
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-otp-signup] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
