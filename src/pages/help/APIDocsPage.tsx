import { useState } from "react";
import { Code, Copy, Key, Zap, CheckCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpLayout } from "@/components/help/HelpLayout";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { buildTechArticleSchema, buildBreadcrumbSchema } from "@/lib/schema";

const BASE_URL = "https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/api-gateway";

const endpoints = [
  {
    method: "POST",
    endpoint: "/v1/ugc/generate",
    description: "Generate AI-powered UGC product images",
    parameters: ["source_image_url (required)", "prompt", "settings.number (1-4)", "settings.aspect_ratio"],
    credits: "1 credit per image",
    responseExample: `{
  "job_id": "uuid",
  "status": "queued",
  "message": "Image generation job created successfully",
  "credits_used": 2
}`
  },
  {
    method: "GET",
    endpoint: "/v1/ugc/jobs/{job_id}",
    description: "Get status and results of a UGC generation job",
    parameters: ["job_id in endpoint path"],
    credits: "Free",
    responseExample: `{
  "job_id": "uuid",
  "status": "completed",
  "progress": 100,
  "total": 2,
  "completed": 2,
  "images": [
    { "id": "uuid", "url": "https://...", "created_at": "..." }
  ]
}`
  },
  {
    method: "POST",
    endpoint: "/v1/video/create",
    description: "Create animated video from an image",
    parameters: ["source_image_url (required)", "prompt", "duration (5 or 10)"],
    credits: "5 credits (5s) / 10 credits (10s)",
    responseExample: `{
  "job_id": "uuid",
  "status": "queued",
  "credits_used": 5
}`
  },
  {
    method: "GET",
    endpoint: "/v1/video/jobs/{job_id}",
    description: "Get status and video URL of a video job",
    parameters: ["job_id in endpoint path"],
    credits: "Free",
    responseExample: `{
  "job_id": "uuid",
  "status": "completed",
  "video_url": "https://...",
  "video_duration": 5
}`
  },
  {
    method: "POST",
    endpoint: "/v1/fashion/swap",
    description: "Generate fashion catalog photos with outfit swap",
    parameters: ["garment_image_url (required)", "base_model_id (required)", "settings"],
    credits: "1 credit per swap",
    responseExample: `{
  "job_id": "uuid",
  "status": "queued",
  "credits_used": 1
}`
  },
  {
    method: "GET",
    endpoint: "/v1/fashion/jobs/{job_id}",
    description: "Get status and results of a fashion swap job",
    parameters: ["job_id in endpoint path"],
    credits: "Free",
    responseExample: `{
  "job_id": "uuid",
  "status": "completed",
  "results": [
    { "id": "uuid", "url": "https://...", "created_at": "..." }
  ]
}`
  },
  {
    method: "POST",
    endpoint: "/v1/product/background",
    description: "Swap product background — remove & replace with preset or custom background",
    parameters: ["source_image_url (required)", "background_preset_id or background_image_url (required)", "settings"],
    credits: "1 credit",
    responseExample: `{
  "job_id": "uuid",
  "status": "queued",
  "credits_used": 1
}`
  },
  {
    method: "GET",
    endpoint: "/v1/product/background/jobs/{job_id}",
    description: "Get status and result of a product background job",
    parameters: ["job_id in endpoint path"],
    credits: "Free",
    responseExample: `{
  "job_id": "uuid",
  "status": "completed",
  "results": [
    { "id": "uuid", "result_url": "https://...", "source_url": "https://..." }
  ]
}`
  },
  {
    method: "POST",
    endpoint: "/v1/packs/generate",
    description: "Generate a ready-made image pack (ecommerce, social media, or ads) — 4 styled images per pack",
    parameters: ["source_image_url (required)", "pack_id (required: ecommerce | social | ads)", "product_type (required: fashion | product)"],
    credits: "4 credits per pack",
    responseExample: `{
  "job_id": "uuid",
  "status": "queued",
  "pack": "ecommerce",
  "styles": ["hero_product", "catalog_clean", "detail_macro", "model_neutral"],
  "credits_used": 4
}`
  },
  {
    method: "GET",
    endpoint: "/v1/packs/jobs/{job_id}",
    description: "Get status and results of a pack generation job",
    parameters: ["job_id in endpoint path"],
    credits: "Free",
    responseExample: `{
  "job_id": "uuid",
  "status": "completed",
  "pack": "ecommerce",
  "progress": 100,
  "total": 4,
  "completed": 4,
  "images": [
    { "id": "uuid", "url": "https://...", "style": "hero_product" }
  ]
}`
  },
  {
    method: "GET",
    endpoint: "/v1/credits/balance",
    description: "Get current credit balance and subscription tier",
    parameters: [],
    credits: "Free",
    responseExample: `{
  "credits_balance": 42,
  "subscription_tier": "Starter"
}`
  }
];

