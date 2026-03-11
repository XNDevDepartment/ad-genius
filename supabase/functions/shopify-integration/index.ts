import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// ── Domain validation ──
function sanitizeShopDomain(domain: string): string | null {
  if (!domain || typeof domain !== 'string') return null
  let cleaned = domain.trim().toLowerCase()
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, '')
  // Strip trailing slash/path
  cleaned = cleaned.split('/')[0]
  // Must match *.myshopify.com or a custom domain
  if (cleaned.length < 4 || cleaned.length > 255) return null
  // Basic domain validation
  if (!/^[a-z0-9][a-z0-9\-\.]*[a-z0-9]$/.test(cleaned)) return null
  return cleaned
}

// ── Audit logger ──
async function logAudit(
  supabase: any,
  connectionId: string | null,
  userId: string,
  action: string,
  oldStatus: string | null,
  newStatus: string | null,
  metadata: Record<string, unknown> = {},
  ipAddress?: string
) {
  await supabase.from('shopify_connection_audit_log').insert({
    connection_id: connectionId,
    user_id: userId,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    metadata,
    ip_address: ipAddress || null,
  })
}

// ═══════════════════════════════════════════════════════════
// 1. connectShopifyStore
// ═══════════════════════════════════════════════════════════
async function handleConnect(supabase: any, userId: string, apiKeyId: string, body: any, ip: string) {
  const { shopDomain, shopName, shopifyStoreId, externalConnectionId, webhookUrl, metadata } = body

  // Validate required fields
  if (!shopDomain || !externalConnectionId) {
    return { error: 'shopDomain and externalConnectionId are required', code: 'VALIDATION_ERROR' }
  }

  const cleanDomain = sanitizeShopDomain(shopDomain)
  if (!cleanDomain) {
    return { error: 'Invalid shop domain format', code: 'VALIDATION_ERROR' }
  }

  // Validate webhook URL format if provided
  if (webhookUrl && !webhookUrl.startsWith('https://')) {
    return { error: 'Webhook URL must use HTTPS', code: 'VALIDATION_ERROR' }
  }

  // Check if this connection_id is already used by another account
  const { data: existingByConnId } = await supabase
    .from('shopify_store_connections')
    .select('id, user_id, connection_status')
    .eq('connection_id', externalConnectionId)
    .single()

  if (existingByConnId && existingByConnId.user_id !== userId) {
    return { error: 'This Shopify store is already connected to another ProduktPix account', code: 'CONFLICT' }
  }

  // Check if this user already has this domain connected
  const { data: existingByDomain } = await supabase
    .from('shopify_store_connections')
    .select('id, connection_status, is_connected')
    .eq('user_id', userId)
    .eq('shop_domain', cleanDomain)
    .single()

  // Generate webhook secret
  const webhookSecret = crypto.randomUUID() + '-' + crypto.randomUUID()

  const now = new Date().toISOString()

  if (existingByDomain) {
    // Idempotent reconnect
    const oldStatus = existingByDomain.connection_status
    const { data: updated, error } = await supabase
      .from('shopify_store_connections')
      .update({
        connection_id: externalConnectionId,
        shop_name: shopName || null,
        shopify_store_id: shopifyStoreId || null,
        api_key_id: apiKeyId,
        connection_source: metadata?.source || 'shopify_app',
        connection_status: 'connected',
        is_connected: true,
        is_verified: false,
        webhook_url: webhookUrl || null,
        webhook_secret: webhookSecret,
        metadata: metadata || {},
        last_error: null,
        connected_at: now,
        disconnected_at: null,
        verified_at: null,
      })
      .eq('id', existingByDomain.id)
      .select('id, shop_domain, shop_name, connection_status, is_connected, is_verified, connected_at, verified_at')
      .single()

    if (error) return { error: 'Failed to update connection', code: 'INTERNAL_ERROR' }

    await logAudit(supabase, updated.id, userId, 'reconnected', oldStatus, 'connected', { shopDomain: cleanDomain }, ip)

    return {
      success: true,
      connectionId: updated.id,
      shopifyConnected: true,
      shopifyVerified: false,
      shopifyConnectionStatus: 'connected',
      shopifyStoreDomain: updated.shop_domain,
      shopifyStoreName: updated.shop_name,
      connectedAt: updated.connected_at,
      verifiedAt: null,
      webhookSecret,
      message: 'Store reconnected successfully. Call /v1/shopify/verify to complete verification.',
    }
  }

  // New connection
  const { data: newConn, error: insertError } = await supabase
    .from('shopify_store_connections')
    .insert({
      user_id: userId,
      api_key_id: apiKeyId,
      provider: 'shopify',
      shop_domain: cleanDomain,
      shop_name: shopName || null,
      shopify_store_id: shopifyStoreId || null,
      connection_id: externalConnectionId,
      connection_source: metadata?.source || 'shopify_app',
      connection_status: 'connected',
      is_connected: true,
      is_verified: false,
      webhook_url: webhookUrl || null,
      webhook_secret: webhookSecret,
      metadata: metadata || {},
      connected_at: now,
    })
    .select('id, shop_domain, shop_name, connection_status, is_connected, is_verified, connected_at')
    .single()

  if (insertError) {
    console.error('[SHOPIFY] Insert error:', insertError)
    return { error: 'Failed to create connection: ' + insertError.message, code: 'INTERNAL_ERROR' }
  }

  await logAudit(supabase, newConn.id, userId, 'connected', null, 'connected', { shopDomain: cleanDomain, source: metadata?.source }, ip)

  return {
    success: true,
    connectionId: newConn.id,
    shopifyConnected: true,
    shopifyVerified: false,
    shopifyConnectionStatus: 'connected',
    shopifyStoreDomain: newConn.shop_domain,
    shopifyStoreName: newConn.shop_name,
    connectedAt: newConn.connected_at,
    verifiedAt: null,
    webhookSecret,
    message: 'Store connected successfully. Call /v1/shopify/verify to complete verification.',
  }
}

