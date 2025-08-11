import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Star, Zap, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderSection from "@/components/landing/HeaderSection";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    period: "",
    description: "Perfect for getting started with AI image generation",
    credits: 30,
    features: [
      "30 credits per month",
      "Medium quality images (1.5 credits each)",
      "Up to 20 images per month",
      "Basic templates",
      "Community support",
      "Standard processing time"
    ],
    limitations: [
      "Medium quality only",
      "Limited template access",
      "Community support only"
    ],
    cta: "Get Started",
    popular: false,
    icon: <Zap className="h-6 w-6" />,
    bgClass: "bg-gradient-to-br from-muted to-card"
  },
  {
    id: "pro",
    name: "Pro",
    price: "€39",
    period: "/month",
    description: "Best for professionals and small businesses",
    credits: 100,
    features: [
      "100 credits per month",
      "All quality levels available",
      "High quality: 2 credits, Medium: 1.5 credits, Low: 1 credit",
      "Up to 100 high-quality images per month",
      "Premium templates & styles",
      "Priority support",
      "Faster processing",
      "Custom dimensions",
      "Commercial usage rights"
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    popular: true,
    icon: <Star className="h-6 w-6" />,
    bgClass: "bg-gradient-primary"
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams and high-volume users",
    credits: "Unlimited",
    features: [
      "Unlimited credits",
      "All quality levels",
      "Unlimited image generation",
      "Everything in Pro",
      "Team collaboration tools",
      "API access",
      "White-label exports",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee"
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
    icon: <Shield className="h-6 w-6" />,
    bgClass: "bg-gradient-to-br from-accent to-secondary"
  }
];

const comparisonFeatures = [
  { feature: "Monthly Credits", free: "30", pro: "100", enterprise: "Unlimited" },
  { feature: "Image Quality", free: "Medium only", pro: "All levels", enterprise: "All levels" },
  { feature: "High Quality Images/Month", free: "0", pro: "50", enterprise: "Unlimited" },
  { feature: "Medium Quality Images/Month", free: "20", pro: "66", enterprise: "Unlimited" },
  { feature: "Low Quality Images/Month", free: "0", pro: "100", enterprise: "Unlimited" },
  { feature: "Premium Templates", free: false, pro: true, enterprise: true },
  { feature: "Custom Dimensions", free: false, pro: true, enterprise: true },
  { feature: "Commercial Usage", free: false, pro: true, enterprise: true },
  { feature: "Priority Support", free: false, pro: true, enterprise: true },
  { feature: "Team Collaboration", free: false, pro: false, enterprise: true },
  { feature: "API Access", free: false, pro: false, enterprise: true },
  { feature: "White-label Exports", free: false, pro: false, enterprise: true },
  { feature: "SLA Guarantee", free: false, pro: false, enterprise: true }
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePlanSelect = async (planId: string) => {
    if (planId === "pro") {
      if (!user) {
        // Redirect to account page to sign up first
        navigate('/account');
        return;
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout');
        if (data?.url) {
          window.open(data.url, '_blank');
        } else {
          console.error('Error creating checkout:', error);
          navigate('/account');
        }
      } catch (error) {
        console.error('Error:', error);
        navigate('/account');
      }
    } else if (planId === "enterprise") {
      // For now, redirect to account page - in the future could open a contact form
      navigate('/account');
    } else {
      // Free plan - redirect to account to sign up
      navigate('/account');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <HeaderSection />
      </div>
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground py-20 mt-3">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl lg:text-2xl text-primary-foreground/90 max-w-3xl mx-auto mb-8">
            Start free and scale as you grow. Flexible credit-based pricing for all your AI image generation needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>14-day free trial on Pro</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>No credit card required to start</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative border-2 transition-all duration-300 hover:shadow-lg ${
                plan.popular
                  ? "border-primary shadow-lg scale-105"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${plan.popular ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {plan.icon}
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-lg">{plan.period}</span>
                  )}
                </div>
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{plan.credits}</div>
                  <div className="text-sm text-muted-foreground">Credits per month</div>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.limitations.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Limitations:</h4>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <X className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90"
                      : "variant-outline"
                  }`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Comparison Table */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Detailed Feature Comparison</h2>
            <p className="text-muted-foreground text-lg">
              Compare all features across our plans to find the perfect fit for your needs.
            </p>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Feature</TableHead>
                    <TableHead className="text-center">Free</TableHead>
                    <TableHead className="text-center bg-primary/5">
                      Pro
                      <Badge variant="secondary" className="ml-2">Popular</Badge>
                    </TableHead>
                    <TableHead className="text-center">Enterprise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonFeatures.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.feature}</TableCell>
                      <TableCell className="text-center">
                        {typeof item.free === 'boolean' ? (
                          item.free ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          item.free
                        )}
                      </TableCell>
                      <TableCell className="text-center bg-primary/5">
                        {typeof item.pro === 'boolean' ? (
                          item.pro ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">{item.pro}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {typeof item.enterprise === 'boolean' ? (
                          item.enterprise ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">{item.enterprise}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Credit System Explanation */}
        <div className="max-w-4xl mx-auto mt-20">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">How Our Credit System Works</CardTitle>
              <CardDescription>
                Simple, transparent pricing based on image quality and usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">1 Credit</div>
                  <div className="text-sm font-medium mb-1">Low Quality</div>
                  <div className="text-xs text-muted-foreground">512x512px, fast generation</div>
                </div>
                <div className="text-center p-6 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">1.5 Credits</div>
                  <div className="text-sm font-medium mb-1">Medium Quality</div>
                  <div className="text-xs text-muted-foreground">768x768px, balanced quality</div>
                </div>
                <div className="text-center p-6 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">2 Credits</div>
                  <div className="text-sm font-medium mb-1">High Quality</div>
                  <div className="text-xs text-muted-foreground">1024x1024px, premium results</div>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Credits reset monthly and don't roll over. Upgrade or downgrade anytime.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20 text-center">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6 text-left">
            <div>
              <h3 className="font-medium mb-2">Can I change plans anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Do unused credits roll over?</h3>
              <p className="text-muted-foreground text-sm">
                Credits reset monthly and don't carry over to the next billing period to keep pricing simple and fair.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! Pro plans come with a 14-day free trial. No credit card required to start with the Free plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;