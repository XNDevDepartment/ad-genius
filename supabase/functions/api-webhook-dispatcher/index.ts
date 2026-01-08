import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  apiKeyId: string
  jobId: string
  jobType: 'ugc' | 'video' | 'fashion'
  eventType: 'job.completed' | 'job.failed'
  userId: string
  data: Record<string, unknown>
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sendWebhook(
  webhookUrl: string,
  webhookSecret: string,
  payload: Record<string, unknown>,
  eventId: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const payloadString = JSON.stringify(payload)
  const signedPayload = `${timestamp}.${payloadString}`
  const signature = await signPayload(signedPayload, webhookSecret)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Event-Id': eventId,
      },
      body: payloadString,
    })

    return {
      success: response.ok,
      statusCode: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body: WebhookPayload = await req.json()
    const { apiKeyId, jobId, jobType, eventType, userId, data } = body

    console.log('[WEBHOOK] Dispatching webhook', { apiKeyId, jobId, jobType, eventType })

    // Get the API key's webhook configuration
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('webhook_url, webhook_secret')
      .eq('id', apiKeyId)
      .single()

    if (keyError || !apiKey?.webhook_url || !apiKey?.webhook_secret) {
      console.log('[WEBHOOK] No webhook configured for API key', apiKeyId)
      return new Response(
        JSON.stringify({ message: 'No webhook configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the webhook payload
    const webhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      job: {
        id: jobId,
        type: jobType,
        status: eventType === 'job.completed' ? 'completed' : 'failed',
      },
      data,
    }

    // Create webhook event record
    const { data: event, error: eventError } = await supabase
      .from('api_webhook_events')
      .insert({
        api_key_id: apiKeyId,
        user_id: userId,
        job_id: jobId,
        job_type: jobType,
        event_type: eventType,
        payload: webhookPayload,
        webhook_url: apiKey.webhook_url,
        status: 'pending',
        attempts: 0,
      })
      .select()
      .single()

    if (eventError) {
      console.error('[WEBHOOK] Failed to create event record', eventError)
      throw eventError
    }

    // Send the webhook with retry logic
    const maxAttempts = 4
    const retryDelays = [0, 60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000] // 0, 1min, 5min, 30min

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        console.log(`[WEBHOOK] Retry attempt ${attempt + 1}/${maxAttempts}`)
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]))
      }

      const result = await sendWebhook(
        apiKey.webhook_url,
        apiKey.webhook_secret,
        webhookPayload,
        event.id
      )

      // Update event record
      await supabase
        .from('api_webhook_events')
        .update({
          attempts: attempt + 1,
          last_attempt_at: new Date().toISOString(),
          last_error: result.error || null,
          status: result.success ? 'sent' : (attempt === maxAttempts - 1 ? 'failed' : 'retrying'),
          delivered_at: result.success ? new Date().toISOString() : null,
          next_retry_at: result.success ? null : 
            (attempt < maxAttempts - 1 ? new Date(Date.now() + retryDelays[attempt + 1]).toISOString() : null),
        })
        .eq('id', event.id)

      if (result.success) {
        console.log('[WEBHOOK] Delivered successfully', { eventId: event.id, statusCode: result.statusCode })
        return new Response(
          JSON.stringify({ success: true, eventId: event.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.warn('[WEBHOOK] Delivery failed', { attempt: attempt + 1, error: result.error })
    }

    console.error('[WEBHOOK] All retry attempts failed', { eventId: event.id })
    return new Response(
      JSON.stringify({ success: false, eventId: event.id, error: 'All retry attempts failed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[WEBHOOK] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
