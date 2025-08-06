import { useNavigate } from 'react-router-dom';
import symbol from '../assets/favicon2.png';
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

const NavigationHeader = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const navigate = useNavigate()

  return (
    <header ref={ref} className="bg-background/90 backdrop-blur-sm border-b border-border flex justify-between ">
      <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex items-center gap-1 pt-2">
          <div className=" shadow-glow" onClick={() => navigate("/")}>
            <img 
              src={symbol}
              alt="Genius UGC Logo"
              className="h-12 w-12 object-contain ml-4"
            />
          </div>
          <div>
            <h1 className="font-bold text-lg">ProduktPix</h1>
            <p className="text-xs font-bold" style={{color: '#0C60FE'}}>Genius</p>
          </div>
        </div>
      </motion.div>
    </header>
  );
};

export default NavigationHeader;