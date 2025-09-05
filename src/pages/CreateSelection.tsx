import { ArrowLeft, Users, Camera, Edit3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const CreateSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

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
      icon: Users,
      path: "/create/ugc"
    },
    {
      id: "studio",
      title: t('createSelection.studioPhotos.title'),
      description: t('createSelection.studioPhotos.description'),
      icon: Camera,
      path: "/create/studio",
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
                workflow.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
              onClick={() => !workflow.disabled && navigate(workflow.path)}
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-apple bg-primary/10 flex items-center justify-center">
                  <workflow.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{workflow.title}</CardTitle>
                <CardDescription>{workflow.description}</CardDescription>
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

export default CreateSelection;