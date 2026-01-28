import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ArrowRight, Zap, Trophy, Image } from "lucide-react";
import { BeforeAfterSlider } from "../ui/before-after";

import outfit_antes from '@/assets/outfit_square.jpg';
import outfit_depois from '@/assets/outfit_square_final.png';
import { DemoModal } from "../DemoModal";


const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentHeadline, setCurrentHeadline] = useState(0);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const headlines = [
    "Create AI Product Images that sell for you",
    "Showcase your products in real, authentic contexts",
    "Make them look they’re already in customers’ hands.",
    "Build instant trust and credibility for your brand.",
  ];

  const socialProofStats = [
    { icon: Zap, value: "80s", label: "Average Time for Everything" },
    { icon: Image, value: "50+", label: "Generated Images Per User Monthly" },
    { icon: Trophy, value: "98%", label: "Satisfaction Rate on our Users" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeadline((prev) => (prev + 1) % headlines.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [headlines.length]);


  return (
    <section ref={ref} className="relative min-h-[90vh] bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden mt-24">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 0.05, scale: 1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", delay: 1 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-primary rounded-full blur-3xl"
        />
      </div>

      <div className="container-responsive relative z-10 px-4 py-4 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                🚀 #1 AI Image Generator for E-commerce
              </Badge>
            </motion.div>

            {/* Dynamic Headline */}
            <div className="space-y-4">
              {currentHeadline === 0 ? (
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight text-foreground">
                  {headlines[currentHeadline]}
                </h1>
              ) : (
                <motion.h1 
                  key={currentHeadline}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-4xl lg:text-6xl font-bold leading-tight text-foreground"
                >
                  {headlines[currentHeadline]}
                </motion.h1>
              )}

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl"
              >
                <p>Transform any product into authentic, UGC-style visuals that build credibility and boost conversions — powered by our proprietary <b>Genius AI Intelligence</b>.</p><p className="hidden sm:"><br/><br/> No studios, no photographers, no designers. Just upload and get sales-ready images instantly.</p>
              </motion.p>
            </div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {/* Primary CTA - Book a Demo */}
              <Button 
                size="lg"
                onClick={() => window.open('https://cal.com/genius-clklot/demonstracao-privada', '_blank')}
                className="group bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant text-lg px-8 py-4"
              >
                <Play className="mr-2 h-5 w-5" />
                {t('landing.hero.bookDemo', 'Book a Demo')}
              </Button>

              {/* Secondary CTA - Start Creating Free */}
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-primary/20 hover:border-primary/40 text-lg px-8 py-4"
                onClick={() => navigate("/signup")}
              >
                Start Creating Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>


            {/* Social Proof Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="grid grid-cols-3 gap-6 pt-8 border-t border-border/50"
            >
              {socialProofStats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="flex justify-center">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Interactive Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:pl-8"
          >
            <div className="relative">
              {/* Main Preview Card */}
              <motion.div
                // whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="bg-card border border-border/50 rounded-apple-lg shadow-apple-lg backdrop-blur-sm"
              >
                <div className="relative">
                  <div className="relative z-10 transform transition-smooth">
                      <BeforeAfterSlider
                        beforeImage={outfit_antes}
                        afterImage={outfit_depois}
                        alt='Demo Images'
                        className="w-full h-full"
                        initialX={15}
                        eager={true}
                      />
                  </div>
                  <div className="absolute inset-0 bg-brand-gradient rounded-2xl blur-xl opacity-30 animate-pulse" />
                </div>
              </motion.div>

              {/* Floating Elements */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 1 }}
                className="absolute -top-4 -right-4 bg-primary text-primary-foreground rounded-full p-3 shadow-glow"
              >
                <Zap className="h-6 w-6" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="absolute -bottom-4 -left-4 bg-card border border-border rounded-apple p-4 shadow-apple"
              >
                <div className="text-xs text-muted-foreground">Generated in</div>
                <div className="text-lg font-bold text-primary">23s</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </section>
  );
};

export default HeroSection;