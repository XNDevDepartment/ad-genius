import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { categories } from "@/data/assistants";


interface DashboardProps {
  onSelectDepartment: (departmentId: string) => void;
}

export const Dashboard = ({ onSelectDepartment }: DashboardProps) => {
  const { user } = useAuth();
  
  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Business AI Hub
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Escolha uma categoria de assistentes AI para começar
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <Card 
              key={category.id}
              className="group relative overflow-hidden bg-gradient-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-elegant cursor-pointer"
              style={{ animationDelay: `${index * 150}ms` }}
              onClick={() => onSelectDepartment(category.id)}
            >
              <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
              
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                    <Icon className="h-6 w-6 text-primary group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                      {category.name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <CardDescription className="text-muted-foreground mb-4">
                  {category.description}
                </CardDescription>
                
                <Button 
                  variant="default"
                  className="w-full group-hover:shadow-glow transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDepartment(category.id);
                  }}
                >
                  Explorar Assistentes
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};