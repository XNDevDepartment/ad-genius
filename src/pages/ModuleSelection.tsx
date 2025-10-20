import { ArrowLeft, Users, Sparkles, Zap, Video, Lock, Shirt } from "lucide-react";
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
  const { canAccessVideos } = useCredits();

  // Block access if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const workflows = [
    {
      id: "ugc",
      title: "UGC Creator",
      description: "Create realistic UGC content using our Genius XN framework",
      icon: Zap,
      path: "/create/ugc",
      isAdmin: false
    },
    {
      id: "video",
      title: t('createSelection.videoCreator.title'),
      description: t('createSelection.videoCreator.description'),
      icon: Video,
      path: "/create/video",
      isAdmin: false,
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
    ...(isAdmin ? [{
      id: "outfit-swap",
      title: "Outfit Swap (Admin Only)",
      description: "AI-powered outfit replacement on person photos",
      icon: Shirt,
      path: "/create/outfit-swap",
      isAdmin: true
    }] : []),
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
              } ${workflow.isAdmin ? 'border-2 border-orange-500/30 bg-orange-500/5' : ''}`}
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
                  workflow.isAdmin ? 'bg-orange-500/20' : 'bg-primary/10'
                }`}>
                  <workflow.icon className={`h-8 w-8 ${workflow.isAdmin ? 'text-orange-500' : 'text-primary'}`} />
                  {workflow.locked && (
                    <div className="absolute inset-0 bg-black/50 rounded-apple flex items-center justify-center">
                      <Lock className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl flex items-center gap-2 justify-center">
                  {workflow.title}
                  {workflow.isAdmin && (
                    <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">ADMIN</span>
                  )}
                  {workflow.locked && (
                    <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full">PLUS+</span>
                  )}
                </CardTitle>
                <CardDescription>
                  {workflow.locked 
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