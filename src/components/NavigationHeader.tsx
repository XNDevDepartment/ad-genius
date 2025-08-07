import { useNavigate } from 'react-router-dom';
import symbol from '../assets/favicon2.png';
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";

const NavigationHeader = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const navigate = useNavigate()

  return (
    <header ref={ref} className="bg-background/90 backdrop-blur-sm border-b border-border flex justify-between items-center px-4 py-2 safe-area-top">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <div className="shadow-glow">
          <img 
            src={symbol}
            alt="Genius UGC Logo"
            className="h-10 w-10 object-contain"
          />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">ProduktPix</h1>
          <p className="text-xs font-bold leading-none" style={{color: '#0C60FE'}}>Genius</p>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Button 
          onClick={() => navigate("/account")}
          size="sm"
          className="min-h-[44px] px-4"
        >
          Start Now
        </Button>
      </motion.div>
    </header>
  );
};

export default NavigationHeader;