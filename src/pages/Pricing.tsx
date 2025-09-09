
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Star, Zap, Shield, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderSection from "@/components/landing/HeaderSection";
import { useState } from "react";

const plans = [
  // {
  //   id: "free",
  //   name: "Free",
  //   price: "Free",
  //   period: "",
  //   description: "Perfect for getting started with AI image generation",
  //   credits: 10,
  //   features: [
  //     "10 credits per month",
  //     "Generate 1 image at a time",
  //     "4 UGC scenarios available",
  //     "All quality levels (low: 1, medium: 1.5, high: 2 credits)",
  //     "Up to 5 high-quality images",
  //     "Ticket support only"
  //   ],
  //   limitations: [
  //     "Limited to 1 image per generation",
  //     "Only 4 scenarios available",
  //     "Ticket support only"
  //   ],
  //   cta: "Get Started",
  //   popular: false,
  //   icon: <Zap className="h-6 w-6" />,
  //   bgClass: "bg-gradient-to-br from-muted to-card"
  // },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 24.17,
    period: "/month",
    description: "Perfect for small businesses and content creators",
    credits: 80,
    features: [
      "80 credits per month",
      "Generate up to 3 images at once",
      "All quality levels available",
      "Up to 40 high-quality images",
      "Access to email support",
      "Commercial usage rights"
    ],
    limitations: [],
    cta: "Start Creating",
    popular: false,
    icon: <Star className="h-6 w-6" />,
    bgClass: "bg-gradient-to-br from-primary/10 to-primary/5"
  },
  {
    id: "plus",
    name: "Plus",
    monthlyPrice: 49,
    yearlyPrice: 40.83,
    period: "/month",
    description: "Best for agencies and growing businesses",
    credits: 200,
    features: [
      "200 credits per month",
      "Generate up to 3 images at once",
      "All quality levels available",
      "Up to 100 high-quality images",
      "Priority support + Live chat",
      "Commercial usage rights",
    ],
    limitations: [],
    cta: "Go Plus",
    popular: true,
    icon: <Crown className="h-6 w-6" />,
    bgClass: "bg-gradient-primary"
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 99,
    yearlyPrice: 82.50,
    period: "/month",
    description: "For high-volume users and enterprises",
    credits: 400,
    features: [
      "400 credits per month",
      "Generate up to 3 images at once",
      "All quality levels available",
      "Up to 200 high-quality images",
      "Dedicated account manager",
      "Priority processing",
      "Custom integrations support"
    ],
    limitations: [],
    cta: "Go Pro",
    popular: false,
    icon: <Shield className="h-6 w-6" />,
    bgClass: "bg-gradient-to-br from-accent to-secondary"
  }
];

