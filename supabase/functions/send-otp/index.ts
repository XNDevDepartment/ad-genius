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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone_number } = await req.json();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format (basic validation)
    const cleanedPhone = phone_number.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    if (cleanedPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending OTP to ${cleanedPhone} for user ${user.id}`);

    // Get Bulkgate credentials
    const applicationId = Deno.env.get('BULKGATE_APPLICATION_ID');
    const applicationToken = Deno.env.get('BULKGATE_APPLICATION_TOKEN');

    if (!applicationId || !applicationToken) {
      console.error('Missing Bulkgate credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send OTP via Bulkgate
    const bulkgateResponse = await fetch('https://portal.bulkgate.com/api/1.0/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        application_id: applicationId,
        application_token: applicationToken,
        number: cleanedPhone,
        code_type: 'int',
        code_length: 6,
        expiration: 300, // 5 minutes
        sender_id: 'gText',
        sender_id_value: 'ProduktPix',
        text: 'Your ProduktPix verification code is <code>. Valid for 5 minutes.',
        language: 'en',
      }),
    });

    const bulkgateData = await bulkgateResponse.json();
    console.log('Bulkgate response:', JSON.stringify(bulkgateData));

    if (bulkgateData.error || bulkgateData.type === 'error') {
      console.error('Bulkgate error:', bulkgateData);
      return new Response(
        JSON.stringify({ 
          error: bulkgateData.message || 'Failed to send OTP',
          details: bulkgateData.error 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Store the OTP verification attempt
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    const { error: insertError } = await supabaseAdmin
      .from('phone_verifications')
      .insert({
        user_id: user.id,
        phone_number: cleanedPhone,
        otp_id: bulkgateData.data?.id || null,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error storing verification record:', insertError);
      // Don't fail the request, OTP was already sent
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP sent successfully',
        expires_in: 300 // seconds
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
