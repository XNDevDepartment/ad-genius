import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, Zap, ArrowRight, Video, Shirt, Images, Sparkles, Lock } from "lucide-react";
import { MobileCreditCard } from "@/components/MobileCreditCard";
import { StickyUpgradeBar } from "@/components/StickyUpgradeBar";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { EmbeddedLibrary } from "@/components/EmbeddedLibrary";
import { UserStatsPanel } from "@/components/UserStatsPanel";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import SEO from "@/components/SEO";
import { buildOrganizationSchema, buildWebSiteSchema, buildWebApplicationSchema } from "@/lib/schema";
import LandingPageV2 from "@/pages/LandingPageV2";

const mobileModules = [
  { id: "ugc", titleKey: "createSelection.ugcCreator.title", icon: Zap, path: "/create/ugc" },
  { id: "video", titleKey: "createSelection.videoCreator.title", icon: Video, path: "/create/video" },
  { id: "outfit-swap", titleKey: "createSelection.outfitSwap.title", icon: Shirt, path: "/create/outfit-swap" },
  { id: "bulk-background", titleKey: "createSelection.bulkBackground.title", icon: Images, path: "/create/bulk-background", needsPaid: true },
];

const MobileModuleGrid = ({ navigate, t, canAccessVideos, isAdmin, user, isFreeTier }: {
  navigate: (path: string) => void;
  t: (key: string) => string;
  canAccessVideos: () => boolean;
  isAdmin: boolean;
  user: any;
  isFreeTier: () => boolean;
}) => {
  const visibleModules = mobileModules.slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-3">
      {visibleModules.map((mod) => {
        const locked = (mod.needsPaid && isFreeTier());
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
  const { tier, canAccessVideos, isFreeTier } = useCredits();
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
                onClick={() => navigate("/create")}
                className="bg-white text-primary hover:bg-white/90"
              >
                {t("index.auth.startCreating")}
              </Button>
            </div>
          </div>

          {/* 1. Credit Card / Promo */}
          {tier === 'Free' ? (
            <MobileCreditCard />
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


          {/* 3. First 4 module cards in 2x2 grid */}
          <MobileModuleGrid navigate={navigate} t={t} canAccessVideos={canAccessVideos} isAdmin={isAdmin} user={user} isFreeTier={isFreeTier} />

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
                  onClick={() => navigate("/create")}
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

        {/* Sticky upgrade bar - mobile only */}
        <StickyUpgradeBar />
      </div>
      </OnboardingGuard>
    :
    <LandingPageV2 />
    }
    </div>
  )
}

export default Index;