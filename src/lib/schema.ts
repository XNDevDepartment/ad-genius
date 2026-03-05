// Schema.org structured data builders for SEO

const BASE_URL = 'https://produktpix.com';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

export interface ProductOffer {
  name: string;
  description: string;
  price: number;
  priceCurrency?: string;
  features?: string[];
}

export const buildOrganizationSchema = () => ({
  '@type': 'Organization',
  '@id': `${BASE_URL}/#organization`,
  name: 'ProduktPix',
  url: BASE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/og-image.png`,
    width: 1200,
    height: 630,
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@produktpix.com',
    contactType: 'customer service',
  },
  sameAs: [],
});

export const buildWebSiteSchema = () => ({
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  url: BASE_URL,
  name: 'ProduktPix',
  description: 'AI-powered product photography platform',
  publisher: { '@id': `${BASE_URL}/#organization` },
  inLanguage: ['pt', 'en', 'es', 'fr', 'de'],
});

export const buildWebApplicationSchema = () => ({
  '@type': 'WebApplication',
  '@id': `${BASE_URL}/#app`,
  name: 'ProduktPix',
  description: 'Professional product photography tool for e-commerce businesses',
  applicationCategory: 'PhotographyApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '99',
    priceCurrency: 'EUR',
    offerCount: 4,
  },
  featureList: [
    'Professional Product Photography',
    'Virtual Try-On',
    'Background Replacement',
    'Video Generation',
    'Batch Processing',
  ],
});

export const buildSoftwareAppWithReviewsSchema = () => ({
  '@type': 'SoftwareApplication',
  '@id': `${BASE_URL}/#software`,
  name: 'ProduktPix',
  applicationCategory: 'PhotographyApplication',
  operatingSystem: 'Web',
  description: 'Professional product photography tool for e-commerce businesses',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '127',
    bestRating: '5',
  },
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '99',
    priceCurrency: 'EUR',
  },
});

export const buildFAQPageSchema = (items: FAQItem[]) => ({
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
});

export const buildHowToSchema = (
  name: string,
  description: string,
  steps: HowToStep[]
) => ({
  '@type': 'HowTo',
  name,
  description,
  step: steps.map((step, index) => ({
    '@type': 'HowToStep',
    position: index + 1,
    name: step.name,
    text: step.text,
    ...(step.image && { image: step.image }),
  })),
});

export const buildProductSchema = (offer: ProductOffer) => ({
  '@type': 'Product',
  name: offer.name,
  description: offer.description,
  brand: {
    '@type': 'Brand',
    name: 'ProduktPix',
  },
  offers: {
    '@type': 'Offer',
    price: offer.price,
    priceCurrency: offer.priceCurrency || 'EUR',
    availability: 'https://schema.org/InStock',
    seller: { '@id': `${BASE_URL}/#organization` },
  },
  ...(offer.features && { additionalProperty: offer.features.map(f => ({
    '@type': 'PropertyValue',
    name: 'Feature',
    value: f,
  }))})
});

export const buildBreadcrumbSchema = (
  items: { name: string; url: string }[]
) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

export const buildWebPageSchema = (
  name: string,
  description: string,
  path: string
) => ({
  '@type': 'WebPage',
  '@id': `${BASE_URL}${path}`,
  name,
  description,
  isPartOf: { '@id': `${BASE_URL}/#website` },
  about: { '@id': `${BASE_URL}/#organization` },
  inLanguage: ['pt', 'en', 'es', 'fr', 'de'],
});

export const buildTechArticleSchema = (
  name: string,
  description: string,
  path: string
) => ({
  '@type': 'TechArticle',
  '@id': `${BASE_URL}${path}`,
  headline: name,
  description,
  author: { '@id': `${BASE_URL}/#organization` },
  publisher: { '@id': `${BASE_URL}/#organization` },
  inLanguage: 'en',
});

export const buildGraphSchema = (schemas: object[]) => ({
  '@context': 'https://schema.org',
  '@graph': schemas,
});
