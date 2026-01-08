import HeroSection from "@/components/landing/HeroSection";
import SecurePublicGallery from "@/components/landing/SecurePublicGallery";
import SocialProofSection from "@/components/landing/SocialProofSection";
import Footer from "@/components/landing/Footer";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PricingSection from "@/components/landing/PricingSection";
import HeaderSection from "@/components/landing/HeaderSection";
import { EmbeddedLibrary } from "@/components/EmbeddedLibrary";
import { UserStatsPanel } from "@/components/UserStatsPanel";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import UseCasesSection from "@/components/landing/UseCasesSection";
import VideoShowcaseSection from "@/components/landing/VideoShowcaseSection";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import SEO from "@/components/SEO";
import { buildOrganizationSchema, buildWebSiteSchema, buildWebApplicationSchema } from "@/lib/schema";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if(localStorage.getItem("billing") === 'true'){
      navigate('/pricing')
    }
  }, [localStorage])


  return (
    <div className="min-h-screen bg-background">
      {!user && (
        <SEO
          title="AI Product Image Generator"
          description="Create high-converting AI product photos in seconds. Upload your packshot, pick a scene, and generate studio-quality images for Shopify, Amazon, and ads."
          path="/"
          schema={[buildOrganizationSchema(), buildWebSiteSchema(), buildWebApplicationSchema()]}
        />
      )}
    {user ?
      <OnboardingGuard>
      {/* Home Page */}
      <div className="container-responsive px-4 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          {/* Hero Section */}
          <div className="lg:col-span-7 mb-8 lg:mb-0">
            <div className="bg-gradient-hero rounded-apple p-8 lg:p-12 shadow-apple-lg text-center lg:text-left text-background relative overflow-hidden">
              <div className="relative z-10 space-y-4 lg:space-y-6">
                <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
                  {t("index.auth.title")}
                </h1>
                <p className="text-lg lg:text-xl opacity-90 leading-relaxed max-w-2xl">
                  {t("index.auth.subtitle")}
                </p>
                <Button 
                  variant="default" 
                  size="lg"
                  onClick={() => navigate("/create")}
                  className="mt-6 lg:text-lg lg:px-8 lg:py-4 bg-white text-primary hover:bg-white/90"
                >
                  {t("index.auth.startCreating")}
                </Button>
              </div>
            </div>
          </div>

          {/* User Stats Panel */}
          <div className="lg:col-span-5">
            <UserStatsPanel />
            
            {/* Mobile-only Get More Credits button */}
            <div className="lg:hidden mt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/pricing")}
                className="text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              >
                <Coins className="h-4 w-4 mr-2" />
                {t("index.auth.getMoreCredits")}
              </Button>
            </div>
          </div>
        </div>

        {/* Full Library Section */}
        <div className="mt-8">
          <EmbeddedLibrary />
        </div>
      </div>
      </OnboardingGuard>
    :
    <>
    {/* Landing Page */}

      <div className="hidden lg:block">
        <HeaderSection />
      </div>

      {/* Enhanced Hero Section */}
      <HeroSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Video Showcase Section */}
      <VideoShowcaseSection />

      {/* Feature Section */}
      {/* <FeatureShowcase /> */}

      {/* Public Gallery */}
      <SecurePublicGallery />

      {/* Use Cases Section */}
      <UseCasesSection />

      {/* Social Proof and Testimonials */}
      <SocialProofSection />

      {/* Plans & Pricing */}
      <PricingSection />

      {/* Footer */}
      <Footer />
    </>
    }
    </div>
  )
}

export default Index;