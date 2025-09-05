import HeroSection from "@/components/landing/HeroSection";
import SecurePublicGallery from "@/components/landing/SecurePublicGallery";
import SocialProofSection from "@/components/landing/SocialProofSection";
import { useNavigate } from "react-router-dom";
import { Camera, Wand2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeatureTile from "@/components/FeatureTile";
import { useAuth } from "@/contexts/AuthContext";
import PricingSection from "@/components/landing/PricingSection";
import HeaderSection from "@/components/landing/HeaderSection";
import { RecentImagesSection } from "@/components/RecentImagesSection";
import { UserStatsPanel } from "@/components/UserStatsPanel";
import FeatureShowcase from "@/components/landing/FeatureShowcase";

const Index = () => {

  const { user } = useAuth();

  const navigate = useNavigate();


  return (
    <div className="min-h-screen bg-background">
    {user ?
      <>
      {/* Home Page */}
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

          {/* User Stats Panel */}
          <div className="lg:col-span-5">
            <UserStatsPanel />
          </div>
        </div>

        {/* Recent Images Section */}
        <div className="mt-8">
          <RecentImagesSection />
        </div>
      </div>
      </>
    :
    <>
    {/* Landing Page */}

      <div className="hidden lg:block">
        <HeaderSection />
      </div>

      {/* Enhanced Hero Section */}
      <HeroSection />

      {/* Feature Section */}
      {/* <FeatureShowcase /> */}

      {/* Public Gallery */}
      <SecurePublicGallery />

      {/* Social Proof and Testimonials */}
      <SocialProofSection />

      {/* Plans & Pricing */}
      <PricingSection />
    </>
    }
    </div>
  )
}

export default Index;