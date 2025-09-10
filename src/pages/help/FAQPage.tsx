import { useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpLayout } from "@/components/help/HelpLayout";
import { useTranslation } from "react-i18next";

const FAQPage = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const faqCategories = [
    {
      name: t('help.faq.categories.accountSetup.name'),
      badge: t('help.faq.categories.accountSetup.badge'),
      questions: [
        {
          q: t('help.faq.categories.accountSetup.questions.changeEmail.q'),
          a: t('help.faq.categories.accountSetup.questions.changeEmail.a')
        },
        {
          q: t('help.faq.categories.accountSetup.questions.resetPassword.q'),
          a: t('help.faq.categories.accountSetup.questions.resetPassword.a')
        }
      ]
    },
    {
      name: t('help.faq.categories.contentCreation.name'),
      badge: t('help.faq.categories.contentCreation.badge'),
      questions: [
        {
          q: t('help.faq.categories.contentCreation.questions.contentTypes.q'),
          a: t('help.faq.categories.contentCreation.questions.contentTypes.a')
        },
        {
          q: t('help.faq.categories.contentCreation.questions.aiGeneration.q'),
          a: t('help.faq.categories.contentCreation.questions.aiGeneration.a')
        },
        {
          q: t('help.faq.categories.contentCreation.questions.editContent.q'),
          a: t('help.faq.categories.contentCreation.questions.editContent.a')
        },
        {
          q: t('help.faq.categories.contentCreation.questions.fileFormats.q'),
          a: t('help.faq.categories.contentCreation.questions.fileFormats.a')
        }
      ]
    },
    {
      name: t('help.faq.categories.billingPlans.name'),
      badge: t('help.faq.categories.billingPlans.badge'),
      questions: [
        {
          q: t('help.faq.categories.billingPlans.questions.paymentMethods.q'),
          a: t('help.faq.categories.billingPlans.questions.paymentMethods.a')
        },
        {
          q: t('help.faq.categories.billingPlans.questions.cancelSubscription.q'),
          a: t('help.faq.categories.billingPlans.questions.cancelSubscription.a')
        },
        {
          q: t('help.faq.categories.billingPlans.questions.refunds.q'),
          a: t('help.faq.categories.billingPlans.questions.refunds.a')
        },
        {
          q: t('help.faq.categories.billingPlans.questions.usageLimit.q'),
          a: t('help.faq.categories.billingPlans.questions.usageLimit.a')
        }
      ]
    },
    {
      name: t('help.faq.categories.technicalSupport.name'),
      questions: [
        {
          q: t('help.faq.categories.technicalSupport.questions.generationTime.q'),
          a: t('help.faq.categories.technicalSupport.questions.generationTime.a')
        },
        {
          q: t('help.faq.categories.technicalSupport.questions.contentMismatch.q'),
          a: t('help.faq.categories.technicalSupport.questions.contentMismatch.a')
        },
        {
          q: t('help.faq.categories.technicalSupport.questions.mobileSupport.q'),
          a: t('help.faq.categories.technicalSupport.questions.mobileSupport.a')
        },
        {
          q: t('help.faq.categories.technicalSupport.questions.reportBug.q'),
          a: t('help.faq.categories.technicalSupport.questions.reportBug.a')
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      item => 
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <HelpLayout title={t('help.faq.title')} breadcrumbTitle="FAQ">
      <div className="space-y-8">
        {/* Search Section */}
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{t('help.faq.subtitle')}</h2>
            <p className="text-muted-foreground">
              {t('help.faq.description')}
            </p>
          </div>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('help.faq.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-6">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category, categoryIndex) => (
              <Card key={categoryIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.name}
                    {category.badge && (
                      <Badge variant="secondary">{category.badge}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {category.questions.map((item, index) => (
                      <AccordionItem key={index} value={`item-${categoryIndex}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="text-center p-8">
              <CardContent className="space-y-4">
                <h3 className="text-lg font-medium">{t('help.faq.noResults.title')}</h3>
                <p className="text-muted-foreground">
                  {t('help.faq.noResults.description')}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm("")}
                >
                  {t('help.faq.noResults.clearSearch')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Still Need Help */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="p-6 text-center space-y-4">
            <MessageCircle className="h-12 w-12 mx-auto text-primary" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{t('help.faq.stillNeedHelp.title')}</h3>
              <p className="text-muted-foreground">
                {t('help.faq.stillNeedHelp.description')}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline">
                <Link to="/account">{t('help.faq.stillNeedHelp.contactSupport')}</Link>
              </Button>
              <Button asChild>
                <Link to="/help/getting-started">{t('help.faq.stillNeedHelp.gettingStarted')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </HelpLayout>
  );
};

export default FAQPage;