const comparisonFeatures = [
  { feature: "Monthly Credits", starter: "80", plus: "200", pro: "400" },
  { feature: "Max Images per Generation", starter: "3", plus: "3", pro: "3" },
  { feature: "High Quality Images/Month", starter: "40", plus: "100", pro: "200" },
  { feature: "Medium Quality Images/Month", starter: "53", plus: "133", pro: "266" },
  { feature: "Low Quality Images/Month", starter: "80", plus: "200", pro: "400" },
  { feature: "UGC Scenarios Available", starter: "unlimited", plus: "unlimited", pro: "unlimited" },
  { feature: "All Quality Levels", starter: true, plus: true, pro: true },
  { feature: "Commercial Usage", starter: true, plus: true, pro: true },
  { feature: "Priority Support", starter: true, plus: true, pro: true },
  { feature: "Live Chat Support", starter: false, plus: true, pro: true },
  { feature: "Advanced Templates", starter: false, plus: true, pro: true },
  { feature: "Dedicated Manager", starter: false, plus: false, pro: true }
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isYearly, setIsYearly] = useState(false);

  const handlePlanSelect = async (planId: string) => {
    if (planId === "free") {
      // Free plan - redirect to account to sign up
      navigate('/account');
      return;
    }

    if (!user) {
      // Redirect to account page to sign up first
      navigate('/account');
      return;
    }
    
    try {
      // For paid plans, create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId,
          interval: isYearly ? 'year' : 'month'
        }
      });
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
  };

  const getDisplayPrice = (plan: any) => {
    if (plan.price === "Free") return "Free";
    
    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    return `€${price}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {!user &&
        <div className="hidden lg:block">
          <HeaderSection />
        </div>
      }
      
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground py-20 ">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl lg:text-2xl text-primary-foreground/90 max-w-3xl mx-auto mb-8">
            Start free and scale as you grow. Flexible credit-based pricing for all your AI image generation needs.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm ${!isYearly ? 'text-primary-foreground' : 'text-primary-foreground/70'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isYearly ? 'bg-primary' : 'bg-primary-foreground/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isYearly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${isYearly ? 'text-primary-foreground' : 'text-primary-foreground/70'}`}>
              Yearly
            </span>
            <Badge variant="secondary" className="ml-2">
              Save 2 months!
            </Badge>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Start with 10 free credits</span>
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
        <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto mb-20">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative border-2 transition-all duration-300 hover:shadow-lg ${
                plan.popular
                  ? "border-primary shadow-lg scale-105 bg-white dark:bg-card"
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
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">{getDisplayPrice(plan)}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                  {isYearly && plan.monthlyPrice && (
                    <div className="text-xs text-muted-foreground">
                      Billed annually (€{(plan.yearlyPrice * 12).toFixed(0)}/year)
                    </div>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-xl font-bold text-primary">{plan.credits}</div>
                  <div className="text-xs text-muted-foreground">Credits per month</div>
                </div>

                <ul className="space-y-2">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.limitations.length > 0 && (
                  <div className="border-t pt-3">
                    <ul className="space-y-1">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <X className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">{limitation}</span>
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
                  size="sm"
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
                    <TableHead className="w-1/4">Feature</TableHead>
                    <TableHead className="text-center">Starter</TableHead>
                    <TableHead className="text-center bg-primary/5">
                      Plus
                      <Badge variant="secondary" className="ml-2">Popular</Badge>
                    </TableHead>
                    <TableHead className="text-center">Pro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonFeatures.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.feature}</TableCell>
                      <TableCell className="text-center">
                        {typeof item.starter === 'boolean' ? (
                          item.starter ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">{item.starter}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center bg-primary/5">
                        {typeof item.plus === 'boolean' ? (
                          item.plus ? (
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="font-medium">{item.plus}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
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
                Credits roll over monthly - unused credits are added to your next billing cycle. Upgrade or downgrade anytime.
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
                Yes! Unused credits roll over to the next month. We believe in fair pricing - you keep what you don't use.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">What's the difference between yearly and monthly billing?</h3>
              <p className="text-muted-foreground text-sm">
                Yearly plans save you 2 months - you pay for 10 months and get 12 months of service.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">What are scenarios?</h3>
              <p className="text-muted-foreground text-sm">
                Scenarios are pre-designed UGC settings tailored to your product and niche. For example: a cosmetic placed on a backstage table at a fashion show.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">What happens if I exceed my credit limit?</h3>
              <p className="text-muted-foreground text-sm">
                If you run out of credits, you can upgrade your plan or wait for the next billing cycle when new credits are added to your account.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Can I cancel my subscription anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground text-sm">
                We accept all major credit cards, debit cards, and digital wallets through our secure Stripe payment processing.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Is there a free trial for paid plans?</h3>
              <p className="text-muted-foreground text-sm">
                Every new user starts with our generous Free plan (10 credits) to try our service. Upgrade anytime to unlock more features.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Can I use the generated images commercially?</h3>
              <p className="text-muted-foreground text-sm">
                Commercial usage rights are included with Starter, Plus, and Pro plans. Free trial users have personal use rights only.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">How does the credit system work?</h3>
              <p className="text-muted-foreground text-sm">
                Credits are consumed based on image quality: Low (1 credit), Medium (1.5 credits), High (2 credits). Credits roll over monthly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
