# API Guide: UGC & Background Photoshoots

This guide covers how to generate UGC lifestyle images and product background photoshoots via the ProduktPix API.

---

## Base URL

```
https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/api-gateway
```

---

## Authentication

All requests require an API key passed as a header:

```
X-API-Key: pk_live_YOUR_API_KEY
Content-Type: application/json
```

You can verify your key and check your permissions at any time:

```http
POST /v1/auth/verify
```

```json
{
  "authenticated": true,
  "user_id": "uuid",
  "permissions": ["ugc", "product_background"],
  "rate_limit_tier": "starter",
  "credits_balance": 42,
  "subscription_tier": "Starter"
}
```

---

## Credit Costs

| Feature | Credits |
|--------|---------|
| UGC image (per image) | 1 |
| Product background swap (per image) | 1 |
| Image pack (4 images) | 4 |
| Catalog photoshoot (hero + 3 views) | 4 |

Check your current balance:

```http
GET /v1/credits/balance
```

```json
{
  "credits_balance": 42,
  "subscription_tier": "Starter"
}
```

---

## Rate Limits

Limits are enforced per plan and returned in response headers:

| Plan | Per Minute | Per Hour | Per Day |
|------|-----------|----------|---------|
| Free | 5 | 50 | 200 |
| Starter | 20 | 200 | 2,000 |
| Plus | 50 | 500 | 5,000 |
| Pro | 100 | 1,000 | 10,000 |

Response headers:
```
X-RateLimit-Remaining-Minute: 19
X-RateLimit-Remaining-Hour: 199
X-RateLimit-Remaining-Day: 1999
```

When exceeded, you receive a `429` with `Retry-After` seconds.

---

## Job Flow

Both UGC and background photoshoots are **asynchronous**. The pattern is:

1. `POST` to create a job → receive a `job_id`
2. Poll `GET /v1/.../jobs/{job_id}` until `status` is `completed` or `failed`
3. Retrieve image URLs from the response

