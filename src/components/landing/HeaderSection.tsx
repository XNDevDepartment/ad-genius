import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logo from './../../assets/logo_ext.png';
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const HeaderSection = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/90 backdrop-blur-sm border-b border-border" 
          : "bg-background backdrop-blur-sm"
      }`}
      ref={ref}
    >
      <div className="container mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20, x: -30  }}
          animate={inView ? { opacity: 1, y: 0 , x: 0} : {}}
          transition={{ duration: 0.6 }}
          >
        <div className="font-heading font-semibold tracking-tight" onClick={() => navigate("/")}>
          <img src={logo} alt="ProduktPix Logo" className="w-48"/>
        </div>
      </motion.div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
        {/* <motion.div
          initial={{ opacity: 0, y: -20,}}
          animate={inView ? { opacity: 1, y: 0} : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          >
          <a href="#explore" className="btn-ghost">Explore</a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          >
          <a href="#pricing-section" className="btn-ghost">Plans</a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          >
          <a href="#community" className="btn-ghost">Community</a>
        </motion.div> */}
         <motion.div
           initial={{ opacity: 0, y: -20, x: 30 }}
           animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
           transition={{ duration: 0.6, delay: 0.2 }}
           className="flex items-center gap-3"
           >
           <Button 
             variant="outline"
             size="sm"
             onClick={() => navigate("/signin")}
             className="border-border hover:bg-muted"
           >
             Sign In
           </Button>
           <Button 
             size="sm"
             onClick={() => navigate("/signup")}
             className="bg-gradient-primary text-primary-foreground hover:opacity-90"
           >
             Start generating
           </Button>
           </motion.div>
        </nav>

         {/* Mobile CTA */}
         <div className="md:hidden">
           <Button 
             className="btn-primary text-sm px-4 py-2" 
             onClick={() => navigate("/signup")}
           >
             Sign Up
           </Button>
         </div>
      </div>
    </header>
  );
};

export default HeaderSection;