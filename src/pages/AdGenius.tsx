import { useEffect } from "react";
import { ArrowLeft, Sparkles, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageTransition } from "@/components/PageTransition";

const AdGenius = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading } = useAdminAuth();

  useEffect(() => {
    if (!user) {
      navigate('/account');
    } else if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                AdGenius
              </h1>
              <span className="inline-flex items-center gap-1 text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
                <Shield className="h-3 w-3" />
                ADMIN ONLY
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Advanced creative generation platform for advertising campaigns
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6">
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            AdGenius is currently in development. This module will provide advanced AI-powered creative generation 
            specifically designed for advertising campaigns, including batch generation, brand consistency tools, 
            and campaign analytics.
          </AlertDescription>
        </Alert>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-lg">Batch Generation</CardTitle>
              <CardDescription>
                Generate multiple creative variations at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Create dozens of ad variations in seconds with customizable parameters.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-lg">Brand Consistency</CardTitle>
              <CardDescription>
                Maintain visual identity across campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Upload brand guidelines and ensure all generated creatives match your brand.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-lg">A/B Testing</CardTitle>
              <CardDescription>
                Generate variations optimized for testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Create multiple versions with controlled variations for effective A/B testing.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-lg">Campaign Analytics</CardTitle>
              <CardDescription>
                Track performance across campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Integrated analytics to measure creative performance and ROI.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-lg">Multi-Platform Export</CardTitle>
              <CardDescription>
                Export in formats for all major platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: One-click export to Facebook, Instagram, Google Ads, and more.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-lg">Team Collaboration</CardTitle>
              <CardDescription>
                Work together on creative campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Share projects, leave comments, and collaborate with your team.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Stay Tuned</h3>
              <p className="text-muted-foreground mb-4">
                AdGenius is being actively developed. Check back soon for updates!
              </p>
              <Button onClick={() => navigate("/create")}>
                Back to Modules
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </PageTransition>
  );
};

export default AdGenius;
