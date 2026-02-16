import HeroSection from "@/components/landing/HeroSection";
import SecurePublicGallery from "@/components/landing/SecurePublicGallery";
import SocialProofSection from "@/components/landing/SocialProofSection";
import Footer from "@/components/landing/Footer";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, Zap, ArrowRight, Video, Shirt, Images, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useAdminAuth } from "@/hooks/useAdminAuth";
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
import FashionCatalogSection from "@/components/landing/FashionCatalogSection";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import SEO from "@/components/SEO";
import { buildOrganizationSchema, buildWebSiteSchema, buildWebApplicationSchema } from "@/lib/schema";

const mobileModules = [
  { id: "ugc", titleKey: "createSelection.ugcCreator.title", icon: Zap, path: "/create/ugc" },
  { id: "video", titleKey: "createSelection.videoCreator.title", icon: Video, path: "/create/video", needsVideoAccess: true },
  { id: "outfit-swap", titleKey: "createSelection.outfitSwap.title", icon: Shirt, path: "/create/outfit-swap" },
  { id: "bulk-background", titleKey: "createSelection.bulkBackground.title", icon: Images, path: "/create/bulk-background", adminOnly: true },
];

const MobileModuleGrid = ({ navigate, t, canAccessVideos, isAdmin, user }: {
  navigate: (path: string) => void;
  t: (key: string) => string;
  canAccessVideos: () => boolean;
  isAdmin: boolean;
  user: any;
}) => {
  const visibleModules = mobileModules.filter(m => {
    if (m.adminOnly) return isAdmin || user?.email === 'bacalhaustore@gmail.com';
    return true;
  }).slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-3">
      {visibleModules.map((mod) => {
        const locked = mod.needsVideoAccess && !canAccessVideos();
        return (
          <div
            key={mod.id}
            onClick={() => locked ? navigate('/pricing') : navigate(mod.path)}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-apple bg-card border border-border/50 shadow-sm cursor-pointer active:scale-[0.97] transition-transform ${locked ? 'opacity-50' : ''}`}
          >
            <div className={`relative w-10 h-10 rounded-apple flex items-center justify-center bg-primary/10`}>
              <mod.icon className="h-5 w-5 text-primary" />
              {locked && (
                <div className="absolute inset-0 bg-black/50 rounded-apple flex items-center justify-center">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <span className="text-sm font-semibold text-center leading-tight">{t(mod.titleKey)}</span>
          </div>
        );
      })}
    </div>
  );
};

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tier, canAccessVideos } = useCredits();
  const { isAdmin } = useAdminAuth();
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
      <div className="container-responsive px-4 py-8">
        {/* ===== MOBILE LAYOUT ===== */}
        <div className="lg:hidden space-y-4">
          {/* 1. Promo offer banner */}
          {tier === 'Free' ? (
            <div
              onClick={() => navigate("/promo/first-month")}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-purple-600 p-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl p-2 flex-shrink-0">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">{t("promo.mobile.starterOffer")} — €19.99/{t("promo.mobile.firstMonth")}</p>
                  <p className="text-white/70 text-xs">{t("promo.mobile.limitedOffer")}</p>
                </div>
                <Button size="sm" className="bg-white text-primary hover:bg-white/90 text-xs font-bold px-3 h-8 rounded-xl shadow-none flex-shrink-0">
                  {t("promo.mobile.seeOffer")}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
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
          )}

          {/* 2. Hero "Create Images" */}
          <div className="bg-gradient-hero rounded-apple p-8 shadow-apple-lg text-center text-background relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <h1 className="text-3xl font-bold leading-tight">
                {t("index.auth.title")}
              </h1>
              <p className="text-lg opacity-90 leading-relaxed">
                {t("index.auth.subtitle")}
              </p>
              <Button 
                variant="default" 
                size="lg"
                onClick={() => navigate("/create/ugc")}
                className="bg-white text-primary hover:bg-white/90"
              >
                {t("index.auth.startCreating")}
              </Button>
            </div>
          </div>

          {/* 3. First 4 module cards in 2x2 grid */}
          <MobileModuleGrid navigate={navigate} t={t} canAccessVideos={canAccessVideos} isAdmin={isAdmin} user={user} />

          {/* 4. "Discover Possibilities" button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/create")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {t("index.auth.discoverPossibilities", "Discover Possibilities")}
          </Button>
        </div>

        {/* ===== DESKTOP LAYOUT (unchanged) ===== */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
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
                  onClick={() => navigate("/create/ugc")}
                  className="lg:text-lg lg:px-8 lg:py-4 bg-white text-primary hover:bg-white/90"
                >
                  {t("index.auth.startCreating")}
                </Button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <UserStatsPanel />
          </div>
        </div>

        {/* Library Section */}
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

      {/* Fashion Catalog Section */}
      <FashionCatalogSection />

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