import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateApiKey(): string {
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  const base64 = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return `pk_live_${base64}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  // Get user from auth header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { action } = body

    switch (action) {
      case 'create': {
        const { name, permissions = ['ugc', 'video', 'fashion_catalog'], expires_at } = body

        if (!name || name.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: 'API key name is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if user already has too many API keys (limit: 10)
        const { count } = await supabaseClient
          .from('api_keys')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if (count !== null && count >= 10) {
          return new Response(
            JSON.stringify({ error: 'Maximum number of API keys reached (10)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate new API key
        const apiKey = generateApiKey()
        const keyHash = await hashApiKey(apiKey)
        const keyPrefix = apiKey.substring(0, 16) + '...'

        // Get user's subscription tier for rate limiting
        const { data: subscriber } = await supabaseClient
          .from('subscribers')
          .select('subscription_tier')
          .eq('user_id', user.id)
          .single()

        const rateLimitTier = (subscriber?.subscription_tier || 'Free').toLowerCase()

        // Insert API key
        const { data: insertedKey, error: insertError } = await supabaseClient
          .from('api_keys')
          .insert({
            user_id: user.id,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            name: name.trim(),
            permissions: permissions,
            rate_limit_tier: rateLimitTier,
            expires_at: expires_at || null
          })
          .select('id, key_prefix, name, permissions, rate_limit_tier, created_at, expires_at')
          .single()

        if (insertError) throw insertError

        return new Response(
          JSON.stringify({
            success: true,
            api_key: apiKey, // Only shown once!
            key_info: insertedKey,
            message: 'API key created. Save this key securely - it will not be shown again.'
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list': {
        const { data: keys, error } = await supabaseClient
          .from('api_keys')
          .select('id, key_prefix, name, permissions, is_active, rate_limit_tier, last_used_at, created_at, expires_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        return new Response(
          JSON.stringify({ keys }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'revoke': {
        const { key_id } = body

        if (!key_id) {
          return new Response(
            JSON.stringify({ error: 'key_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabaseClient
          .from('api_keys')
          .update({ is_active: false })
          .eq('id', key_id)
          .eq('user_id', user.id)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, message: 'API key revoked' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete': {
        const { key_id } = body

        if (!key_id) {
          return new Response(
            JSON.stringify({ error: 'key_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabaseClient
          .from('api_keys')
          .delete()
          .eq('id', key_id)
          .eq('user_id', user.id)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true, message: 'API key deleted' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'rotate': {
        const { key_id } = body

        if (!key_id) {
          return new Response(
            JSON.stringify({ error: 'key_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get existing key info
        const { data: existingKey, error: fetchError } = await supabaseClient
          .from('api_keys')
          .select('name, permissions, rate_limit_tier, expires_at')
          .eq('id', key_id)
          .eq('user_id', user.id)
          .single()

        if (fetchError || !existingKey) {
          return new Response(
            JSON.stringify({ error: 'API key not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Revoke old key
        await supabaseClient
          .from('api_keys')
          .update({ is_active: false })
          .eq('id', key_id)

        // Generate new key
        const newApiKey = generateApiKey()
        const newKeyHash = await hashApiKey(newApiKey)
        const newKeyPrefix = newApiKey.substring(0, 16) + '...'

        const { data: newKey, error: insertError } = await supabaseClient
          .from('api_keys')
          .insert({
            user_id: user.id,
            key_hash: newKeyHash,
            key_prefix: newKeyPrefix,
            name: existingKey.name + ' (rotated)',
            permissions: existingKey.permissions,
            rate_limit_tier: existingKey.rate_limit_tier,
            expires_at: existingKey.expires_at
          })
          .select('id, key_prefix, name, permissions, rate_limit_tier, created_at, expires_at')
          .single()

        if (insertError) throw insertError

        return new Response(
          JSON.stringify({
            success: true,
            api_key: newApiKey,
            key_info: newKey,
            message: 'API key rotated. Old key has been revoked. Save this new key securely.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'usage': {
        const { key_id, days = 30 } = body

        if (!key_id) {
          return new Response(
            JSON.stringify({ error: 'key_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify key belongs to user
        const { data: keyCheck } = await supabaseClient
          .from('api_keys')
          .select('id')
          .eq('id', key_id)
          .eq('user_id', user.id)
          .single()

        if (!keyCheck) {
          return new Response(
            JSON.stringify({ error: 'API key not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get usage stats
        const { data: usageLogs, error } = await supabaseClient
          .from('api_usage_logs')
          .select('endpoint, method, status_code, credits_used, response_time_ms, created_at')
          .eq('api_key_id', key_id)
          .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1000)

        if (error) throw error

        // Calculate summary stats
        const summary = {
          total_requests: usageLogs?.length || 0,
          total_credits_used: usageLogs?.reduce((sum, log) => sum + (log.credits_used || 0), 0) || 0,
          avg_response_time: usageLogs?.length 
            ? Math.round(usageLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / usageLogs.length)
            : 0,
          success_rate: usageLogs?.length
            ? Math.round((usageLogs.filter(log => log.status_code < 400).length / usageLogs.length) * 100)
            : 0,
          endpoints: {} as Record<string, number>
        }

        usageLogs?.forEach(log => {
          summary.endpoints[log.endpoint] = (summary.endpoints[log.endpoint] || 0) + 1
        })

        return new Response(
          JSON.stringify({ summary, recent_logs: usageLogs?.slice(0, 50) }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('API Keys error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
