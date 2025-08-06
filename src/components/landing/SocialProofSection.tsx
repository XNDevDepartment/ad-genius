import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Star, Quote, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const SocialProofSection = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const testimonials = [
    {
      id: 1,
      name: "Sarah Chen",
      role: "E-commerce Manager",
      company: "StyleCo",
      avatar: "/api/placeholder/40/40",
      rating: 5,
      text: "This AI tool completely transformed our product photography workflow. We went from hours of editing to minutes of generation.",
      metrics: "300% faster product launches"
    },
    {
      id: 2,
      name: "Marcus Rodriguez",
      role: "Creative Director",
      company: "BrandFlow",
      avatar: "/api/placeholder/40/40",
      rating: 5,
      text: "The quality is incredible. Our customers can't tell the difference between AI-generated and professionally shot photos.",
      metrics: "45% increase in conversions"
    },
    {
      id: 3,
      name: "Emily Watson",
      role: "Marketing Lead",
      company: "TechStart",
      avatar: "/api/placeholder/40/40",
      rating: 5,
      text: "We've saved thousands on product photography costs while maintaining premium quality. Game-changer for small businesses.",
      metrics: "80% cost reduction"
    },
  ];

  const companies = [
    { name: "Shopify", logo: "🛍️" },
    { name: "Amazon", logo: "📦" },
    { name: "Etsy", logo: "🎨" },
    { name: "WooCommerce", logo: "🛒" },
    { name: "BigCommerce", logo: "💼" },
    { name: "Magento", logo: "🏪" },
  ];

  const stats = [
    { value: "500", label: "Happy Customers", change: "+23% this month" },
    { value: "10k", label: "Images Generated", change: "+156% this quarter" },
    { value: "98%", label: "Satisfaction Rate", change: "Consistently high" },
    { value: "25s", label: "Average Generation Time", change: "50% faster than v1" },
  ];

  return (
    <section ref={ref} className="py-24 bg-muted/30" id="community">
      <div className="container-responsive px-4">
        {/* Companies Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm text-muted-foreground mb-8">Trusted by leading e-commerce platforms</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {companies.map((company, index) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-2xl">{company.logo}</span>
                <span className="font-medium">{company.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            >
              <Card className="text-center p-6 hover:shadow-apple transition-shadow">
                <CardContent className="space-y-2 p-0">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.change}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              ⭐ Customer Stories
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Loved by creators worldwide
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how businesses are transforming their visual content with our AI tools
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
              >
                <Card className="h-full hover:shadow-apple-lg transition-shadow group">
                  <CardContent className="p-6 space-y-4">
                    {/* Quote Icon */}
                    <Quote className="h-8 w-8 text-primary/30" />
                    
                    {/* Rating */}
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>

                    {/* Testimonial Text */}
                    <p className="text-foreground leading-relaxed">
                      "{testimonial.text}"
                    </p>

                    {/* Metrics */}
                    <div className="bg-primary/5 rounded-apple p-3">
                      <div className="text-sm font-medium text-primary">{testimonial.metrics}</div>
                    </div>

                    {/* Author Info */}
                    <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={testimonial.avatar} />
                        <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {testimonial.role} at {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* View More Testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center pt-8"
          >
            <button className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-2 transition-colors">
              View all success stories
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProofSection;