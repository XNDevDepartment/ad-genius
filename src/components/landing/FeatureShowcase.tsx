import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Wand2, Scissors, Layers, Palette, Zap, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FeatureShowcase = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const features = [
    {
      id: "ugc",
      title: "UGC Creator",
      description: "Create authentic user-generated content that converts with AI-powered product photography",
      icon: Camera,
      available: true,
      category: "E-commerce",
      stats: "2M+ images created",
      gradient: "from-blue-500/10 to-purple-500/10",
      onClick: () => navigate("/create/ugc"),
    },
    {
      id: "background-removal",
      title: "Background Removal",
      description: "Remove and replace backgrounds instantly with precision AI technology",
      icon: Scissors,
      available: true,
      category: "Editing",
      stats: "500K+ backgrounds removed",
      gradient: "from-green-500/10 to-teal-500/10",
      onClick: () => navigate("/create"),
    },
    {
      id: "style-transfer",
      title: "Style Transfer",
      description: "Apply artistic styles and filters to transform your product images",
      icon: Palette,
      available: false,
      category: "Creative",
      stats: "Coming Q1 2024",
      gradient: "from-pink-500/10 to-rose-500/10",
      onClick: () => {},
    },
    {
      id: "batch-processing",
      title: "Batch Processing",
      description: "Process hundreds of images simultaneously with our enterprise-grade AI",
      icon: Layers,
      available: false,
      category: "Enterprise",
      stats: "Coming Q2 2024",
      gradient: "from-orange-500/10 to-red-500/10",
      onClick: () => {},
    },
    {
      id: "ai-enhancer",
      title: "AI Enhancer",
      description: "Automatically enhance image quality, lighting, and composition",
      icon: Wand2,
      available: false,
      category: "Enhancement",
      stats: "Coming Q1 2024",
      gradient: "from-indigo-500/10 to-blue-500/10",
      onClick: () => {},
    },
    {
      id: "instant-gen",
      title: "Instant Generation",
      description: "Generate product images from text descriptions in seconds",
      icon: Zap,
      available: false,
      category: "AI Generation",
      stats: "Coming Q2 2024",
      gradient: "from-yellow-500/10 to-orange-500/10",
      onClick: () => {},
    },
  ];

  const categories = ["All", "E-commerce", "Editing", "Creative", "Enterprise", "Enhancement", "AI Generation"];

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
            🎨 Powerful AI Tools
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Everything you need to create
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From basic editing to advanced AI generation, our comprehensive toolkit helps you create 
            professional-quality images for any use case.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card 
                className={`group cursor-pointer transition-all duration-300 hover:shadow-apple-lg border-border/50 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm ${
                  !feature.available ? "opacity-70" : "hover:scale-[1.02]"
                }`}
                onClick={feature.available ? feature.onClick : undefined}
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-apple-sm flex items-center justify-center ${
                      feature.available ? "bg-primary/10" : "bg-muted/50"
                    }`}>
                      <feature.icon className={`h-6 w-6 ${
                        feature.available ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={feature.available ? "default" : "secondary"} className="text-xs">
                        {feature.category}
                      </Badge>
                      {!feature.available && (
                        <Badge variant="outline" className="text-xs border-orange-200 text-orange-600">
                          <Clock className="w-3 h-3 mr-1" />
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{feature.stats}</span>
                    {feature.available && (
                      <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  {feature.available && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors"
                    >
                      Get Started
                    </Button>
                  )}

                  {!feature.available && (
                    <div className="w-full p-2 text-center text-xs text-muted-foreground bg-muted/30 rounded-md">
                      Join waitlist for early access
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16 space-y-6"
        >
          <h3 className="text-2xl font-semibold text-foreground">
            Ready to transform your product images?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate("/create")}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant"
            >
              Start Creating Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              View All Features
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureShowcase;