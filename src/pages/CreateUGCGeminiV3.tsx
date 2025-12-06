import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Admin-only placeholder page for Gemini 3.0 testing
// This is a simplified version - the full implementation would mirror CreateUGCGemini.tsx
// but use useGeminiV3ImageJob hook instead

const CreateUGCGeminiV3 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  UGC Gemini 3.0 Testing
                </h1>
                <Badge className="bg-orange-500 text-white">ADMIN</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Testing gemini-3-pro-image-preview endpoint
              </p>
            </div>
          </div>
        </div>

        <Card className="border-2 border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Admin Testing Module
            </CardTitle>
            <CardDescription>
              This module uses the gemini-3-pro-image-preview model for testing purposes.
              Images generated here are tagged with model_type: 'gemini-v3' for easy comparison.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-orange-500/10 rounded-lg">
              <h3 className="font-semibold text-orange-600 mb-2">Model Information</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Model:</strong> gemini-3-pro-image-preview</li>
                <li>• <strong>Credits:</strong> Free for admin testing</li>
                <li>• <strong>Storage:</strong> Images saved with model_type: 'gemini-v3'</li>
              </ul>
            </div>
            
            <div className="p-4 border border-dashed border-orange-500/50 rounded-lg text-center">
              <p className="text-muted-foreground mb-4">
                Full UGC generation interface coming soon. This page will mirror the main UGC creator but use Gemini 3.0.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/create/ugc")}
                className="border-orange-500/50 hover:bg-orange-500/10"
              >
                Go to Regular UGC Creator
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateUGCGeminiV3;
