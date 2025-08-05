import { ArrowLeft, Users, Camera, Edit3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const CreateSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
      description: "Create authentic user-generated content with AI assistance",
      icon: Users,
      path: "/create/ugc"
    },
    {
      id: "studio",
      title: "Studio Photos",
      description: "Generate professional product photography",
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
              Escolha seu Fluxo de Trabalho
            </h1>
            <p className="text-muted-foreground">
              Selecione o tipo de conteúdo que deseja criar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Card 
              key={workflow.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
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
                      Em breve
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