// ═══════════════════════════════════════════════════════════
// 2. verifyShopifyStoreConnection
// ═══════════════════════════════════════════════════════════
async function handleVerify(supabase: any, userId: string, body: any, ip: string) {
  const { connectionId, shopDomain } = body

  if (!connectionId && !shopDomain) {
    return { error: 'connectionId or shopDomain is required', code: 'VALIDATION_ERROR' }
  }

  let query = supabase
    .from('shopify_store_connections')
    .select('*')
    .eq('user_id', userId)

  if (connectionId) {
    query = query.eq('id', connectionId)
  } else {
    const cleaned = sanitizeShopDomain(shopDomain)
    if (!cleaned) return { error: 'Invalid shop domain', code: 'VALIDATION_ERROR' }
    query = query.eq('shop_domain', cleaned)
  }

  const { data: conn, error } = await query.single()

  if (error || !conn) {
    return { error: 'Connection not found', code: 'NOT_FOUND' }
  }

  if (conn.connection_status === 'revoked') {
    return { error: 'Connection has been revoked. Please reconnect.', code: 'CONNECTION_REVOKED' }
  }

  if (conn.is_verified) {
    return {
      success: true,
      connectionId: conn.id,
      shopifyConnected: true,
      shopifyVerified: true,
      shopifyConnectionStatus: 'verified',
      shopifyStoreDomain: conn.shop_domain,
      verifiedAt: conn.verified_at,
      message: 'Store already verified.',
    }
  }

  const now = new Date().toISOString()
  const oldStatus = conn.connection_status

  const { error: updateError } = await supabase
    .from('shopify_store_connections')
    .update({
      connection_status: 'verified',
      is_verified: true,
      verified_at: now,
      last_error: null,
    })
    .eq('id', conn.id)

  if (updateError) return { error: 'Failed to verify connection', code: 'INTERNAL_ERROR' }

  await logAudit(supabase, conn.id, userId, 'verified', oldStatus, 'verified', { shopDomain: conn.shop_domain }, ip)

  return {
    success: true,
    connectionId: conn.id,
    shopifyConnected: true,
    shopifyVerified: true,
    shopifyConnectionStatus: 'verified',
    shopifyStoreDomain: conn.shop_domain,
    shopifyStoreName: conn.shop_name,
    connectedAt: conn.connected_at,
    verifiedAt: now,
    message: 'Store verified successfully.',
  }
}

