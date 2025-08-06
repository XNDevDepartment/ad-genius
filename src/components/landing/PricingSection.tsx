import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for trying out Ad Genius",
    features: [
      "30 credits per month",
      "720p image renders",
      "Basic templates",
      "Community support",
      "Standard processing"
    ],
    cta: "Get started",
    popular: false,
    entreprise: false
  },
  {
    name: "Pro", 
    price: "$29",
    period: "/month",
    description: "Best for small businesses and agencies",
    features: [
      "Unlimited static ads",
      "1080p video exports",
      "Premium templates",
      "Priority support",
      "Brand kit storage",
      "Custom dimensions"
    ],
    cta: "Unlock Your Success",
    popular: true,
    entreprise: false
  },
  {
    name: "Growth",
    price: "$99",
    period: "/month",
    description: "For teams and high-volume users",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "API access",
      "White-label exports",
      "Custom integrations",
      "Dedicated support"
    ],
    cta: "Contact Sales",
    popular: false,
    entreprise: true
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

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 ${
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

              <div className="text-center mb-8">
                <h3 className={`text-xl font-semibold mb-2 ${plan.popular ? "text-primary" : "text-white"}`}>
                  {plan.name}
                </h3>
                <div className="mb-3">
                  <span className={`text-2xl font-bold ${plan.popular ? "text-secondary" : "text-gray-400"}`}>
                    {/* {plan.price} */}
                    Soon
                  </span>
                  {/* {plan.period && (
                    <span className={`text-lg ${plan.popular ? "text-muted-foreground" : "text-gray-400"}`}>
                      {plan.period}
                    </span>
                  )} */}
                </div>
                <p className={`text-sm ${plan.popular ? "text-muted-foreground" : "text-gray-400"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <svg 
                      className={`w-5 h-5 ${plan.popular ? "text-primary" : "text-gray-400"}`} 
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
                onClick={() => plan.entreprise ? navigate("/account") : navigate("/account")}
                className={`w-full ${
                  plan.popular
                    ? "btn-primary"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;