const codeExamples = {
  javascript: `// Generate UGC images
const response = await fetch('${BASE_URL}', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pk_live_YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    endpoint: '/v1/ugc/generate',
    source_image_url: 'https://example.com/product.jpg',
    prompt: 'Professional lifestyle photo on marble background',
    settings: { number: 2, aspect_ratio: '1:1' }
  })
});

const { job_id, status } = await response.json();
console.log('Job created:', job_id);

// Poll for results
const checkJob = await fetch('${BASE_URL}', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pk_live_YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ endpoint: \`/v1/ugc/jobs/\${job_id}\` })
});

const result = await checkJob.json();
console.log('Images:', result.images);`,

  python: `import requests
import time

BASE_URL = "${BASE_URL}"
headers = {
    "X-API-Key": "pk_live_YOUR_API_KEY",
    "Content-Type": "application/json"
}

# Generate UGC images
response = requests.post(BASE_URL, headers=headers, json={
    "endpoint": "/v1/ugc/generate",
    "source_image_url": "https://example.com/product.jpg",
    "prompt": "Professional lifestyle photo on marble background",
    "settings": {"number": 2, "aspect_ratio": "1:1"}
})

job_id = response.json()["job_id"]
print(f"Job created: {job_id}")

# Poll for results
while True:
    result = requests.post(BASE_URL, headers=headers, json={
        "endpoint": f"/v1/ugc/jobs/{job_id}"
    }).json()
    
    if result["status"] == "completed":
        print("Images:", result["images"])
        break
    time.sleep(5)`,

  curl: `# Generate UGC images
curl -X POST "${BASE_URL}" \\
  -H "X-API-Key: pk_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "endpoint": "/v1/ugc/generate",
    "source_image_url": "https://example.com/product.jpg",
    "prompt": "Professional lifestyle photo",
    "settings": {"number": 2}
  }'

# Check job status
curl -X POST "${BASE_URL}" \\
  -H "X-API-Key: pk_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"endpoint": "/v1/ugc/jobs/YOUR_JOB_ID"}'`
};

const webhookExample = `// Webhook handler example (Node.js/Express)
const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');
  
  if (signature !== expectedSig) {
    return res.status(401).send('Invalid signature');
  }
  
  // Verify timestamp (reject if older than 5 minutes)
  const age = Date.now() / 1000 - parseInt(timestamp);
  if (age > 300) {
    return res.status(401).send('Timestamp too old');
  }
  
  // Process the webhook
  const { event, job, data } = req.body;
  
  if (event === 'job.completed') {
    console.log('Job completed:', job.id);
    console.log('Results:', data);
  } else if (event === 'job.failed') {
    console.log('Job failed:', job.id);
  }
  
  res.status(200).send('OK');
});`;

const rateLimits = [
  { plan: "Free", minute: "5", hour: "50", day: "200" },
  { plan: "Starter", minute: "20", hour: "200", day: "2,000" },
  { plan: "Plus", minute: "50", hour: "500", day: "5,000" },
  { plan: "Pro", minute: "100", hour: "1,000", day: "10,000" }
];

const getMethodColor = (method: string) => {
  return method === "GET" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700";
};

