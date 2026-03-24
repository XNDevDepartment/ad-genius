import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const BASE_URL = 'https://produktpix.com';
const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'fr', 'de'];

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  schema?: object | object[];
  noindex?: boolean;
}

export const SEO = ({
  title,
  description,
  path,
  image = '/og-image.png',
  type = 'website',
  schema,
  noindex = false,
}: SEOProps) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'pt';
  
  const fullTitle = `${title} | ProduktPix`;
  const canonicalUrl = `${BASE_URL}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${BASE_URL}${image}`;
  
  // Build JSON-LD schema
  const schemaScript = schema
    ? JSON.stringify(
        Array.isArray(schema)
          ? { '@context': 'https://schema.org', '@graph': schema }
          : { '@context': 'https://schema.org', ...schema }
      )
    : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="ProduktPix" />
      <meta property="og:locale" content={currentLang} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      
      {/* Hreflang Tags for Multilingual SEO */}
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${BASE_URL}${path}${path.includes('?') ? '&' : '?'}lang=${lang}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
      
      {/* Language */}
      <html lang={currentLang} />
      
      {/* Schema.org JSON-LD */}
      {schemaScript && (
        <script type="application/ld+json">{schemaScript}</script>
      )}
    </Helmet>
  );
};

export default SEO;
