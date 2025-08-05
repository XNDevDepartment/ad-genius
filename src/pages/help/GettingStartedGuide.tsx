import { CheckCircle, ArrowRight, Sparkles, Image, User, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpLayout } from "@/components/help/HelpLayout";

const steps = [
  {
    id: 1,
    title: "Create Your Account",
    description: "Sign up and verify your email to get started with Genius UGC",
    icon: User,
    completed: true,
    action: "Go to Profile",
    link: "/account"
  },
  {
    id: 2,
    title: "Explore the Create Section",
    description: "Learn how to generate UGC content using our AI-powered tools",
    icon: Sparkles,
    completed: false,
    action: "Start Creating",
    link: "/create"
  },
  {
    id: 3,
    title: "Manage Your Library",
    description: "Organize and access all your generated content in one place",
    icon: Image,
    completed: false,
    action: "View Library",
    link: "/library"
  },
  {
    id: 4,
    title: "Customize Settings",
    description: "Personalize your experience and notification preferences",
    icon: Settings,
    completed: false,
    action: "Open Settings",
    link: "/account"
  }
];

const tips = [
  {
    title: "Start with Templates",
    description: "Use our pre-built templates to create content faster and learn the platform."
  },
  {
    title: "Save Your Favorites",
    description: "Mark your best content as favorites for easy access later."
  },
  {
    title: "Explore Different Styles",
    description: "Experiment with various AI models and settings to find your unique style."
  },
  {
    title: "Join the Community",
    description: "Connect with other creators and share your experiences."
  }
];

const GettingStartedGuide = () => {
  return (
    <HelpLayout title="Getting Started Guide" breadcrumbTitle="Getting Started">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Welcome to Genius UGC! 🚀
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get up and running in minutes with our step-by-step guide. 
            Create amazing UGC content with the power of AI.
          </p>
        </div>

        {/* Steps Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Quick Setup Steps</h3>
          <div className="grid gap-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.id} className="relative overflow-hidden">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{step.title}</h4>
                          {step.completed && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={step.link}>
                        {step.action}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tips Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Pro Tips for Success</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {tips.map((tip, index) => (
              <Card key={index} className="bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{tip.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardContent className="p-6 text-center space-y-4">
            <h3 className="text-xl font-semibold">Ready to Create?</h3>
            <p className="opacity-90">
              Now that you're set up, let's create your first UGC content!
            </p>
            <Button asChild variant="secondary" size="lg">
              <Link to="/create">
                Start Creating Content
                <Sparkles className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Need More Help */}
        <Card className="border-dashed">
          <CardContent className="p-6 text-center space-y-3">
            <h4 className="font-medium">Need More Help?</h4>
            <p className="text-sm text-muted-foreground">
              Explore our other resources or contact support
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline" size="sm">
                <Link to="/help/faq">View FAQ</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/help/tutorials">Watch Tutorials</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </HelpLayout>
  );
};

export default GettingStartedGuide;