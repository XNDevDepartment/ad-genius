import { CheckCircle, ArrowRight, Sparkles, Image, User, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpLayout } from "@/components/help/HelpLayout";
import { useTranslation } from "react-i18next";

const GettingStartedGuide = () => {
  const { t } = useTranslation();

  const steps = [
    {
      id: 1,
      title: t('help.gettingStarted.steps.createAccount.title'),
      description: t('help.gettingStarted.steps.createAccount.description'),
      icon: User,
      completed: true,
      action: t('help.gettingStarted.steps.createAccount.action'),
      link: "/account"
    },
    {
      id: 2,
      title: t('help.gettingStarted.steps.exploreCreate.title'),
      description: t('help.gettingStarted.steps.exploreCreate.description'),
      icon: Sparkles,
      completed: false,
      action: t('help.gettingStarted.steps.exploreCreate.action'),
      link: "/create"
    },
    {
      id: 3,
      title: t('help.gettingStarted.steps.manageLibrary.title'),
      description: t('help.gettingStarted.steps.manageLibrary.description'),
      icon: Image,
      completed: false,
      action: t('help.gettingStarted.steps.manageLibrary.action'),
      link: "/library"
    },
    {
      id: 4,
      title: t('help.gettingStarted.steps.customizeSettings.title'),
      description: t('help.gettingStarted.steps.customizeSettings.description'),
      icon: Settings,
      completed: false,
      action: t('help.gettingStarted.steps.customizeSettings.action'),
      link: "/account"
    }
  ];

  return (
    <HelpLayout title={t('help.gettingStarted.title')} breadcrumbTitle={t('help.gettingStarted.title')}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t('help.gettingStarted.welcome.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('help.gettingStarted.welcome.description')}
          </p>
        </div>

        {/* Steps Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">{t('help.gettingStarted.steps.title')}</h3>
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
                              {t('help.gettingStarted.steps.completed')}
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
        {/* <div className="space-y-6">
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
        </div> */}

        {/* Next Steps */}
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardContent className="p-6 text-center space-y-4">
            <h3 className="text-xl font-semibold">{t('help.gettingStarted.readyToCreate.title')}</h3>
            <p className="opacity-90">
              {t('help.gettingStarted.readyToCreate.description')}
            </p>
            <Button asChild variant="secondary" size="lg">
              <Link to="/create">
                {t('help.gettingStarted.readyToCreate.action')}
                <Sparkles className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Need More Help */}
        <Card className="border-dashed">
          <CardContent className="p-6 text-center space-y-3">
            <h4 className="font-medium">{t('help.gettingStarted.needMoreHelp.title')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('help.gettingStarted.needMoreHelp.description')}
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline" size="sm">
                <Link to="/help/faq">{t('help.gettingStarted.needMoreHelp.viewFaq')}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/help/tutorials">{t('help.gettingStarted.needMoreHelp.watchTutorials')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </HelpLayout>
  );
};

export default GettingStartedGuide;