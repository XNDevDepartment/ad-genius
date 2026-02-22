import { ArrowLeft, Sparkles, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCredits } from "@/hooks/useCredits";

import demoUgc from "@/assets/demo.webp";
import demoVideo from "https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/public/videos/kling/08683258-dabb-4646-9079-9c9c1c32da3b/197f2e74-118b-4dbc-9bcd-c54b2c3a03de.mp4";
import demoOutfit from "@/assets/outfit_square_final.png";
import demoBulk from "https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/public/bulk-background-product-views/4e962775-cb55-4301-bc33-081eacb96c46/6a188a90-00b4-43ae-94ed-56b8b3061f01/macro.webp";

const ModuleSelection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const { isFreeTier } = useCredits();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/account');
    }
  }, [user, loading, navigate]);

  if (loading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const workflows = [
    {
      id: "ugc",
      title: t('createSelection.ugcCreator.title'),
      description: t('createSelection.ugcCreator.description'),
      path: "/create/ugc",
      demoImage: demoUgc,
      isBeta: false,
    },
    {
      id: "video",
      title: t('createSelection.videoCreator.title'),
      description: t('createSelection.videoCreator.description'),
      path: "/create/video",
      demoImage: demoVideo,
      isBeta: false,
      locked: false,
    },
    {
      id: "outfit-swap",
      title: t('createSelection.outfitSwap.title'),
      description: t('createSelection.outfitSwap.description'),
      path: "/create/outfit-swap",
      demoImage: demoOutfit,
      isBeta: false,
      locked: false,
    },
    {
      id: "bulk-background",
      title: t('createSelection.bulkBackground.title'),
      description: t('createSelection.bulkBackground.description'),
      path: "/create/bulk-background",
      demoImage: demoBulk,
      isBeta: true,
      locked: isFreeTier(),
    },
    {
      id: "soon",
      title: "In Progress",
      description: 'We are working daily on improving our platform. You will be the first to know the news!',
      path: "",
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">
              {t('createSelection.title')}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {t('createSelection.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {workflows.map((workflow) => (
            <Card 
              key={workflow.id}
              className={`bg-transparent shadow-md cursor-pointer transition-all hover:shadow-lg overflow-hidden
                ${workflow.disabled || workflow.locked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} 
                ${workflow.isBeta ? 'border-2 border-purple-500/30 bg-purple-500/5' : ''}`}
              onClick={() => {
                if (workflow.locked) {
                  navigate('/pricing');
                } else if (!workflow.disabled) {
                  navigate(workflow.path);
                }
              }}
            >
              {/* Mobile layout */}
              <div className="md:hidden relative">
                {workflow.demoImage ? (
                  <div className="relative aspect-square">
                    <img 
                      src={workflow.demoImage} 
                      alt={workflow.title}
                      className="w-full h-full object-cover"
                    />
                    {workflow.locked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                      <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">
                        {workflow.title}
                      </h3>
                      {workflow.isBeta && (
                        <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full mt-1 inline-block">NEW</span>
                      )}
                      {workflow.locked && (
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full mt-1 inline-block">PLUS+</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 p-4 aspect-square">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-center leading-tight">{workflow.title}</h3>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">Soon</span>
                  </div>
                )}
              </div>

              {/* Desktop layout */}
              <div className="hidden md:block">
                {workflow.demoImage ? (
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={workflow.demoImage} 
                      alt={workflow.title}
                      className="w-full h-full object-cover"
                    />
                    {workflow.locked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center bg-muted/30">
                    <Sparkles className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <CardHeader className="pt-4 pb-2">
                  <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                    {workflow.title}
                    {workflow.isBeta && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">NEW</span>
                    )}
                    {workflow.locked && (
                      <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full">PLUS+</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {workflow.locked
                      ? "Upgrade to Plus to access this feature"
                      : workflow.description
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {workflow.disabled && (
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-apple-sm">
                        {t('createSelection.comingSoon')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModuleSelection;
