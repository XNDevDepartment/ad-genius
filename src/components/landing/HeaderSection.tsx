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
          : "bg-transparent"
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
        <motion.div
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
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20, x: 30 }}
          animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          >
          {/* <a href="#login" className="btn-ghost">Log in</a> */}
          <Button className="btn-primary" onClick={() => navigate("/account")}>
            Start generating
          </Button>
          </motion.div>
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default HeaderSection;