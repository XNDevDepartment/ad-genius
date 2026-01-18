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
    const { email, password, name, phone_number, verification_token } = await req.json();

    // Validate required fields with detailed logging
    const missingFields: string[] = [];
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!phone_number) missingFields.push('phone_number');
    if (!verification_token) missingFields.push('verification_token');
    
    if (missingFields.length > 0) {
      console.error(`[signup-with-phone] Missing required fields: ${missingFields.join(', ')}`);
      return new Response(
        JSON.stringify({ 
          error: 'Email, password, phone number, and verification token are required',
          missing: missingFields 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Validate the verification token
    console.log(`[signup-with-phone] Validating verification token for phone: ${phone_number.substring(0, 6)}***`);
    
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('phone_verifications')
      .select('*')
      .eq('verification_token', verification_token)
      .eq('phone_number', phone_number)
      .eq('verified', true)
      .is('user_id', null) // Not yet linked to a user
      .single();

    if (verifyError || !verification) {
      console.error('[signup-with-phone] Invalid or expired verification token:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification token. Please verify your phone again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if verification is expired (tokens valid for 30 minutes after verification)
    const verifiedAt = new Date(verification.verified_at);
    const now = new Date();
    const minutesSinceVerification = (now.getTime() - verifiedAt.getTime()) / (1000 * 60);
    
    if (minutesSinceVerification > 30) {
      console.error('[signup-with-phone] Verification token expired (>30 min old)');
      return new Response(
        JSON.stringify({ error: 'Verification expired. Please verify your phone again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Check if phone number is already used by another account
    console.log('[signup-with-phone] Checking phone number uniqueness...');
    
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('phone_number', phone_number)
      .maybeSingle();

    if (existingProfile) {
      console.error('[signup-with-phone] Phone number already in use by:', existingProfile.email);
      return new Response(
        JSON.stringify({ 
          error: 'This phone number is already associated with another account. Please use a different phone number or sign in to your existing account.',
          code: 'PHONE_ALREADY_USED'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Check if email is already registered
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      console.error('[signup-with-phone] Email already registered:', email);
      return new Response(
        JSON.stringify({ 
          error: 'This email is already registered. Please sign in or use a different email.',
          code: 'EMAIL_ALREADY_USED'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Create the user account
    console.log('[signup-with-phone] Creating user account...');
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email since phone is verified
      user_metadata: {
        name: name,
        phone_number: phone_number,
        phone_verified: true,
      }
    });

    if (createError || !newUser?.user) {
      console.error('[signup-with-phone] Failed to create user:', createError);
      return new Response(
        JSON.stringify({ error: createError?.message || 'Failed to create account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;
    console.log(`[signup-with-phone] User created with ID: ${userId}`);

    // Step 5: Update profile with phone number
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone_number: phone_number,
        phone_verified: true,
        name: name,
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.warn('[signup-with-phone] Profile update warning:', profileUpdateError);
      // Non-fatal, profile trigger might handle this
    }

    // Step 6: Link verification record to user
    const { error: linkError } = await supabaseAdmin
      .from('phone_verifications')
      .update({
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    if (linkError) {
      console.warn('[signup-with-phone] Verification link warning:', linkError);
      // Non-fatal
    }

    // Step 7: Create subscriber record for free tier
    const { error: subscriberError } = await supabaseAdmin
      .from('subscribers')
      .upsert({
        user_id: userId,
        email: email,
        subscription_tier: 'Free',
        credits_balance: 10,
        subscribed: false,
      }, {
        onConflict: 'user_id'
      });

    if (subscriberError) {
      console.warn('[signup-with-phone] Subscriber creation warning:', subscriberError);
    }

    console.log(`[signup-with-phone] Account created successfully for: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: email,
        message: 'Account created successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[signup-with-phone] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