const APIDocsPage = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const navigate = useNavigate();

  const techArticleSchema = buildTechArticleSchema(
    'ProduktPix API Documentation',
    'Integrate ProduktPix AI into your workflow with our REST API. Generate product images, videos, and fashion swaps programmatically.',
    '/help/api-docs'
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Help', url: 'https://produktpix.com/help' },
    { name: 'API Docs', url: 'https://produktpix.com/help/api-docs' },
  ]);

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <HelpLayout title="API Documentation" breadcrumbTitle="API Docs">
      <SEO
        title="API Documentation"
        description="Integrate ProduktPix AI into your workflow with our REST API. Generate product images, videos, and fashion catalog photos programmatically."
        path="/help/api-docs"
        schema={[techArticleSchema, breadcrumbSchema]}
      />
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">ProduktPix API</h2>
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              v1.0 Live
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Integrate UGC image generation, video creation, fashion catalog, and pack-based generation into your applications — perfect for Shopify and other e-commerce integrations.
          </p>
        </div>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Base URL</h4>
              <code className="block bg-muted p-3 rounded-md text-sm break-all">{BASE_URL}</code>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Include your API key in the <code className="bg-muted px-1 rounded">X-API-Key</code> header.
              </p>
              <code className="block bg-muted p-3 rounded-md text-sm">X-API-Key: pk_live_YOUR_API_KEY</code>
            </div>
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Get your API key from Account Settings → API Keys</span>
                <Button size="sm" variant="outline" onClick={() => navigate('/account')}>
                  Get API Key
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">API Endpoints</h3>
          <div className="space-y-3">
            {endpoints.map((ep, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getMethodColor(ep.method)}>{ep.method}</Badge>
                      <code className="text-sm font-mono">{ep.endpoint}</code>
                    </div>
                    <Badge variant="outline" className="text-xs">{ep.credits}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{ep.description}</p>
                  {ep.parameters.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {ep.parameters.map((param, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{param}</Badge>
                      ))}
                    </div>
                  )}
                  {ep.responseExample && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Response example
                      </summary>
                      <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs mt-2">
                        <code>{ep.responseExample}</code>
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Code Examples */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Code Examples</h3>
          <Tabs defaultValue="javascript">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            {Object.entries(codeExamples).map(([lang, code]) => (
              <TabsContent key={lang} value={lang}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-base">{lang.charAt(0).toUpperCase() + lang.slice(1)}</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => copyCode(code, lang)}>
                      {copiedCode === lang ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                      <code>{code}</code>
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Webhooks */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Webhooks
          </h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure webhooks to receive real-time notifications when your API jobs complete or fail, 
                instead of polling for results.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium">Webhook Events</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 bg-muted rounded-md">
                    <Badge className="bg-green-100 text-green-700 mb-2">job.completed</Badge>
                    <p className="text-xs text-muted-foreground">Sent when a job finishes successfully with results</p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <Badge className="bg-red-100 text-red-700 mb-2">job.failed</Badge>
                    <p className="text-xs text-muted-foreground">Sent when a job fails after all retry attempts</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Payload Structure</h4>
                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
{`{
  "event": "job.completed",
  "timestamp": "2026-01-08T13:45:00Z",
  "job": {
    "id": "uuid",
    "type": "ugc",  // ugc | video | fashion | product_background | packs
    "status": "completed"
  },
  "data": {
    // Job-specific results
    "images": [...],     // for UGC
    "video_url": "...",  // for video
    "result_url": "..."  // for fashion
  }
}`}
                </pre>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Signature Verification</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  All webhooks include HMAC-SHA256 signatures. Verify them to ensure authenticity.
                </p>
                <div className="text-xs space-y-1">
                  <p><code className="bg-muted px-1 rounded">X-Webhook-Signature</code> - HMAC-SHA256 signature</p>
                  <p><code className="bg-muted px-1 rounded">X-Webhook-Timestamp</code> - Unix timestamp (for replay protection)</p>
                  <p><code className="bg-muted px-1 rounded">X-Webhook-Event-Id</code> - Unique event ID</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Verification Example</h4>
                  <Button size="sm" variant="ghost" onClick={() => copyCode(webhookExample, 'webhook')}>
                    {copiedCode === 'webhook' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
                  <code>{webhookExample}</code>
                </pre>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Retry Policy</h4>
                <p className="text-xs text-muted-foreground">
                  Failed webhook deliveries are retried with exponential backoff: immediately, 1 min, 5 min, 30 min. 
                  After 4 failed attempts, the event is marked as failed and can be viewed in your dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rate Limits */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Rate Limits</h3>
          <div className="grid gap-4 md:grid-cols-4">
            {rateLimits.map((limit) => (
              <Card key={limit.plan}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{limit.plan}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per minute:</span>
                    <span>{limit.minute}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per hour:</span>
                    <span>{limit.hour}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per day:</span>
                    <span>{limit.day}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Error Codes */}
        <Card>
          <CardHeader>
            <CardTitle>Error Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Badge className="bg-green-100 text-green-700 mb-1">200</Badge>
                <p className="text-muted-foreground">Success</p>
              </div>
              <div>
                <Badge className="bg-red-100 text-red-700 mb-1">401</Badge>
                <p className="text-muted-foreground">Invalid API key</p>
              </div>
              <div>
                <Badge className="bg-red-100 text-red-700 mb-1">403</Badge>
                <p className="text-muted-foreground">Permission denied</p>
              </div>
              <div>
                <Badge className="bg-red-100 text-red-700 mb-1">429</Badge>
                <p className="text-muted-foreground">Rate limit exceeded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </HelpLayout>
  );
};

export default APIDocsPage;
