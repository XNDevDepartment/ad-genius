import { useTranslation } from "react-i18next";

import shopifyLogo from "@/assets/logos/shopify.png";
import amazonLogo from "@/assets/logos/amazon.png";
import etsyLogo from "@/assets/logos/etsy.png";
import woocommerceLogo from "@/assets/logos/woocommerce.png";
import bigcommerceLogo from "@/assets/logos/bigcommerce.png";
import magentoLogo from "@/assets/logos/magento.png";

const logos = [
  { src: shopifyLogo, alt: "Shopify" },
  { src: amazonLogo, alt: "Amazon" },
  { src: etsyLogo, alt: "Etsy" },
  { src: woocommerceLogo, alt: "WooCommerce" },
  { src: bigcommerceLogo, alt: "BigCommerce" },
  { src: magentoLogo, alt: "Magento" },
];

export const LogoMarquee = () => {
  const { t } = useTranslation();

  return (
    <section className="py-12 border-y border-border/50 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-8">
          {t('landingV2.logos.title', 'Trusted by sellers on leading platforms')}
        </p>
        
        <div className="relative overflow-hidden">
          {/* Gradient masks */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
          
          {/* Scrolling container */}
          <div className="flex animate-marquee">
            {[...logos, ...logos, ...logos].map((logo, index) => (
              <div 
                key={index} 
                className="flex-shrink-0 mx-8 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
              >
                <img 
                  src={logo.src} 
                  alt={logo.alt} 
                  className="h-8 md:h-10 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
