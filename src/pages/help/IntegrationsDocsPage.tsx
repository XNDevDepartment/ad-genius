import { useState } from "react";
import { Copy, CheckCircle, ShoppingBag, Globe, Zap, ArrowRight, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpLayout } from "@/components/help/HelpLayout";
import { SEO } from "@/components/SEO";
import { buildTechArticleSchema, buildBreadcrumbSchema } from "@/lib/schema";
import { PageTransition } from "@/components/PageTransition";

const BASE_URL = "https://dhqdamfisdbbcieqlpvt.supabase.co/functions/v1/api-gateway";

const shopifyNodeExample = `const Shopify = require('shopify-api-node');

const shopify = new Shopify({
  shopName: 'your-store.myshopify.com',
  apiKey: 'SHOPIFY_API_KEY',
  password: 'SHOPIFY_API_PASSWORD'
});

const PRODUKTPIX_API = '${BASE_URL}';
const API_KEY = 'pk_live_YOUR_API_KEY';

async function processProduct(productId) {
  // 1. Get product from Shopify
  const product = await shopify.product.get(productId);
  const originalImage = product.images[0]?.src;
  
  if (!originalImage) return;

  // 2. Generate new product photo via ProduktPix
  const genResponse = await fetch(PRODUKTPIX_API, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      endpoint: '/v1/ugc/generate',
      source_image_url: originalImage,
      prompt: 'Professional e-commerce product photo, clean white background',
      settings: { number: 2, aspect_ratio: '1:1' }
    })
  });

  const { job_id } = await genResponse.json();

  // 3. Poll until complete
  let result;
  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch(PRODUKTPIX_API, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: \`/v1/ugc/jobs/\${job_id}\` })
    });
    result = await statusRes.json();
    if (result.status === 'completed' || result.status === 'failed') break;
  }

  if (result.status !== 'completed') {
    console.error('Generation failed for product', productId);
    return;
  }

  // 4. Push generated images back to Shopify
  for (const img of result.images) {
    await shopify.productImage.create(productId, {
      src: img.url,
      position: product.images.length + 1
    });
  }

  console.log(\`Updated product \${product.title} with \${result.images.length} new images\`);
}

// Process entire catalog with rate limiting
async function processCatalog() {
  const products = await shopify.product.list({ limit: 250 });
  
  for (const product of products) {
    await processProduct(product.id);
    // Respect rate limits: wait 2s between products
    await new Promise(r => setTimeout(r, 2000));
  }
}

processCatalog();`;

const webhookHandlerExample = `const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'whsec_YOUR_WEBHOOK_SECRET';

app.post('/produktpix-webhook', (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const payload = JSON.stringify(req.body);
  
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');
  
  if (signature !== expectedSig) {
    return res.status(401).send('Invalid signature');
  }

  // 2. Reject old timestamps (replay protection)
  const age = Date.now() / 1000 - parseInt(timestamp);
  if (age > 300) {
    return res.status(401).send('Timestamp too old');
  }

  // 3. Process the event
  const { event, job, data } = req.body;
  
  switch (event) {
    case 'job.completed':
      console.log('Job completed:', job.id, job.type);
      // Update your database, notify user, push to Shopify, etc.
      if (data.images) {
        data.images.forEach(img => {
          console.log('Generated image:', img.url);
        });
      }
      break;
      
    case 'job.failed':
      console.error('Job failed:', job.id, data.error);
      // Alert your team, retry, etc.
      break;
  }

  res.status(200).send('OK');
});

app.listen(3000);`;

const zapierExample = `// Zapier Code Step — trigger ProduktPix generation
// Trigger: New Shopify Product
// Action: Code by Zapier (JavaScript)

const response = await fetch('${BASE_URL}', {
  method: 'POST',
  headers: {
    'X-API-Key': inputData.produktpix_api_key,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    endpoint: '/v1/ugc/generate',
    source_image_url: inputData.product_image_url,
    prompt: 'Professional product photography',
    settings: { number: 2 }
  })
});

const result = await response.json();
output = { job_id: result.job_id, status: result.status };`;

