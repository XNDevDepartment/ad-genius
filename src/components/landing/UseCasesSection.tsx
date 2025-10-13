import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ShoppingBag, Share2, Megaphone, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const UseCasesSection = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const useCases = [
    {
      icon: ShoppingBag,
      title: "E-commerce Stores",
      description: "Create stunning product listings that convert. Generate multiple lifestyle shots from a single product photo.",
      benefits: ["Higher conversion rates", "Reduced photography costs", "Consistent brand style"],
      gradient: "from-blue-500/10 to-blue-600/10",
      iconColor: "text-blue-600",
    },
    {
      icon: Share2,
      title: "Social Media Marketers",
      description: "Generate engaging social content at scale. Create platform-optimized images for Instagram, Facebook, and TikTok.",
      benefits: ["Increased engagement", "Daily fresh content", "Multi-platform ready"],
      gradient: "from-purple-500/10 to-purple-600/10",
      iconColor: "text-purple-600",
    },
    {
      icon: Megaphone,
      title: "Digital Advertisers",
      description: "A/B test ad creatives effortlessly. Generate multiple ad variations to find your winning combination.",
      benefits: ["Lower CPA", "Better ROAS", "Faster testing"],
      gradient: "from-orange-500/10 to-orange-600/10",
      iconColor: "text-orange-600",
    },
    {
      icon: Store,
      title: "Small Businesses",
      description: "Professional product photography without the cost. Look like a Fortune 500 brand on a startup budget.",
      benefits: ["Professional quality", "No equipment needed", "Instant results"],
      gradient: "from-green-500/10 to-green-600/10",
      iconColor: "text-green-600",
    },
  ];

  return (
    <section ref={ref} className="py-24 bg-background">
      <div className="container-responsive px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            💼 Use Cases
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Who Uses Our Platform?
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From startups to enterprises, thousands of businesses trust our AI to create their visual content.
          </p>
        </motion.div>

        {/* Use Cases Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className={`h-full border-border/50 bg-gradient-to-br ${useCase.gradient} backdrop-blur-sm hover:shadow-apple-lg transition-all duration-300 group hover:scale-[1.02]`}>
                <CardHeader className="space-y-4">
                  <div className={`w-12 h-12 rounded-apple-sm bg-background flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <useCase.icon className={`h-6 w-6 ${useCase.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {useCase.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {useCase.description}
                  </p>
                  <div className="space-y-2">
                    {useCase.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto"
        >
          {[
            { value: "50K+", label: "Active Users" },
            { value: "2M+", label: "Images Created" },
            { value: "95%", label: "Satisfaction Rate" },
            { value: "24/7", label: "AI Processing" },
          ].map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default UseCasesSection;
