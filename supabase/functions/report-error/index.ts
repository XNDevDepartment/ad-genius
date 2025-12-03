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
    const body = await req.json();
    
    const {
      user_id,
      user_email,
      error_message,
      error_stack,
      page_url,
      user_agent,
      metadata
    } = body;

    // Validate required fields
    if (!error_message || !page_url) {
      console.error('[report-error] Missing required fields:', { error_message: !!error_message, page_url: !!page_url });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for insert
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert error report
    const { data, error } = await supabase
      .from('error_reports')
      .insert({
        user_id: user_id || null,
        user_email: user_email || null,
        error_message,
        error_stack: error_stack || null,
        page_url,
        user_agent: user_agent || null,
        metadata: metadata || {}
      })
      .select('id')
      .single();

    if (error) {
      console.error('[report-error] Database insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save error report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[report-error] Error report saved:', {
      id: data.id,
      user_id,
      page_url,
      error_message: error_message.substring(0, 100)
    });

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[report-error] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
