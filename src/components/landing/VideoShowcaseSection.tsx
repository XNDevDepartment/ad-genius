import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import { Video, Play, Clock, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const VideoShowcaseSection = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const navigate = useNavigate();

  const features = [
    {
      icon: Clock,
      title: "5-10 Second Videos",
      description: "Perfect length for social media and ads",
    },
    {
      icon: Zap,
      title: "Fast Generation",
      description: "Get your video in minutes, not hours",
    },
    {
      icon: Video,
      title: "HD Quality",
      description: "Crystal clear output ready to publish",
    },
  ];

  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5">
      <div className="container-responsive px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
            🎬 New Feature
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Transform Images Into Engaging Videos
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Bring your product images to life with AI-powered video generation. Create dynamic, eye-catching videos that stop the scroll.
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          {/* Video Preview Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-apple-lg overflow-hidden group">
              <CardContent className="p-0 relative aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                      <Play className="h-10 w-10 text-primary ml-1" />
                    </div>
                    <p className="text-sm text-muted-foreground">Watch Demo Video</p>
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    <Video className="w-3 h-3 mr-1" />
                    HD Quality
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features & CTA */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8"
          >
            {/* Features List */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={feature.title} className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-apple-sm bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
                    <feature.icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 p-6 rounded-apple bg-muted/30 border border-border/50">
              <div>
                <div className="text-2xl font-bold text-foreground">5-10s</div>
                <div className="text-sm text-muted-foreground">Video Length</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">1080p</div>
                <div className="text-sm text-muted-foreground">HD Quality</div>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 shadow-elegant"
            >
              Create Your First Video
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              5 credits per video • No credit card required for free trial
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VideoShowcaseSection;
