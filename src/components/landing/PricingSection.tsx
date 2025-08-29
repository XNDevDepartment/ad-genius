
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  {
    name: "Free",
    price: "Free",
    description: "Perfect for trying out Ad Genius",
    features: [
      "10 credits per month",
      "Generate 1 image at a time",
      "4 UGC scenarios",
      "All quality levels",
      "Ticket support"
    ],
    cta: "Get started",
    popular: false,
    enterprise: false
  },
  {
    name: "Starter",
    price: "€29",
    period: "/month",
    description: "Perfect for small businesses and single entrepreneurs",
    features: [
      "80 credits per month",
      "Generate up to 3 images",
      "All 6 UGC scenarios",
      "Priority support",
      "Commercial usage",
      "Advanced templates"
    ],
    cta: "Start Creating",
    popular: false,
    enterprise: false
  },
  {
    name: "Plus",
    price: "€49",
    period: "/month",
    description: "Best for agencies and growing businesses",
    features: [
      "200 credits per month",
      "Generate up to 3 images",
      "All 6 UGC scenarios",
      "Priority + Live chat",
      "Advanced templates",
      "Team collaboration"
    ],
    cta: "Go Plus",
    popular: true,
    enterprise: false
  },
  {
    name: "Pro",
    price: "€99",
    period: "/month",
    description: "For high-volume users and enterprises",
    features: [
      "400 credits per month",
      "Generate up to 3 images",
      "All 6 UGC scenarios",
      "Dedicated manager",
      "API access",
      "White-label exports"
    ],
    cta: "Go Pro",
    popular: false,
    enterprise: true
  }
];

const PricingSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-5 bg-black text-white" id="pricing-section">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="mb-4 text-3xl lg:text-4xl font-bold text-primary-foreground">Choose your plan</h2>
          <p className="text-1xl lg:text-2xl text-primary-foreground text-gray-300 max-w-2xl mx-auto">
            Start free, scale as you grow. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 ${
                plan.popular
                  ? "bg-white text-foreground border-2 border-primary transform scale-105"
                  : "bg-white/5 backdrop-blur-sm border border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className={`text-lg font-semibold mb-2 ${plan.popular ? "text-primary" : "text-white"}`}>
                  {plan.name}
                </h3>
                <div className="mb-3">
                  <span className={`text-2xl font-bold ${plan.popular ? "text-secondary" : "text-gray-400"}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.popular ? "text-muted-foreground" : "text-gray-400"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-sm ${plan.popular ? "text-muted-foreground" : "text-gray-400"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-2">
                    <svg 
                      className={`w-4 h-4 ${plan.popular ? "text-primary" : "text-gray-400"}`} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    <span className={`text-sm ${plan.popular ? "text-black" : "text-gray-300"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate('/pricing')}
                className={`w-full ${
                  plan.popular
                    ? "btn-primary"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
                size="sm"
              >
                View Details
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm mb-6">
            All plans include free trial • No credit card required • Cancel anytime
          </p>
          <Button 
            onClick={() => navigate('/pricing')} 
            variant="link" 
            className="border-white/20 text-white hover:bg-white/10"
          >
            See Full Pricing Details
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