// ═══════════════════════════════════════════════════════════
// 3. getShopifyConnectionStatus
// ═══════════════════════════════════════════════════════════
async function handleStatus(supabase: any, userId: string, body: any) {
  const { connectionId, shopDomain } = body || {}

  let query = supabase
    .from('shopify_store_connections')
    .select('id, shop_domain, shop_name, shopify_store_id, connection_id, connection_source, connection_status, is_connected, is_verified, webhook_url, metadata, last_error, created_at, connected_at, verified_at, disconnected_at, last_sync_at')
    .eq('user_id', userId)

  if (connectionId) {
    query = query.eq('id', connectionId)
    const { data, error } = await query.single()
    if (error || !data) return { error: 'Connection not found', code: 'NOT_FOUND' }
    return formatConnectionResponse(data)
  }

  if (shopDomain) {
    const cleaned = sanitizeShopDomain(shopDomain)
    if (!cleaned) return { error: 'Invalid shop domain', code: 'VALIDATION_ERROR' }
    query = query.eq('shop_domain', cleaned)
    const { data, error } = await query.single()
    if (error || !data) return { error: 'Connection not found', code: 'NOT_FOUND' }
    return formatConnectionResponse(data)
  }

  // Return all connections for this user
  const { data, error } = await query.neq('connection_status', 'disconnected').order('created_at', { ascending: false })
  if (error) return { error: 'Failed to fetch connections', code: 'INTERNAL_ERROR' }

  return {
    connections: (data || []).map(formatConnectionResponse),
    total: data?.length || 0,
  }
}

function formatConnectionResponse(conn: any) {
  return {
    connectionId: conn.id,
    shopifyConnected: conn.is_connected,
    shopifyVerified: conn.is_verified,
    shopifyStoreDomain: conn.shop_domain,
    shopifyStoreName: conn.shop_name,
    shopifyStoreId: conn.shopify_store_id,
    shopifyConnectionId: conn.connection_id,
    shopifyConnectionSource: conn.connection_source,
    shopifyConnectionStatus: conn.connection_status,
    shopifyWebhookUrl: conn.webhook_url,
    shopifyWebhookConfigured: !!conn.webhook_url,
    shopifyMetadata: conn.metadata,
    shopifyConnectionError: conn.last_error,
    shopifyConnectedAt: conn.connected_at,
    shopifyVerifiedAt: conn.verified_at,
    shopifyDisconnectedAt: conn.disconnected_at,
    shopifyLastSyncAt: conn.last_sync_at,
    createdAt: conn.created_at,
    // Never expose webhook_secret
  }
}

// ═══════════════════════════════════════════════════════════
// 4. disconnectShopifyStore
// ═══════════════════════════════════════════════════════════
async function handleDisconnect(supabase: any, userId: string, body: any, ip: string) {
  const { connectionId, shopDomain } = body

  if (!connectionId && !shopDomain) {
    return { error: 'connectionId or shopDomain is required', code: 'VALIDATION_ERROR' }
  }

  let query = supabase
    .from('shopify_store_connections')
    .select('id, connection_status, shop_domain')
    .eq('user_id', userId)

  if (connectionId) query = query.eq('id', connectionId)
  else {
    const cleaned = sanitizeShopDomain(shopDomain)
    if (!cleaned) return { error: 'Invalid shop domain', code: 'VALIDATION_ERROR' }
    query = query.eq('shop_domain', cleaned)
  }

  const { data: conn, error } = await query.single()
  if (error || !conn) return { error: 'Connection not found', code: 'NOT_FOUND' }

  const oldStatus = conn.connection_status
  const now = new Date().toISOString()

  await supabase
    .from('shopify_store_connections')
    .update({
      connection_status: 'revoked',
      is_connected: false,
      is_verified: false,
      webhook_url: null,
      webhook_secret: null,
      disconnected_at: now,
      last_error: null,
    })
    .eq('id', conn.id)

  await logAudit(supabase, conn.id, userId, 'revoked', oldStatus, 'revoked', { shopDomain: conn.shop_domain }, ip)

  return {
    success: true,
    connectionId: conn.id,
    shopifyConnected: false,
    shopifyVerified: false,
    shopifyConnectionStatus: 'revoked',
    message: 'Store disconnected. Historical jobs remain linked.',
  }
}

