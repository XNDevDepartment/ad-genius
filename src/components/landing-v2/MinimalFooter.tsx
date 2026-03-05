import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logos/logo_horizontal.png";

export const MinimalFooter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns = [
    {
      title: t('landingV2.footer.product', 'Product'),
      links: [
        { label: t('landingV2.footer.pricing', 'Pricing'), onClick: () => navigate('/pricing') },
        { label: t('landingV2.footer.howItWorks', 'How It Works'), onClick: () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }) },
        { label: t('landingV2.footer.virtualTryOn', 'Virtual Try-On'), onClick: () => navigate('/use-cases/fashion-model-photography') },
        { label: t('landingV2.footer.backgroundRemoval', 'Background Replacement'), onClick: () => navigate('/use-cases/white-background-photos') },
      ],
    },
    {
      title: t('landingV2.footer.forYourStore', 'For Your Store'),
      links: [
        { label: t('landingV2.footer.amazonPhotos', 'Amazon Photos'), onClick: () => navigate('/use-cases/amazon-product-photos') },
        { label: t('landingV2.footer.shopifyImages', 'Shopify Images'), onClick: () => navigate('/use-cases/shopify-listing-images') },
        { label: t('landingV2.footer.etsyListings', 'Etsy Listings'), onClick: () => navigate('/use-cases/etsy-handmade') },
        { label: t('landingV2.footer.fashionCatalog', 'Fashion Catalog'), onClick: () => navigate('/use-cases/fashion-model-photography') },
      ],
    },
    {
      title: t('landingV2.footer.resources', 'Resources'),
      links: [
        { label: t('landingV2.footer.caseStudies', 'Case Studies'), onClick: () => navigate('/case-studies/ogato-das-fraldas') },
        { label: t('landingV2.footer.faq', 'FAQ'), onClick: () => navigate('/help/faq') },
        { label: t('landingV2.footer.gettingStarted', 'Getting Started'), onClick: () => navigate('/help/getting-started') },
        { label: t('landingV2.footer.affiliate', 'Affiliate Program'), onClick: () => navigate('/afiliados') },
      ],
    },
    {
      title: t('landingV2.footer.legal', 'Legal'),
      links: [
        { label: t('landingV2.footer.privacy', 'Privacy'), onClick: () => navigate('/privacy') },
        { label: t('landingV2.footer.terms', 'Terms'), onClick: () => navigate('/terms') },
        { label: t('landingV2.footer.cookies', 'Cookies'), onClick: () => navigate('/cookies') },
        { label: t('landingV2.footer.contact', 'Contact'), href: 'mailto:info@produktpix.com' },
      ],
    },
  ];

  return (
    <footer className="py-16 px-4 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Logo column */}
          <div className="col-span-2 md:col-span-1">
            <button onClick={() => navigate('/')} className="flex items-center mb-4">
              <img
                src={logoHorizontal}
                alt="ProduktPix"
                className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
              />
            </button>
            <p className="text-sm text-muted-foreground">
              {t('landingV2.footer.tagline', 'Professional product photos for e-commerce.')}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link, j) => (
                  <li key={j}>
                    {'href' in link && link.href ? (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <button
                        onClick={link.onClick}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ProduktPix
          </p>
          <p className="text-xs text-muted-foreground">
            {t('landingV2.footer.trusted', 'Trusted by 10,000+ e-commerce businesses worldwide')}
          </p>
        </div>
      </div>
    </footer>
  );
};
