import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Image, MessageSquare, BarChart3, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: "active" | "coming-soon";
  requireAuth: boolean;
}

const departments: Department[] = [
  {
    id: "ugc_creator",
    name: "Criador UGC",
    description: "Transforme imagens de produtos em conteúdo envolvente gerado pelo usuário com IA",
    icon: Image,
    status: "active",
    requireAuth: true,
  },
  // {
  //   id: "lead-magnet-creator",
  //   name: "Lead Magnet Creator",
  //   description: "Creative creator for lead capture ads with Lead Magnets",
  //   icon: MessageSquare,
  //   status: "coming-soon",
  //   requireAuth: false,
  // },
  // {
  //   id: "analytics-advisor",
  //   name: "Analytics Advisor",
  //   description: "Get insights and recommendations from your business data",
  //   icon: BarChart3,
  //   status: "coming-soon",
  //   requireAuth: false,
  // },
  // {
  //   id: "customer-insights",
  //   name: "Customer Insights",
  //   description: "Understand your customers better with AI-powered analysis",
  //   icon: Users,
  //   status: "coming-soon",
  //   requireAuth: false,
  // }
];


interface DashboardProps {
  onSelectDepartment: (departmentId: string) => void;
}

export const Dashboard = ({ onSelectDepartment }: DashboardProps) => {
  const { user, signOut } = useAuth();
  
  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Business AI XN
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Potencialize suas operações empresariais com assistentes de IA especializados para cada departamento
        </p>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {departments.map((department, index) => {
          const Icon = department.icon;
          return (
            <Card 
              key={department.id}
              className="group relative overflow-hidden bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-elegant cursor-pointer"
              style={{ animationDelay: `${index * 150}ms` }}
              onClick={() => {
                if(department.requireAuth && !user){
                  toast.error('Você deve se autenticar para usar esta função');
                }else{
                  department.status === "active" && onSelectDepartment(department.id)
                }
              }}
            >
              <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
              
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                    <Icon className="h-6 w-6 text-primary group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                        {department.name}
                      </CardTitle>
                      {department.status === "active" && (
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        </div>
                      )}
                      {department.status === "coming-soon" && (
                        <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md">
                          Em Breve
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <CardDescription className="text-muted-foreground mb-4">
                  {department.description}
                </CardDescription>
                
                <Button 
                  variant={department.status === "active" ? "default" : "secondary"}
                  disabled={department.status === "coming-soon" || (department.requireAuth && !user)}
                  className="w-full group-hover:shadow-glow transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    department.status === "active" && onSelectDepartment(department.id);
                  }}
                >
                  {department.status === "active" ? "Iniciar Assistente" : "Em Breve"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};