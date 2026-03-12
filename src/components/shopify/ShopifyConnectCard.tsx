import { Store, Key, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface ShopifyConnectCardProps {
  onConnected: () => void;
}

export function ShopifyConnectCard({ onConnected }: ShopifyConnectCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="max-w-lg mx-auto mt-12">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Connect Your Shopify Store</CardTitle>
        <CardDescription>
          Use the ProduktPix Shopify App to link your store. No manual credentials needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">1</div>
            <div>
              <p className="font-medium text-foreground">Install the ProduktPix Shopify App</p>
              <p className="text-sm text-muted-foreground">Find ProduktPix in the Shopify App Store and install it on your store.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">2</div>
            <div>
              <p className="font-medium text-foreground">Enter your ProduktPix API Key</p>
              <p className="text-sm text-muted-foreground">In the Shopify app, paste your API key to connect your store to ProduktPix.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">3</div>
            <div>
              <p className="font-medium text-foreground">Your products appear here</p>
              <p className="text-sm text-muted-foreground">Once connected, sync and manage your Shopify products directly from this dashboard.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => navigate("/account/api-keys")} className="w-full">
            <Key className="h-4 w-4 mr-2" />
            Go to API Keys
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onConnected} className="text-muted-foreground">
            I've already connected — refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
