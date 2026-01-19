import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ApiKeyValidation {
  api_key_id: string
  user_id: string
  permissions: string[]
  rate_limit_tier: string
  is_valid: boolean
}

interface RateLimitResult {
  allowed: boolean
  reason?: string
  retry_after?: number
  limit?: number
  remaining_minute?: number
  remaining_hour?: number
  remaining_day?: number
}

// Credit costs for different operations
const CREDIT_COSTS = {
  'ugc_generate': 1,
  'video_create_5': 5,
  'video_create_10': 10,
  'fashion_swap': 1,
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Extract API key from header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key', code: 'MISSING_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash the API key for lookup
    const keyHash = await hashApiKey(apiKey)

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .rpc('validate_api_key', { p_key_hash: keyHash })

    if (keyError || !keyData || keyData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKeyInfo: ApiKeyValidation = keyData[0]

    if (!apiKeyInfo.is_valid) {
      return new Response(
        JSON.stringify({ error: 'API key is inactive or expired', code: 'API_KEY_INACTIVE' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limits
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_api_key_id: apiKeyInfo.api_key_id,
        p_rate_limit_tier: apiKeyInfo.rate_limit_tier
      })

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError)
      return new Response(
        JSON.stringify({ error: 'Rate limit check failed', code: 'RATE_LIMIT_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rateLimit: RateLimitResult = rateLimitData

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          reason: rateLimit.reason,
          retry_after: rateLimit.retry_after,
          limit: rateLimit.limit
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retry_after || 60)
          }
        }
      )
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const endpoint = body.endpoint || ''
    const method = req.method

    // Check permissions
    let requiredPermission = ''
    if (endpoint.startsWith('/v1/ugc')) {
      requiredPermission = 'ugc'
    } else if (endpoint.startsWith('/v1/video')) {
      requiredPermission = 'video'
    } else if (endpoint.startsWith('/v1/fashion')) {
      requiredPermission = 'fashion_catalog'
    } else if (endpoint.startsWith('/v1/credits')) {
      requiredPermission = '' // No specific permission needed
    }

    if (requiredPermission && !apiKeyInfo.permissions.includes(requiredPermission)) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: requiredPermission
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route to appropriate handler
    let response: any
    let statusCode = 200
    let creditsUsed = 0

    try {
      switch (endpoint) {
        case '/v1/ugc/generate':
          response = await handleUgcGenerate(supabase, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = body.settings?.number || 1
          break

        case '/v1/video/create':
          response = await handleVideoCreate(supabase, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = (body.duration === 5) ? 5 : 10
          break

        case '/v1/fashion/swap':
          response = await handleFashionSwap(supabase, apiKeyInfo.user_id, body, apiKeyInfo.api_key_id)
          creditsUsed = 1
          break

        case '/v1/credits/balance':
          response = await handleCreditsBalance(supabase, apiKeyInfo.user_id)
          break

        default:
          // Handle job status endpoints
          if (endpoint.match(/^\/v1\/ugc\/jobs\/[\w-]+$/)) {
            const jobId = endpoint.split('/').pop()!
            response = await handleGetUgcJob(supabase, apiKeyInfo.user_id, jobId)
          } else if (endpoint.match(/^\/v1\/video\/jobs\/[\w-]+$/)) {
            const jobId = endpoint.split('/').pop()!
            response = await handleGetVideoJob(supabase, apiKeyInfo.user_id, jobId)
          } else if (endpoint.match(/^\/v1\/fashion\/jobs\/[\w-]+$/)) {
            const jobId = endpoint.split('/').pop()!
            response = await handleGetFashionJob(supabase, apiKeyInfo.user_id, jobId)
          } else {
            statusCode = 404
            response = { error: 'Endpoint not found', code: 'NOT_FOUND' }
          }
      }
    } catch (handlerError) {
      console.error('Handler error:', handlerError)
      statusCode = 500
      response = { error: 'Internal server error', code: 'INTERNAL_ERROR' }
    }

    const responseTime = Date.now() - startTime

    // Log API usage
    await supabase.rpc('log_api_usage', {
      p_api_key_id: apiKeyInfo.api_key_id,
      p_user_id: apiKeyInfo.user_id,
      p_endpoint: endpoint,
      p_method: method,
      p_status_code: statusCode,
      p_credits_used: creditsUsed,
      p_request_metadata: { body_keys: Object.keys(body) },
      p_response_time_ms: responseTime,
      p_ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })

    return new Response(
      JSON.stringify(response),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining-Minute': String(rateLimit.remaining_minute || 0),
          'X-RateLimit-Remaining-Hour': String(rateLimit.remaining_hour || 0),
          'X-RateLimit-Remaining-Day': String(rateLimit.remaining_day || 0),
          'X-Response-Time': `${responseTime}ms`
        }
      }
    )
  } catch (error) {
    console.error('API Gateway error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Handler functions

async function handleUgcGenerate(supabase: any, userId: string, body: any, apiKeyId?: string) {
  const { source_image_url, prompt, settings = {} } = body

  if (!source_image_url) {
    throw new Error('source_image_url is required')
  }

  // Check credits
  const numberOfImages = settings.number || 1
  const { data: deductResult, error: deductError } = await supabase
    .rpc('deduct_user_credits', {
      p_user_id: userId,
      p_amount: numberOfImages,
      p_reason: 'api_ugc_generation'
    })

  if (deductError || !deductResult?.success) {
    return {
      error: deductResult?.error || 'Failed to deduct credits',
      code: 'INSUFFICIENT_CREDITS'
    }
  }

  // Create job record
  const contentHash = await hashApiKey(`${userId}-${source_image_url}-${prompt}-${Date.now()}`)
  
  const { data: job, error: jobError } = await supabase
    .from('image_jobs')
    .insert({
      user_id: userId,
      prompt: prompt || 'Professional product photography',
      settings: {
        ...settings,
        source_url: source_image_url,
        source: 'api',
        api_key_id: apiKeyId
      },
      content_hash: contentHash,
      status: 'queued',
      model_type: 'gemini',
      total: numberOfImages
    })
    .select()
    .single()

  if (jobError) {
    // Refund credits on failure
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: numberOfImages,
      p_reason: 'api_job_creation_failed'
    })
    throw jobError
  }

  // Trigger the actual generation (async call to ugc-gemini function)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  
  fetch(`${supabaseUrl}/functions/v1/ugc-gemini-v3`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'process_job',
      jobId: job.id,
      sourceImageUrl: source_image_url,
      prompt: prompt,
      settings: settings
    })
  }).catch(console.error) // Fire and forget

  return {
    job_id: job.id,
    status: 'queued',
    message: 'Image generation job created successfully',
    credits_used: numberOfImages
  }
}