const IntegrationsDocsPage = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const techArticleSchema = buildTechArticleSchema(
    'ProduktPix Integrations Guide',
    'Connect ProduktPix to Shopify, Zapier, Make, and custom applications. Automate product photography at scale.',
    '/help/integrations'
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Help', url: 'https://produktpix.com/help' },
    { name: 'Integrations', url: 'https://produktpix.com/help/integrations' },
  ]);

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <PageTransition>
    <HelpLayout title="Integrations" breadcrumbTitle="Integrations">
      <SEO
        title="Integrations — ProduktPix API"
        description="Connect ProduktPix to Shopify, Zapier, Make and your custom applications. Automate product photography at scale."
        path="/help/integrations"
        schema={[techArticleSchema, breadcrumbSchema]}
      />
      <div className="space-y-8">
        {/* Intro */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-muted-foreground">
            Connect ProduktPix to your e-commerce stack and automate product image generation across your catalog.
          </p>
        </div>

        {/* Integration Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Shopify
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Import products, generate photos, and push results back to your Shopify store automatically.
              </p>
              <Badge className="bg-green-100 text-green-700">Full Guide Below</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-yellow-500" />
                Zapier / Make
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Use low-code automation to trigger image generation from any app or workflow.
              </p>
              <Badge variant="outline">Code Step Guide</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="h-5 w-5 text-blue-500" />
                Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Receive real-time notifications when jobs complete. No polling needed.
              </p>
              <Badge variant="outline">Setup Guide</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Shopify Integration */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopify Integration
          </h3>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold mb-2">How It Works</h4>
                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    { step: "1", title: "Import", desc: "Fetch product images from Shopify Admin API" },
                    { step: "2", title: "Generate", desc: "Send images to ProduktPix API for enhancement" },
                    { step: "3", title: "Receive", desc: "Poll for results or use webhooks" },
                    { step: "4", title: "Push Back", desc: "Update Shopify product images via Admin API" },
                  ].map((s) => (
                    <div key={s.step} className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                        {s.step}
                      </div>
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Prerequisites</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>A ProduktPix API key (get one from <a href="/account" className="text-primary underline">Account → API Keys</a>)</li>
                  <li>Shopify store with Admin API access (Custom App or Private App credentials)</li>
                  <li>Node.js 18+ for the integration script</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Install Dependencies</h4>
                <pre className="bg-muted p-3 rounded-md text-sm">
                  <code>npm install shopify-api-node</code>
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Complete Example: Shopify → ProduktPix → Shopify</h4>
                  <Button size="sm" variant="ghost" onClick={() => copyCode(shopifyNodeExample, 'shopify')}>
                    {copiedCode === 'shopify' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  <code>{shopifyNodeExample}</code>
                </pre>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm mb-1">⚠️ Rate Limiting</h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  When processing a full catalog, add delays between API calls. ProduktPix has per-minute rate limits 
                  (check <a href="/help/api-docs" className="underline">API docs</a> for your plan's limits). 
                  We recommend 2-second delays between products.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhook Setup */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Integration
          </h3>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Setup</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Go to <a href="/account" className="text-primary underline">Account → API Keys</a></li>
                  <li>Click the webhook icon (🌐) on your API key</li>
                  <li>Enter your webhook endpoint URL</li>
                  <li>Copy the generated webhook secret</li>
                  <li>Implement signature verification in your handler</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Events</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="p-3 bg-muted rounded-md">
                    <Badge className="bg-green-100 text-green-700 mb-1">job.completed</Badge>
                    <p className="text-xs text-muted-foreground">Sent when any job (UGC, video, fashion, background) finishes successfully</p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <Badge className="bg-red-100 text-red-700 mb-1">job.failed</Badge>
                    <p className="text-xs text-muted-foreground">Sent when a job fails after all retry attempts</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Webhook Handler Example (Node.js)</h4>
                  <Button size="sm" variant="ghost" onClick={() => copyCode(webhookHandlerExample, 'webhook')}>
                    {copiedCode === 'webhook' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs max-h-80 overflow-y-auto">
                  <code>{webhookHandlerExample}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Retry Policy</h4>
                <p className="text-sm text-muted-foreground">
                  Failed deliveries are retried with exponential backoff: immediately → 1 min → 5 min → 30 min. 
                  After 4 failed attempts, the event is marked as failed.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zapier / Make */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Zapier / Make (Integromat)
          </h3>

          <Card>
            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-muted-foreground">
                Use ProduktPix from Zapier or Make using the built-in <strong>Code</strong> step. 
                No custom app installation needed — just use the HTTP/Code action with your API key.
              </p>

              <div>
                <h4 className="font-semibold mb-2">Zapier: Recommended Workflow</h4>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">Trigger: New Shopify Product</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">Action: Code by Zapier</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">Action: Delay (30s)</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">Action: Code — Check Status</Badge>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Zapier Code Step Example</h4>
                  <Button size="sm" variant="ghost" onClick={() => copyCode(zapierExample, 'zapier')}>
                    {copiedCode === 'zapier' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                  <code>{zapierExample}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Make (Integromat)</h4>
                <p className="text-sm text-muted-foreground">
                  Use the <strong>HTTP — Make a Request</strong> module. Set the URL to <code className="bg-muted px-1 rounded text-xs">{BASE_URL}</code>, 
                  method to POST, and include your API key in the <code className="bg-muted px-1 rounded text-xs">X-API-Key</code> header. 
                  The body structure is identical to the API docs examples.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Other Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Other Platforms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ProduktPix works with any platform that can make HTTP requests. Common integration patterns:
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">WooCommerce</h4>
                <p className="text-xs text-muted-foreground">
                  Use the WooCommerce REST API to fetch product images, send to ProduktPix, and update via the same API.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">BigCommerce</h4>
                <p className="text-xs text-muted-foreground">
                  Use the Catalog API to list products and the Product Images endpoint to push enhanced photos.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Magento / Adobe Commerce</h4>
                <p className="text-xs text-muted-foreground">
                  Use the REST API with catalog/products endpoint to manage product media.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Custom CMS / ERP</h4>
                <p className="text-xs text-muted-foreground">
                  Any system with an API can integrate. Follow the same pattern: fetch → generate → push back.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </HelpLayout>
    </PageTransition>
  );
};

export default IntegrationsDocsPage;
