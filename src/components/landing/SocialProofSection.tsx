import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Star, Quote, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import shopify from '@/assets/logos/shopify.png'
import woocommerce from '@/assets/logos/woocommerce.png'
import etsy from '@/assets/logos/etsy.png'
import amazon from '@/assets/logos/amazon.png'
import magento from '@/assets/logos/magento.png'
import bigcommerce from '@/assets/logos/bigcommerce.png'



const SocialProofSection = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const testimonials = [
    {
      id: 1,
      name: "Andreia Vieira",
      role: "CEO",
      company: "OGatoDasFraldas",
      avatar: "/api/placeholder/40/40",
      rating: 5,
      text: "A tool with great potential. A valuable addition for generating stand-out, unique images.",
      metrics: ""
    },
    {
      id: 2,
      name: "Sofia Santos",
      role: "Creative Director",
      company: "Bug Hug",
      avatar: "/api/placeholder/40/40",
      rating: 5,
      text: "We are already achieving very, very interesting results! The results were shocking! They were so good!!",
      metrics: ""
    },
    {
      id: 3,
      name: "Luís Alves ",
      role: "Founder",
      company: "Yonos",
      avatar: "/api/placeholder/40/40",
      rating: 5,
      text: "Good ease of use is a fact but the end result...what a show",
      metrics: ""
    },
  ];

  const companies = [
    { name: <img src={shopify} alt="shopify" className="h-8 md:h-10" width="156" height="40" /> },
    { name: <img src={amazon} alt="amazon" className="h-8 md:h-10" width="68" height="40" /> },
    { name: <img src={etsy} alt="etsy" className="h-8 md:h-10" width="40" height="40" /> },
    { name: <img src={woocommerce} alt="woocommerce" className="h-8 md:h-10" width="78" height="40" /> },
    { name: <img src={bigcommerce} alt="bigcommerce" className="h-8 md:h-10" width="177" height="40" /> },
    { name: <img src={magento} alt="magento" className="h-8 md:h-10" width="126" height="40" /> },
  ];


  const stats = [
    { value: "60s", label: "Average Time for Everything", change: "20% faster then beta version" },
    { value: "50+", label: "Generated Images Per User Monthly", change: "+156% last month" },
    { value: "98%", label: "Satisfaction Rate on our Users", change: "Consistently high" },
    { value: "20k+", label: "Saved on photoshoots and studios", change: "+35% money reinvested" },
  ];

  const DURATION = 28;

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
          <p className="text-sm text-muted-foreground mb-8">Works with Shopify, Amazon and other platforms</p>
          <div className="w-full">
            {/* Desktop: static row */}
            <div className="hidden md:flex flex-nowrap justify-center items-center gap-10 opacity-70">
              {companies.map((c, i) => (
                <div
                  key={`desk-${i}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {c.name}
                </div>
              ))}
            </div>

            {/* Mobile: auto-rotating marquee */}
            <div
              className="md:hidden relative w-full overflow-hidden opacity-70 
                        [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
            >
              <motion.div
                // Move one full set width left across time; duplicate content makes it seamless.
                animate={inView ? { x: ["0%", "-50%"] } : { x: 0 }}
                transition={{
                  duration: DURATION,
                  ease: "linear",
                  repeat: Infinity,
                }}
                className="flex flex-nowrap gap-10 items-center"
                // Ensure the row never collapses
                style={{ width: "max-content" }}
              >
                {/* 2 copies for the loop */}
                {[...companies, ...companies].map((c, i) => (
                  <div
                    key={`mob-${i}`}
                    className="flex-shrink-0 flex items-center gap-2 text-muted-foreground"
                  >
                    {c.name}
                  </div>
                ))}
              </motion.div>
            </div>
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