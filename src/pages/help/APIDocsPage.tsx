import { useState } from "react";
import { Code, Copy, ExternalLink, Key, Shield, Zap, Globe, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpLayout } from "@/components/help/HelpLayout";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/content/generate",
    description: "Generate new UGC content",
    parameters: ["prompt", "type", "style", "format"],
    auth: true
  },
  {
    method: "GET",
    path: "/api/v1/content",
    description: "Retrieve user's content library",
    parameters: ["limit", "offset", "filter"],
    auth: true
  },
  {
    method: "GET",
    path: "/api/v1/content/{id}",
    description: "Get specific content by ID",
    parameters: ["id"],
    auth: true
  },
  {
    method: "DELETE",
    path: "/api/v1/content/{id}",
    description: "Delete content from library",
    parameters: ["id"],
    auth: true
  },
  {
    method: "GET",
    path: "/api/v1/user/profile",
    description: "Get user profile information",
    parameters: [],
    auth: true
  },
  {
    method: "GET",
    path: "/api/v1/usage",
    description: "Get API usage statistics",
    parameters: ["period"],
    auth: true
  }
];

const codeExamples = {
  javascript: `// Generate content using fetch API
const response = await fetch('https://api.geniusugc.com/v1/content/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Create a product review for wireless headphones',
    type: 'review',
    style: 'professional',
    format: 'text'
  })
});

const data = await response.json();
console.log(data);`,

  python: `import requests

# Generate content using Python
url = "https://api.geniusugc.com/v1/content/generate"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "prompt": "Create a product review for wireless headphones",
    "type": "review", 
    "style": "professional",
    "format": "text"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result)`,

  curl: `# Generate content using cURL
curl -X POST "https://api.geniusugc.com/v1/content/generate" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Create a product review for wireless headphones",
    "type": "review",
    "style": "professional", 
    "format": "text"
  }'`
};

const rateLimits = [
  {
    plan: "Free",
    requests: "100 requests/hour",
    daily: "1,000 requests/day",
    burst: "10 requests/minute"
  },
  {
    plan: "Pro",
    requests: "1,000 requests/hour", 
    daily: "10,000 requests/day",
    burst: "50 requests/minute"
  },
  {
    plan: "Enterprise",
    requests: "10,000 requests/hour",
    daily: "100,000 requests/day",
    burst: "200 requests/minute"
  }
];

const getMethodColor = (method: string) => {
  switch (method) {
    case "GET": return "bg-green-100 text-green-700";
    case "POST": return "bg-blue-100 text-blue-700";
    case "PUT": return "bg-yellow-100 text-yellow-700";
    case "DELETE": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
};

const APIDocsPage = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <HelpLayout title="API Documentation" breadcrumbTitle="API Docs">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Genius UGC API</h2>
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              v1.0 Stable
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Integrate Genius UGC's content generation capabilities into your applications. 
            Our REST API provides programmatic access to all platform features.
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
              <code className="block bg-muted p-3 rounded-md text-sm">
                https://api.geniusugc.com/v1
              </code>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Authentication</h4>
              <p className="text-sm text-muted-foreground">
                All API requests require authentication using Bearer tokens in the Authorization header.
              </p>
              <code className="block bg-muted p-3 rounded-md text-sm">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                Get your API key from your account settings. Keep it secure and never expose it in client-side code.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">API Endpoints</h3>
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getMethodColor(endpoint.method)}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                    </div>
                    {endpoint.auth && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Auth Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {endpoint.description}
                  </p>
                  {endpoint.parameters.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-xs font-medium text-muted-foreground">Parameters:</h5>
                      <div className="flex flex-wrap gap-1">
                        {endpoint.parameters.map((param, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {param}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Code Examples */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Code Examples</h3>
          <Tabs defaultValue="javascript" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>

            {Object.entries(codeExamples).map(([lang, code]) => (
              <TabsContent key={lang} value={lang}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">Generate Content - {lang}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(code, lang)}
                    >
                      {copiedCode === lang ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
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

        {/* Rate Limits */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Rate Limits</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {rateLimits.map((limit, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base">{limit.plan} Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hourly:</span>
                      <span className="font-medium">{limit.requests}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Daily:</span>
                      <span className="font-medium">{limit.daily}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Burst:</span>
                      <span className="font-medium">{limit.burst}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Rate limits are enforced per API key. Exceeding limits will result in HTTP 429 responses.
            </AlertDescription>
          </Alert>
        </div>

        {/* Error Handling */}
        <Card>
          <CardHeader>
            <CardTitle>Error Handling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The API uses conventional HTTP response codes to indicate success or failure.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Badge className="bg-green-100 text-green-700 mb-2">200 OK</Badge>
                  <p className="text-muted-foreground">Request successful</p>
                </div>
                <div>
                  <Badge className="bg-red-100 text-red-700 mb-2">400 Bad Request</Badge>
                  <p className="text-muted-foreground">Invalid request parameters</p>
                </div>
                <div>
                  <Badge className="bg-red-100 text-red-700 mb-2">401 Unauthorized</Badge>
                  <p className="text-muted-foreground">Invalid or missing API key</p>
                </div>
                <div>
                  <Badge className="bg-red-100 text-red-700 mb-2">429 Too Many Requests</Badge>
                  <p className="text-muted-foreground">Rate limit exceeded</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDKs and Tools */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-6 text-center space-y-4">
            <Globe className="h-12 w-12 mx-auto text-primary" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">SDKs Coming Soon</h3>
              <p className="text-muted-foreground">
                We're working on official SDKs for popular programming languages and frameworks.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Request SDK
              </Button>
              <Button variant="outline" size="sm">
                Join Beta Program
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </HelpLayout>
  );
};

export default APIDocsPage;