Alternatively, configure a webhook to receive results automatically (see [Webhooks](#webhooks)).

---

## 1. UGC Image Generation

Generates lifestyle/editorial images from a product photo using AI.

**Required permission:** `ugc`

### Create Job

```http
POST /v1/ugc/generate
```

**Request body:**

```json
{
  "endpoint": "/v1/ugc/generate",
  "source_image_url": "https://example.com/product.jpg",
  "prompt": "Professional lifestyle photo in a modern kitchen",
  "settings": {
    "number": 2,
    "quality": "high",
    "aspect_ratio": "1:1",
    "size": "small"
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `source_image_url` | string | Yes | Publicly accessible URL |
| `prompt` | string | No | Describes the scene/style |
| `settings.number` | integer | No | 1–4 images, default 1 |
| `settings.quality` | string | No | `"high"` or `"medium"` |
| `settings.aspect_ratio` | string | No | `1:1`, `3:4`, `4:3`, `9:16`, `16:9`, `source` |
| `settings.size` | string | No | `"small"` or `"large"` |

**Response:**

```json
{
  "job_id": "a1b2c3d4-...",
  "status": "queued",
  "message": "Image generation job created successfully",
  "credits_used": 2,
  "source_image_id": "uuid"
}
```

> **Idempotency:** If you submit the same source image, prompt, and settings within 60 minutes, the existing job result is returned without deducting additional credits.

---

### Poll Job Status

```http
GET /v1/ugc/jobs/{job_id}
```

**Response:**

```json
{
  "job_id": "a1b2c3d4-...",
  "status": "completed",
  "progress": 100,
  "total": 2,
  "completed": 2,
  "failed": 0,
  "error": null,
  "created_at": "2026-04-03T10:00:00Z",
  "finished_at": "2026-04-03T10:00:45Z",
  "images": [
    {
      "id": "uuid",
      "url": "https://storage.example.com/image-1.webp",
      "created_at": "2026-04-03T10:00:45Z"
    },
    {
      "id": "uuid",
      "url": "https://storage.example.com/image-2.webp",
      "created_at": "2026-04-03T10:00:46Z"
    }
  ]
}
```

**Status values:** `queued` → `processing` → `completed` | `failed`

---

### Full Example (Node.js)

```javascript
const API_KEY = 'pk_live_YOUR_API_KEY';
const BASE_URL = 'https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/api-gateway';

async function generateUGC(productImageUrl, prompt, count = 1) {
  // Create the job
  const createRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint: '/v1/ugc/generate',
      source_image_url: productImageUrl,
      prompt,
      settings: { number: count, quality: 'high', aspect_ratio: '1:1' },
    }),
  });

  const { job_id } = await createRes.json();

  // Poll until done
  while (true) {
    await new Promise(r => setTimeout(r, 3000));

    const statusRes = await fetch(`${BASE_URL}?endpoint=/v1/ugc/jobs/${job_id}`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const job = await statusRes.json();

    if (job.status === 'completed') return job.images;
    if (job.status === 'failed') throw new Error(job.error);
  }
}
```

---

## 2. Product Background Photoshoot

Replaces the background of a product image with a preset scene or a custom image.

**Required permission:** `product_background`

### Create Job

```http
POST /v1/product/background
```

**Request body:**

```json
{
  "endpoint": "/v1/product/background",
  "source_image_url": "https://example.com/product.jpg",
  "background_preset_id": "kitchen",
  "settings": {
    "quality": "high",
    "imageSize": "1K",
    "aspectRatio": "1:1",
    "customPrompt": "warm morning light, cozy atmosphere"
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `source_image_url` | string | Yes | Publicly accessible URL |
| `background_preset_id` | string | Yes* | Use a preset ID from the list below |
| `background_image_url` | string | Yes* | Custom background URL (use instead of preset) |
| `settings.quality` | string | No | `"high"` or `"medium"` |
| `settings.imageSize` | string | No | `"1K"`, `"2K"`, or `"4K"` |
| `settings.aspectRatio` | string | No | e.g. `"1:1"`, `"9:16"` |
| `settings.customPrompt` | string | No | Additional scene description |

*Provide either `background_preset_id` or `background_image_url`, not both.

**Available preset IDs:**

| Category | Preset IDs |
|----------|-----------|
| Studio | `white-seamless`, `black-studio`, `gradient-gray`, `soft-pink` |
| Home | `living-room`, `kitchen`, `bedroom`, `home-office` |
| Outdoor | `beach`, `forest`, `garden`, `mountain` |
| Urban | `cafe`, `street`, `rooftop`, `subway` |
| Editorial | `editorial`, `fashion`, `minimal`, `vogue` |
| Seasonal | `christmas`, `summer`, `autumn`, `spring` |

**Response:**

```json
{
  "job_id": "a1b2c3d4-...",
  "status": "queued",
  "message": "Product background swap job created successfully",
  "credits_used": 1
}
```

---

### Poll Job Status

```http
GET /v1/product/background/jobs/{job_id}
```

**Response:**

```json
{
  "job_id": "a1b2c3d4-...",
  "status": "completed",
  "progress": 100,
  "completed": 1,
  "failed": 0,
  "total": 1,
  "error": null,
  "created_at": "2026-04-03T10:00:00Z",
  "finished_at": "2026-04-03T10:00:30Z",
  "results": [
    {
      "id": "uuid",
      "result_url": "https://storage.example.com/result.webp",
      "source_url": "https://example.com/product.jpg",
      "status": "completed",
      "created_at": "2026-04-03T10:00:30Z"
    }
  ]
}
```

---

### Full Example (Python)

```python
import time
import requests

API_KEY = 'pk_live_YOUR_API_KEY'
BASE_URL = 'https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/api-gateway'
HEADERS = {'X-API-Key': API_KEY, 'Content-Type': 'application/json'}

def background_photoshoot(product_url, preset_id='kitchen'):
    # Create the job
    res = requests.post(BASE_URL, headers=HEADERS, json={
        'endpoint': '/v1/product/background',
        'source_image_url': product_url,
        'background_preset_id': preset_id,
        'settings': {'quality': 'high', 'imageSize': '1K'},
    })
    job_id = res.json()['job_id']

    # Poll until done
    while True:
        time.sleep(3)
        status = requests.get(
            BASE_URL,
            headers=HEADERS,
            params={'endpoint': f'/v1/product/background/jobs/{job_id}'}
        ).json()

        if status['status'] == 'completed':
            return [r['result_url'] for r in status['results']]
        if status['status'] == 'failed':
            raise Exception(status.get('error'))
```

---

## 3. Webhooks (Async Delivery)

Instead of polling, configure a webhook URL on your API key to receive results automatically.

### Webhook Payload

```json
{
  "event": "job.completed",
  "timestamp": "2026-04-03T10:00:45.000Z",
  "job": {
    "id": "a1b2c3d4-...",
    "type": "ugc",
    "status": "completed"
  },
  "data": {
    "completed": 2,
    "failed": 0,
    "total": 2,
    "results": [
      {
        "id": "uuid",
        "result_url": "https://storage.example.com/image-1.webp",
        "source_url": "https://example.com/product.jpg",
        "status": "completed"
      }
    ]
  }
}
```

**Event types:** `job.completed`, `job.failed`

**Job types:** `ugc`, `product_background`, `video`, `fashion`

### Signature Verification

Every webhook request is signed. Verify it before trusting the payload:

```javascript
const crypto = require('crypto');

function verifyWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp  = req.headers['x-webhook-timestamp'];
  const body       = JSON.stringify(req.body);

  // Reject stale requests (> 5 minutes)
  if (Date.now() / 1000 - parseInt(timestamp) > 300) {
    throw new Error('Webhook timestamp too old');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  if (signature !== expected) throw new Error('Invalid signature');
}
```

Webhook deliveries are retried up to 4 times on failure (delays: immediate, 1 min, 5 min, 30 min).

---

## Error Reference

| HTTP Code | Code | Meaning |
|-----------|------|---------|
| 400 | `BAD_REQUEST` | Missing or invalid field |
| 401 | `INVALID_API_KEY` / `API_KEY_INACTIVE` | Key missing, wrong, or disabled |
| 402 | `INSUFFICIENT_CREDITS` | Not enough credits for the request |
| 403 | `PERMISSION_DENIED` | API key lacks the required permission |
| 404 | `NOT_FOUND` | Job doesn't exist or belongs to another user |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests; check `Retry-After` header |
| 500 | `INTERNAL_ERROR` | Server-side failure |

**Error response shape:**

```json
{
  "error": "Insufficient credits",
  "code": "INSUFFICIENT_CREDITS",
  "required": 4,
  "available": 2
}
```

---

## Quick Reference

| Goal | Method | Endpoint |
|------|--------|----------|
| Generate UGC images | POST | `/v1/ugc/generate` |
| Check UGC job | GET | `/v1/ugc/jobs/{job_id}` |
| Background photoshoot | POST | `/v1/product/background` |
| Check background job | GET | `/v1/product/background/jobs/{job_id}` |
| Check credit balance | GET | `/v1/credits/balance` |
| Verify API key | POST | `/v1/auth/verify` |
