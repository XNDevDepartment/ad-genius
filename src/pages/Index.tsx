
import HeroSection from "@/components/landing/HeroSection";
import PublicGallery from "@/components/landing/PublicGallery";
import SocialProofSection from "@/components/landing/SocialProofSection";
import { useNavigate } from "react-router-dom";
import { Camera, Wand2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeatureTile from "@/components/FeatureTile";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {

  const { user } = useAuth();

  const navigate = useNavigate();

  const features = [
    {
      id: "ugc",
      title: "UGC Creator",
      description: "Create authentic user-generated content that converts with AI-powered product photography",
      icon: <Camera className="h-8 w-8 text-primary" />,
      available: true,
      onClick: () => navigate("/create/ugc"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
    {user ?
      <>
      <div className="container-responsive px-4 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          {/* Hero Section */}
          <div className="lg:col-span-7 mb-8 lg:mb-0">
            <div className="bg-gradient-hero rounded-apple p-8 lg:p-12 shadow-apple-lg text-center lg:text-left text-background relative overflow-hidden">
              <div className="relative z-10 space-y-4 lg:space-y-6">
                <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
                  Create product images that sell
                </h1>
                <p className="text-lg lg:text-xl opacity-90 leading-relaxed max-w-2xl">
                  Transform your products into stunning, conversion-focused imagery with AI
                </p>
                <Button 
                  variant="default" 
                  size="lg"
                  onClick={() => navigate("/create")}
                  className="mt-6 lg:text-lg lg:px-8 lg:py-4 bg-white text-primary hover:bg-white/90"
                >
                  Start Creating
                </Button>
              </div>
            </div>
          </div>

          {/* Feature Tiles */}
          <div className="lg:col-span-5">
            <div className="space-y-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-center lg:text-left text-foreground">
                Choose Your Workflow
              </h2>

              <div className="grid gap-4 lg:gap-6">
                {features.map((feature) => (
                  <FeatureTile
                    key={feature.id}
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                    available={feature.available}
                    onClick={feature.onClick}
                    className="lg:p-8"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats or Additional Info for Desktop */}
        <div className="hidden lg:block mt-16 pt-16 border-t border-border/50">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Images Generated</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">95%</div>
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">2.5x</div>
              <div className="text-sm text-muted-foreground">Faster Creation</div>
            </div>
          </div>
        </div>
      </div>
      </>
    :
    <>
      {/* Enhanced Hero Section */}
      <HeroSection />

      {/* Public Gallery */}
      <PublicGallery />

      {/* Social Proof and Testimonials */}
      <SocialProofSection />
    </>
    }
    </div>
  )
};

export default Index;