async function handleVideoCreate(supabase: any, userId: string, body: any, apiKeyId?: string) {
  const { source_image_url, prompt, duration = 5 } = body

  if (!source_image_url) {
    throw new Error('source_image_url is required')
  }

  const creditCost = duration === 5 ? 5 : 10

  // Check credits
  const { data: deductResult, error: deductError } = await supabase
    .rpc('deduct_user_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: 'api_video_generation'
    })

  if (deductError || !deductResult?.success) {
    return {
      error: deductResult?.error || 'Failed to deduct credits',
      code: 'INSUFFICIENT_CREDITS'
    }
  }

  // Create kling job record
  const { data: job, error: jobError } = await supabase
    .from('kling_jobs')
    .insert({
      user_id: userId,
      prompt: prompt || 'Gentle camera movement',
      image_url: source_image_url,
      duration: duration,
      status: 'queued',
      metadata: { source: 'api', api_key_id: apiKeyId }
    })
    .select()
    .single()

  if (jobError) {
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: 'api_video_job_creation_failed'
    })
    throw jobError
  }

  // Trigger video generation
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  
  fetch(`${supabaseUrl}/functions/v1/kling-video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobId: job.id,
      imageUrl: source_image_url,
      prompt: prompt,
      duration: duration
    })
  }).catch(console.error)

  return {
    job_id: job.id,
    status: 'queued',
    message: 'Video generation job created successfully',
    credits_used: creditCost
  }
}

async function handleFashionSwap(supabase: any, userId: string, body: any, apiKeyId?: string) {
  const { garment_image_url, base_model_id, settings = {} } = body

  if (!garment_image_url) {
    throw new Error('garment_image_url is required')
  }

  if (!base_model_id) {
    throw new Error('base_model_id is required')
  }

  // Check credits
  const { data: deductResult, error: deductError } = await supabase
    .rpc('deduct_user_credits', {
      p_user_id: userId,
      p_amount: 1,
      p_reason: 'api_fashion_swap'
    })

  if (deductError || !deductResult?.success) {
    return {
      error: deductResult?.error || 'Failed to deduct credits',
      code: 'INSUFFICIENT_CREDITS'
    }
  }

  // Create outfit swap job
  const { data: job, error: jobError } = await supabase
    .from('outfit_swap_jobs')
    .insert({
      user_id: userId,
      base_model_id: base_model_id,
      status: 'queued',
      metadata: { 
        source: 'api',
        api_key_id: apiKeyId,
        garment_url: garment_image_url 
      },
      settings: settings
    })
    .select()
    .single()

  if (jobError) {
    await supabase.rpc('refund_user_credits', {
      p_user_id: userId,
      p_amount: 1,
      p_reason: 'api_fashion_job_creation_failed'
    })
    throw jobError
  }

  // Trigger outfit swap
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  
  fetch(`${supabaseUrl}/functions/v1/outfit-swap`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jobId: job.id,
      garmentUrl: garment_image_url,
      baseModelId: base_model_id,
      settings: settings
    })
  }).catch(console.error)

  return {
    job_id: job.id,
    status: 'queued',
    message: 'Fashion catalog swap job created successfully',
    credits_used: 1
  }
}

async function handleCreditsBalance(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('subscribers')
    .select('credits_balance, subscription_tier')
    .eq('user_id', userId)
    .single()

  if (error) throw error

  return {
    credits_balance: data?.credits_balance || 0,
    subscription_tier: data?.subscription_tier || 'Free'
  }
}

async function handleGetUgcJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from('image_jobs')
    .select('id, status, progress, total, completed, failed, error, created_at, finished_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) {
    return { error: 'Job not found', code: 'NOT_FOUND' }
  }

  // Get generated images if completed
  let images: any[] = []
  if (job.status === 'completed') {
    const { data: ugcImages } = await supabase
      .from('ugc_images')
      .select('id, public_url, created_at')
      .eq('job_id', jobId)

    images = ugcImages || []
  }

  return {
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    total: job.total,
    completed: job.completed,
    failed: job.failed,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at,
    images: images.map(img => ({
      id: img.id,
      url: img.public_url,
      created_at: img.created_at
    }))
  }
}

async function handleGetVideoJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from('kling_jobs')
    .select('id, status, video_url, video_duration, error, created_at, finished_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) {
    return { error: 'Job not found', code: 'NOT_FOUND' }
  }

  return {
    job_id: job.id,
    status: job.status,
    video_url: job.video_url,
    video_duration: job.video_duration,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at
  }
}

async function handleGetFashionJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from('outfit_swap_jobs')
    .select('id, status, progress, error, created_at, finished_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) {
    return { error: 'Job not found', code: 'NOT_FOUND' }
  }

  // Get results if completed
  let results: any[] = []
  if (job.status === 'completed') {
    const { data: swapResults } = await supabase
      .from('outfit_swap_results')
      .select('id, public_url, created_at')
      .eq('job_id', jobId)

    results = swapResults || []
  }

  return {
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    created_at: job.created_at,
    finished_at: job.finished_at,
    results: results.map(r => ({
      id: r.id,
      url: r.public_url,
      created_at: r.created_at
    }))
  }
}
