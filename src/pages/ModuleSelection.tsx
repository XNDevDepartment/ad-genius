import { ArrowLeft, Users, Sparkles, Zap, Video, Lock, Shirt, Image as ImageIcon, Images, Camera, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCredits } from "@/hooks/useCredits";


const ModuleSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isAdmin } = useAdminAuth();
  const { canAccessVideos, canAccessOutfitSwap } = useCredits();


  // Block access if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const workflows = [
    {
      id: "ugc",
      title: t('createSelection.ugcCreator.title'),
      description: t('createSelection.ugcCreator.description'),
      icon: Zap,
      path: "/create/ugc",
      isAdmin: false,
      isBeta: false,
    },
    {
      id: "video",
      title: t('createSelection.videoCreator.title'),
      description: t('createSelection.videoCreator.description'),
      icon: Video,
      path: "/create/video",
      isAdmin: false,
      isBeta: false,
      locked: !canAccessVideos()
    },
    // ...(isAdmin ? [{
    //   id: "adgenius",
    //   title: "AdGenius (Admin Only)",
    //   description: "Advanced creative generation for advertising campaigns",
    //   icon: Sparkles,
    //   path: "/create/adgenius",
    //   isAdmin: true
    // }] : []),
     // ...(isAdmin ? [{
  //  ...(isAdmin ? [{
    //   id: "adgenius",
    //   title: "AdGenius (Admin Only)",
    //   description: "Advanced creative generation for advertising campaigns",
    //   icon: Sparkles,
    //   path: "/create/adgenius",
    //   isAdmin: true
    // }] : []),
    {
      id: "outfit-swap",
      title: t('createSelection.outfitSwap.title'),
      description: t('createSelection.outfitSwap.description'),
      icon: Shirt,
      path: "/create/outfit-swap",
      isAdmin: false,
      isBeta: true,
      locked: false
    },

    // ...(isAdmin ? [{
    //   id: "product-studio",
    //   title: "Product Studio Background",
    //   description: "Replace product backgrounds with professional studio quality",
    //   icon: ImageIcon,
    //   path: "/create/product-studio",
    //   isAdmin: true
    // }] : []),
    ...(isAdmin ? [{
      id: "product-studio-bulk",
      title: "Product Studio Bulk",
      description: "Process multiple products at once with batch background replacement",
      icon: Images,
      path: "/create/product-studio-bulk",
      isAdmin: true,
      isBeta: false
    }] : []),
    ...(isAdmin ? [{
      id: "magazine-photoshoot",
      title: "Magazine Photoshoot",
      description: "Transform photos into high-fashion editorial magazine spreads",
      icon: Camera,
      path: "/create/magazine-photoshoot",
      isAdmin: true,
      isBeta: false
    }] : []),
    // ...(isAdmin ? [{
    //   id: "custom-model",
    //   title: "Create Your Own Model",
    //   description: "Train custom base models from your photo sets",
    //   icon: UserPlus,
    //   path: "/create/custom-model",
    //   isAdmin: true
    // }] : []),
    // ...(isAdmin ? [{
    //   id: "video-ads",
    //   title: "Video Ads",
    //   description: "Generate short video advertisements from product images",
    //   icon: Video,
    //   path: "/create/video-ads",
    //   isAdmin: true
    // }] : []),
    {
      id: "soon",
      title: "In Progress",
      description: 'We are working daily on improving our platform. You will be the first to know the news!',
      icon: Sparkles,
      path: "",
      disabled: true
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
            <h1 className="text-3xl font-bold text-foreground">
              {t('createSelection.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('createSelection.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Card 
              key={workflow.id}
              className={`bg-transparent shadow-md cursor-pointer transition-all hover:shadow-lg ${
                workflow.disabled || workflow.locked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              } ${workflow.isAdmin ? 'border-2 border-orange-500/30 bg-orange-500/5' : ''} ${
                workflow.isBeta && !workflow.isAdmin ? 'border-2 border-purple-500/30 bg-purple-500/5' : ''
              }`}
              onClick={() => {
                if (workflow.locked) {
                  navigate('/pricing');
                } else if (!workflow.disabled) {
                  navigate(workflow.path);
                }
              }}
            >
              <CardHeader className="text-center">
              <div className={`relative w-16 h-16 mx-auto mb-4 rounded-apple flex items-center justify-center ${
                  workflow.isAdmin ? 'bg-orange-500/20' : 
                  workflow.isBeta ? 'bg-purple-500/20' : 
                  'bg-primary/10'
                }`}>
                  <workflow.icon className={`h-8 w-8 ${
                    workflow.isAdmin ? 'text-orange-500' : 
                    workflow.isBeta ? 'text-purple-500' : 
                    'text-primary'
                  }`} />
                  {workflow.locked && (
                    <div className="absolute inset-0 bg-black/50 rounded-apple flex items-center justify-center">
                      <Lock className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl flex items-center gap-2 justify-center flex-wrap">
                  {workflow.title}
                  {workflow.isAdmin && (
                    <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">ADMIN</span>
                  )}
                  {workflow.isBeta && !workflow.isAdmin && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">NEW</span>
                  )}
                  {workflow.locked && (
                    <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full">PLUS+</span>
                  )}
                </CardTitle>
                <CardDescription>
                  {workflow.locked && workflow.isBeta
                    ? "Upgrade to any paid plan to access this beta feature. Help us perfect outfit-swap!"
                    : workflow.locked 
                    ? "Upgrade to Plus or use Free tier to unlock video generation"
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
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModuleSelection;