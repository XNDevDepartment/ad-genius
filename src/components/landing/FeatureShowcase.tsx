import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Camera, Wand2, Scissors, Layers, Palette, Zap, ArrowRight, Clock, Star, Users, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const FeatureShowcase = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const features = [
    {
      id: "ugc",
      title: "UGC Creator",
      description: "Create authentic user-generated content that converts with AI-powered product photography",
      icon: Camera,
      available: true,
      category: "E-commerce",
      stats: "2M+ images created",
      rating: 4.9,
      users: "50K+",
      demoUrl: "/demo/ugc",
      previewImages: ["/api/placeholder/300/200", "/api/placeholder/300/200"],
      gradient: "from-blue-500/10 to-purple-500/10",
      onClick: () => navigate("/create/ugc"),
    },
    // {
    //   id: "background-removal",
    //   title: "Background Removal",
    //   description: "Remove and replace backgrounds instantly with precision AI technology",
    //   icon: Scissors,
    //   available: true,
    //   category: "Editing",
    //   stats: "500K+ backgrounds removed",
    //   rating: 4.8,
    //   users: "30K+",
    //   demoUrl: "/demo/bg-removal",
    //   previewImages: ["/api/placeholder/300/200", "/api/placeholder/300/200"],
    //   gradient: "from-green-500/10 to-teal-500/10",
    //   onClick: () => navigate("/create"),
    // },
    // {
    //   id: "style-transfer",
    //   title: "Style Transfer",
    //   description: "Apply artistic styles and filters to transform your product images",
    //   icon: Palette,
    //   available: false,
    //   category: "Creative",
    //   stats: "Coming Q1 2024",
    //   progress: 75,
    //   estimatedUsers: "Expected 15K+",
    //   gradient: "from-pink-500/10 to-rose-500/10",
    //   onClick: () => {},
    // },
    // {
    //   id: "batch-processing",
    //   title: "Batch Processing",
    //   description: "Process hundreds of images simultaneously with our enterprise-grade AI",
    //   icon: Layers,
    //   available: false,
    //   category: "Enterprise",
    //   stats: "Coming Q2 2024",
    //   progress: 45,
    //   estimatedUsers: "Expected 25K+",
    //   gradient: "from-orange-500/10 to-red-500/10",
    //   onClick: () => {},
    // },
    // {
    //   id: "ai-enhancer",
    //   title: "AI Enhancer",
    //   description: "Automatically enhance image quality, lighting, and composition",
    //   icon: Wand2,
    //   available: false,
    //   category: "Enhancement",
    //   stats: "Coming Q1 2024",
    //   progress: 85,
    //   estimatedUsers: "Expected 40K+",
    //   gradient: "from-indigo-500/10 to-blue-500/10",
    //   onClick: () => {},
    // },
    // {
    //   id: "instant-gen",
    //   title: "Instant Generation",
    //   description: "Generate product images from text descriptions in seconds",
    //   icon: Zap,
    //   available: false,
    //   category: "AI Generation",
    //   stats: "Coming Q2 2024",
    //   progress: 30,
    //   estimatedUsers: "Expected 60K+",
    //   gradient: "from-yellow-500/10 to-orange-500/10",
    //   onClick: () => {},
    // },
    {
      id: "video-gen",
      title: "AI Video Generator",
      description: "Transform static images into engaging 5-10 second videos for social media",
      icon: Play,
      available: true,
      category: "Video",
      stats: "10K+ videos created",
      rating: 4.9,
      users: "5K+",
      demoUrl: "/demo/video",
      previewImages: ["/api/placeholder/300/200", "/api/placeholder/300/200"],
      gradient: "from-purple-500/10 to-blue-500/10",
      onClick: () => navigate("/video-generator"),
    },
  ];

  const categories = ["All", "E-commerce", "Editing", "Video", "Creative", "Enterprise", "Enhancement", "AI Generation"];

  const filteredFeatures = selectedCategory === "All"
    ? features
    : features.filter(feature => feature.category === selectedCategory);

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

        {/* Interactive Category Filter */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={`transition-all duration-300 ${
                selectedCategory === category
                  ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                  : "hover:bg-primary/10 hover:border-primary/30"
              }`}
            >
              {category}
              {category !== "All" && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {features.filter(f => f.category === category).length}
                </Badge>
              )}
            </Button>
          ))}
        </motion.div> */}

        {/* Enhanced Feature Grid */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onMouseEnter={() => setHoveredFeature(feature.id)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <Card 
                  className={`group cursor-pointer transition-all duration-500 hover:shadow-apple-lg border-border/50 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm relative overflow-hidden ${
                    !feature.available ? "opacity-70" : "hover:scale-[1.02]"
                  }`}
                  onClick={feature.available ? feature.onClick : undefined}
                >
                  {/* Hover Preview Overlay */}
                  {hoveredFeature === feature.id && feature.available && feature.previewImages && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-10"
                    >
                      <div className="text-center space-y-3 p-4">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {feature.previewImages.map((img, idx) => (
                            <div key={idx} className="relative">
                              <Skeleton className="w-full h-20 rounded-md" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  {idx === 0 ? "Before" : "After"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button size="sm" variant="default" className="w-full">
                          <Play className="w-4 h-4 mr-2" />
                          Watch Demo
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-apple-sm flex items-center justify-center transition-all duration-300 ${
                        feature.available ? "bg-primary/10 group-hover:bg-primary/20" : "bg-muted/50"
                      }`}>
                        <feature.icon className={`h-6 w-6 transition-all duration-300 ${
                          feature.available ? "text-primary group-hover:scale-110" : "text-muted-foreground"
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
                        {feature.available && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs font-medium">{feature.rating}</span>
                          </div>
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
                    {/* Enhanced Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{feature.stats}</span>
                        {feature.available && (
                          <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" />
                        )}
                      </div>
                      
                      {feature.available && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{feature.users} users</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>Live demo</span>
                          </div>
                        </div>
                      )}
                      
                      {!feature.available && feature.progress && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Development</span>
                            <span className="text-primary font-medium">{feature.progress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${feature.progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {feature.estimatedUsers}
                          </div>
                        </div>
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-dashed bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        Join Waitlist
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

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
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureShowcase;