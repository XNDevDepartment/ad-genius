import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Upload, Wand2, Download, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const HowItWorksSection = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const steps = [
    {
      number: "01",
      title: "Upload Your Product",
      description: "Simply upload your product image or select from your library. Our AI supports multiple formats and backgrounds.",
      icon: Upload,
      color: "from-blue-500 to-blue-600",
      delay: 0.2,
    },
    {
      number: "02",
      title: "AI Magic Happens",
      description: "Our advanced AI analyzes your product and generates professional-quality images in various scenarios and styles.",
      icon: Wand2,
      color: "from-purple-500 to-purple-600",
      delay: 0.4,
    },
    {
      number: "03",
      title: "Download & Use",
      description: "Review your AI-generated images, pick your favorites, and download high-resolution files ready for commercial use.",
      icon: Download,
      color: "from-green-500 to-green-600",
      delay: 0.6,
    },
  ];

  return (
    <section ref={ref} className="py-24 bg-muted/30">
      <div className="container-responsive px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            ⚡ Simple Process
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transform your product images in three simple steps. No design skills required.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: step.delay }}
              className="relative"
            >
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-apple-lg transition-all duration-300 group">
                <CardContent className="p-8 space-y-4">
                  {/* Step Number */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-5xl font-bold text-muted-foreground/20 group-hover:text-primary/20 transition-colors">
                      {step.number}
                    </span>
                    <div className={`w-14 h-14 rounded-apple-sm bg-gradient-to-br ${step.color} flex items-center justify-center shadow-elegant group-hover:scale-110 transition-transform duration-300`}>
                      <step.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Arrow Between Steps */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-8 w-8 text-primary/30" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Time Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground">
            ⏱️ Average generation time: <span className="font-semibold text-foreground">7-10 seconds</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
