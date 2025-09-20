import { useActionData, useNavigate } from 'react-router-dom';
import symbol from '../assets/favicon2.png';
import logo from '../assets/logos/logo_horizontal.png';
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from "react-i18next";
import { LogIn } from "lucide-react";

const NavigationHeader = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const navigate = useNavigate()
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <header ref={ref} className="bg-background/90 backdrop-blur-sm flex justify-between items-center px-4 py-2 safe-area-top">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <div className="pt-2">
          <img
            src={logo}
            alt={t('a11y.logoAlt')}
            className="h-10 w-32 object-contain"
          />
        </div>
        {/* <div>
          <h1 className="font-bold text-lg leading-tight">ProduktPix</h1>
          <p className="text-xs font-bold leading-none" style={{color: '#0C60FE'}}>Genius</p>
        </div> */}
      </motion.div>

      {!user &&
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex items-center gap-2"
      >
        <Button
          onClick={() => navigate("/signup")}
          size="sm"
          className="min-h-[24px] p-4 mt-2"
        >
          {t('common.startNow')}
        </Button>
        <Button
          onClick={() => navigate("/signin")}
          size="sm"
          variant="outline"
          className="min-h-[24px] p-2 mt-2"
        >
          <LogIn className="h-4 w-4" />
        </Button>
      </motion.div>}
    </header>
  );
};

export default NavigationHeader;