import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'invalid_email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract domain from email
    const emailLower = email.toLowerCase().trim();
    const domain = emailLower.split('@')[1];

    if (!domain) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'invalid_email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[validate-signup-domain] Checking domain: ${domain}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Check if domain is in domain_rules table
    const { data: domainRule, error: ruleError } = await supabase
      .from('domain_rules')
      .select('rule_type, description')
      .eq('domain', domain)
      .single();

    if (ruleError && ruleError.code !== 'PGRST116') {
      console.error('[validate-signup-domain] Error checking domain rules:', ruleError);
    }

    // If domain is explicitly blocked
    if (domainRule?.rule_type === 'blocked') {
      console.log(`[validate-signup-domain] Domain ${domain} is blocked: ${domainRule.description}`);
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'domain_blocked',
          message: 'This email domain is not allowed for registration.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If domain is in allowed list (public email providers), allow unlimited accounts
    if (domainRule?.rule_type === 'allowed') {
      console.log(`[validate-signup-domain] Domain ${domain} is in allowed list`);
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: For custom/corporate domains not in rules, check if there's already an account
    console.log(`[validate-signup-domain] Domain ${domain} is custom/corporate, checking existing accounts`);

    // Query profiles to find existing accounts with this domain
    const { data: existingProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .ilike('email', `%@${domain}`);

    if (profileError) {
      console.error('[validate-signup-domain] Error checking existing profiles:', profileError);
      // On error, allow signup (fail open to not block legitimate users)
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If there's already an account with this domain, block new signups
    if (existingProfiles && existingProfiles.length > 0) {
      console.log(`[validate-signup-domain] Domain ${domain} already has ${existingProfiles.length} account(s)`);
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'domain_limit_reached',
          message: 'An account already exists with this email domain. For additional accounts, please contact info@produktpix.com'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No existing account with this domain, allow signup
    console.log(`[validate-signup-domain] Domain ${domain} is new, allowing signup`);
    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[validate-signup-domain] Error:', error);
    // On unexpected error, allow signup (fail open)
    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});