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

    const { phone_number, code } = await req.json();
    
    if (!phone_number || !code) {
      return new Response(
        JSON.stringify({ error: 'Phone number and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanedPhone = phone_number.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    console.log(`Verifying OTP for ${cleanedPhone}, user ${user.id}`);

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

    // Verify OTP via Bulkgate
    const bulkgateResponse = await fetch('https://portal.bulkgate.com/api/1.0/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        application_id: applicationId,
        application_token: applicationToken,
        number: cleanedPhone,
        code: code,
      }),
    });

    const bulkgateData = await bulkgateResponse.json();
    console.log('Bulkgate verify response:', JSON.stringify(bulkgateData));

    // Check if verification was successful
    const isVerified = bulkgateData.data?.verified === true || bulkgateData.data?.status === 'verified';

    if (!isVerified) {
      console.log('OTP verification failed:', bulkgateData);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired code',
          verified: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Update the verification record
    const { error: updateVerificationError } = await supabaseAdmin
      .from('phone_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('phone_number', cleanedPhone)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updateVerificationError) {
      console.error('Error updating verification record:', updateVerificationError);
    }

    // Update the user's profile with verified phone
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone_number: cleanedPhone,
        phone_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Phone ${cleanedPhone} verified successfully for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        verified: true,
        message: 'Phone number verified successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
