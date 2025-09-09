import { useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpLayout } from "@/components/help/HelpLayout";

const faqCategories = [
  {
    name: "Account & Setup",
    badge: "Popular",
    questions: [
      {
        q: "Can I change my email address?",
        a: "Yes, you can update your email address in your account settings. Go to Account > Settings > Profile Information to make changes."
      },
      {
        q: "How do I reset my password?",
        a: "Click on 'Forgot Password' on the login page, enter your email, and we'll send you a password reset link."
      }
    ]
  },
  {
    name: "Content Creation",
    badge: "Essential",
    questions: [
      {
        q: "What types of content can I create?",
        a: "Genius UGC supports creating various types of user-generated content including social media posts, product environment demonstrations, product positionings, and marketing materials using AI-powered tools."
      },
      {
        q: "How does the AI content generation work?",
        a: "Our Genius AI analyzes your input prompts and preferences to generate relevant, high-quality content. You can customize the light, style, and format to match your desire."
      },
      {
        q: "Can I edit generated content?",
        a: "For the moment you cannot! We are working on developing the ProduktPix with a goal to become the number one mobile marketing agent in order to quickly and efficiently help people sell their products."
      },
      {
        q: "What file formats are supported?",
        a: "We support popular formats including JPG, PNG for images, and various text formats for written content."
      }
    ]
  },
  {
    name: "Billing & Plans",
    badge: "Important",
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, MasterCard, American Express) and PayPal for your convenience."
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "Yes, you can cancel your subscription at any time from your billing settings. Your access will continue until the end of your current billing period."
      },
      {
        q: "Do you offer refunds?",
        a: "We offer a 14-day money-back guarantee for new subscribers. Contact our support team if you're not satisfied with the service."
      },
      {
        q: "What happens when I reach my usage limit?",
        a: "When you reach your plan's limit, you can either upgrade to a higher plan or wait for your next billing cycle to reset your usage."
      }
    ]
  },
  {
    name: "Technical Support",
    questions: [
      {
        q: "Why is content generation taking so long?",
        a: "Generation times can vary based on complexity and server load. Most content is generated within 30-60 seconds. If you experience longer delays, try refreshing the page."
      },
      {
        q: "My generated content doesn't match my request",
        a: "Try being more specific in your details and audience. Include details about usability, size, niched target audience, and specific requirements for better results."
      },
      {
        q: "Can I use the platform on mobile devices?",
        a: "Yes! Genius UGC is fully responsive and works great on mobile devices, tablets, and desktop computers."
      },
      {
        q: "How do I report a bug or issue?",
        a: "You can report bugs through our support contact form or email us directly. Please include details about what you were doing when the issue occurred."
      }
    ]
  }
];

const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      item => 
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <HelpLayout title="Frequently Asked Questions" breadcrumbTitle="FAQ">
      <div className="space-y-8">
        {/* Search Section */}
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">How can we help you?</h2>
            <p className="text-muted-foreground">
              Search our knowledge base or browse categories below
            </p>
          </div>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
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
                <h3 className="text-lg font-medium">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or browse all categories
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm("")}
                >
                  Clear Search
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
              <h3 className="text-xl font-semibold">Still need help?</h3>
              <p className="text-muted-foreground">
                Can't find what you're looking for? Our support team is here to help.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline">
                <Link to="/account">Contact Support</Link>
              </Button>
              <Button asChild>
                <Link to="/help/getting-started">Getting Started Guide</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </HelpLayout>
  );
};

export default FAQPage;