// ═══════════════════════════════════════════════════════════
// 5. updateShopifyWebhookConfig
// ═══════════════════════════════════════════════════════════
async function handleWebhookConfig(supabase: any, userId: string, body: any, ip: string) {
  const { connectionId, webhookUrl } = body

  if (!connectionId) return { error: 'connectionId is required', code: 'VALIDATION_ERROR' }

  if (webhookUrl && !webhookUrl.startsWith('https://')) {
    return { error: 'Webhook URL must use HTTPS', code: 'VALIDATION_ERROR' }
  }

  const { data: conn, error } = await supabase
    .from('shopify_store_connections')
    .select('id, connection_status, webhook_secret')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single()

  if (error || !conn) return { error: 'Connection not found', code: 'NOT_FOUND' }

  if (conn.connection_status === 'revoked' || conn.connection_status === 'disconnected') {
    return { error: 'Cannot update webhook on a disconnected store', code: 'CONNECTION_INACTIVE' }
  }

  // Generate new secret if none exists
  const secret = conn.webhook_secret || (crypto.randomUUID() + '-' + crypto.randomUUID())

  await supabase
    .from('shopify_store_connections')
    .update({ webhook_url: webhookUrl || null, webhook_secret: secret })
    .eq('id', conn.id)

  await logAudit(supabase, conn.id, userId, 'webhook_updated', conn.connection_status, conn.connection_status, { webhookUrl: webhookUrl || null }, ip)

  return {
    success: true,
    connectionId: conn.id,
    webhookUrl: webhookUrl || null,
    webhookSecret: secret,
    webhookConfigured: !!webhookUrl,
    message: webhookUrl ? 'Webhook configured successfully.' : 'Webhook removed.',
  }
}

// ═══════════════════════════════════════════════════════════
// 6. listConnectedPlatforms
// ═══════════════════════════════════════════════════════════
async function handleListPlatforms(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('shopify_store_connections')
    .select('id, provider, shop_domain, shop_name, connection_status, is_connected, is_verified, connected_at, verified_at')
    .eq('user_id', userId)
    .not('connection_status', 'eq', 'disconnected')
    .order('created_at', { ascending: false })

  if (error) return { error: 'Failed to fetch platforms', code: 'INTERNAL_ERROR' }

  const platforms = (data || []).map((c: any) => ({
    platform: c.provider,
    connectionId: c.id,
    storeDomain: c.shop_domain,
    storeName: c.shop_name,
    status: c.connection_status,
    isConnected: c.is_connected,
    isVerified: c.is_verified,
    connectedAt: c.connected_at,
    verifiedAt: c.verified_at,
  }))

  return { platforms, total: platforms.length }
}

// ═══════════════════════════════════════════════════════════
// 7. attachJobToShopifyStore
// ═══════════════════════════════════════════════════════════
async function handleAttachJob(supabase: any, userId: string, body: any) {
  const { jobId, jobType, connectionId, shopDomain } = body

  if (!jobId || !jobType) {
    return { error: 'jobId and jobType are required', code: 'VALIDATION_ERROR' }
  }

  if (!connectionId && !shopDomain) {
    return { error: 'connectionId or shopDomain is required', code: 'VALIDATION_ERROR' }
  }

  // Resolve connection
  let connQuery = supabase
    .from('shopify_store_connections')
    .select('id, connection_status')
    .eq('user_id', userId)

  if (connectionId) connQuery = connQuery.eq('id', connectionId)
  else {
    const cleaned = sanitizeShopDomain(shopDomain)
    if (!cleaned) return { error: 'Invalid shop domain', code: 'VALIDATION_ERROR' }
    connQuery = connQuery.eq('shop_domain', cleaned)
  }

  const { data: conn, error: connErr } = await connQuery.single()
  if (connErr || !conn) return { error: 'Connection not found', code: 'NOT_FOUND' }

  // Map job type to table
  const tableMap: Record<string, string> = {
    ugc: 'image_jobs',
    packs: 'image_jobs',
    video: 'kling_jobs',
    fashion: 'outfit_swap_jobs',
    product_background: 'bulk_background_jobs',
  }

  const table = tableMap[jobType]
  if (!table) return { error: 'Invalid jobType', code: 'VALIDATION_ERROR' }

  const { error: updateErr } = await supabase
    .from(table)
    .update({ shopify_connection_id: conn.id })
    .eq('id', jobId)
    .eq('user_id', userId)

  if (updateErr) return { error: 'Failed to attach job', code: 'INTERNAL_ERROR' }

  return {
    success: true,
    jobId,
    jobType,
    connectionId: conn.id,
    message: 'Job linked to Shopify store.',
  }
}

// ═══════════════════════════════════════════════════════════
// 8. getShopifyStoreContextForJob
// ═══════════════════════════════════════════════════════════
async function handleJobContext(supabase: any, userId: string, body: any) {
  const { jobId, jobType } = body

  if (!jobId || !jobType) {
    return { error: 'jobId and jobType are required', code: 'VALIDATION_ERROR' }
  }

  const tableMap: Record<string, string> = {
    ugc: 'image_jobs',
    packs: 'image_jobs',
    video: 'kling_jobs',
    fashion: 'outfit_swap_jobs',
    product_background: 'bulk_background_jobs',
  }

  const table = tableMap[jobType]
  if (!table) return { error: 'Invalid jobType', code: 'VALIDATION_ERROR' }

  const { data: job, error } = await supabase
    .from(table)
    .select('id, shopify_connection_id')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) return { error: 'Job not found', code: 'NOT_FOUND' }

  if (!job.shopify_connection_id) {
    return {
      jobId,
      jobType,
      shopifyLinked: false,
      connection: null,
    }
  }

  const { data: conn } = await supabase
    .from('shopify_store_connections')
    .select('id, shop_domain, shop_name, connection_status, is_verified')
    .eq('id', job.shopify_connection_id)
    .single()

  return {
    jobId,
    jobType,
    shopifyLinked: true,
    connection: conn ? {
      connectionId: conn.id,
      shopDomain: conn.shop_domain,
      shopName: conn.shop_name,
      status: conn.connection_status,
      isVerified: conn.is_verified,
    } : null,
  }
}

// ═══════════════════════════════════════════════════════════
// 9. updateSyncTimestamp
// ═══════════════════════════════════════════════════════════
async function handleSyncTimestamp(supabase: any, userId: string, body: any) {
  const { connectionId } = body
  if (!connectionId) return { error: 'connectionId is required', code: 'VALIDATION_ERROR' }

  const { error } = await supabase
    .from('shopify_store_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connectionId)
    .eq('user_id', userId)

  if (error) return { error: 'Failed to update sync timestamp', code: 'INTERNAL_ERROR' }

  return { success: true, message: 'Sync timestamp updated.' }
}

// ═══════════════════════════════════════════════════════════
// Main router — called by api-gateway
// ═══════════════════════════════════════════════════════════
export async function handleShopifyEndpoint(
  supabase: any,
  userId: string,
  apiKeyId: string,
  endpoint: string,
  body: any,
  ip: string
): Promise<any> {
  switch (endpoint) {
    case '/v1/shopify/connect':
      return handleConnect(supabase, userId, apiKeyId, body, ip)
    case '/v1/shopify/verify':
      return handleVerify(supabase, userId, body, ip)
    case '/v1/shopify/status':
      return handleStatus(supabase, userId, body)
    case '/v1/shopify/disconnect':
      return handleDisconnect(supabase, userId, body, ip)
    case '/v1/shopify/webhook':
      return handleWebhookConfig(supabase, userId, body, ip)
    case '/v1/shopify/platforms':
      return handleListPlatforms(supabase, userId)
    case '/v1/shopify/attach-job':
      return handleAttachJob(supabase, userId, body)
    case '/v1/shopify/job-context':
      return handleJobContext(supabase, userId, body)
    case '/v1/shopify/sync-timestamp':
      return handleSyncTimestamp(supabase, userId, body)
    default:
      return { error: 'Shopify endpoint not found', code: 'NOT_FOUND' }
  }
}

// ── Standalone Deno.serve for direct invocation (if needed) ──
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({ error: 'Use the API gateway at /v1/shopify/*', code: 'USE_GATEWAY' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
