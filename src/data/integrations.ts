export interface Integration {
  slug: string;
  name: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  logo: string;
  color: string;
  features: string[];
  benefits: string[];
  faqs: { question: string; answer: string }[];
}

export const integrations: Integration[] = [
  {
    slug: 'shopify',
    name: 'Shopify',
    title: 'ProduktPix for Shopify Stores',
    description: 'Transform your Shopify store with AI-generated product photos. Import products, generate stunning images, and boost your conversions.',
    metaTitle: 'AI Product Photos for Shopify',
    metaDescription: 'Generate professional product photos for your Shopify store with AI. Import products, create stunning images, boost conversions.',
    logo: '/logos/shopify.png',
    color: '#96BF48',
    features: [
      'Direct product import from Shopify',
      'Bulk image generation',
      'Automatic image optimization',
      'Brand style consistency',
      'One-click export to store'
    ],
    benefits: [
      'Save 90% on product photography costs',
      'Launch new products faster',
      'Maintain consistent brand imagery',
      'Scale your catalog effortlessly',
      'Increase conversion rates with professional photos'
    ],
    faqs: [
      { question: 'How do I connect my Shopify store?', answer: 'Simply enter your Shopify store URL and authorize ProduktPix. We\'ll import your products automatically.' },
      { question: 'Can I generate images for my entire catalog?', answer: 'Yes! Use our batch processing to generate images for hundreds of products at once.' },
      { question: 'Will the images be optimized for Shopify?', answer: 'Absolutely. Images are automatically optimized for web performance and Shopify\'s requirements.' }
    ]
  },
  {
    slug: 'amazon',
    name: 'Amazon',
    title: 'ProduktPix for Amazon Sellers',
    description: 'Create Amazon-compliant product images that convert. White backgrounds, lifestyle shots, and infographics that meet all Amazon requirements.',
    metaTitle: 'AI Product Photos for Amazon Sellers',
    metaDescription: 'Generate Amazon-compliant product photos with AI. White backgrounds, lifestyle images, and infographics that boost your listings.',
    logo: '/logos/amazon.png',
    color: '#FF9900',
    features: [
      'Amazon-compliant white backgrounds',
      'A+ Content ready images',
      'Infographic templates',
      'Lifestyle image generation',
      'Bulk ASIN processing'
    ],
    benefits: [
      'Meet Amazon\'s strict image requirements',
      'Stand out from competitors',
      'Increase click-through rates',
      'Reduce listing rejections',
      'Scale your Amazon business faster'
    ],
    faqs: [
      { question: 'Do the images meet Amazon\'s requirements?', answer: 'Yes! We generate pure white backgrounds and properly sized images that comply with Amazon\'s technical standards.' },
      { question: 'Can I create A+ Content images?', answer: 'Absolutely. Generate comparison charts, feature callouts, and lifestyle images perfect for A+ Content.' },
      { question: 'How do I process multiple ASINs?', answer: 'Upload your product images in bulk and generate Amazon-ready photos for your entire catalog.' }
    ]
  },
  {
    slug: 'etsy',
    name: 'Etsy',
    title: 'ProduktPix for Etsy Sellers',
    description: 'Create charming, artisanal product photos that stand out on Etsy. Perfect for handmade, vintage, and craft products.',
    metaTitle: 'AI Product Photos for Etsy Sellers',
    metaDescription: 'Generate beautiful Etsy product photos with AI. Artisanal aesthetics that help your handmade products stand out and sell.',
    logo: '/logos/etsy.png',
    color: '#F56400',
    features: [
      'Artisanal aesthetic styles',
      'Natural lighting effects',
      'Craft-inspired backgrounds',
      'Scale reference shots',
      'Lifestyle context images'
    ],
    benefits: [
      'Stand out in Etsy search results',
      'Maintain handmade aesthetic',
      'Create consistent shop imagery',
      'Save time on photography',
      'Increase sales with professional photos'
    ],
    faqs: [
      { question: 'Will the photos look too polished for Etsy?', answer: 'No! We offer warm, artisanal aesthetics that highlight the handcrafted nature of your products.' },
      { question: 'Can I show scale in my photos?', answer: 'Yes! Generate images with hands, common objects, or lifestyle contexts to help buyers understand size.' },
      { question: 'Does it work for vintage items?', answer: 'Absolutely. Create nostalgic, period-appropriate settings for vintage and antique products.' }
    ]
  },
  {
    slug: 'woocommerce',
    name: 'WooCommerce',
    title: 'ProduktPix for WooCommerce',
    description: 'Enhance your WooCommerce store with AI-generated product photos. Create professional images that drive sales.',
    metaTitle: 'AI Product Photos for WooCommerce',
    metaDescription: 'Generate professional product photos for WooCommerce with AI. Boost your WordPress store with stunning product imagery.',
    logo: '/logos/woocommerce.png',
    color: '#96588A',
    features: [
      'WordPress/WooCommerce optimized',
      'Multiple image sizes',
      'Gallery-ready variations',
      'SEO-friendly alt text',
      'Bulk image generation'
    ],
    benefits: [
      'Professional store appearance',
      'Faster product launches',
      'Consistent brand imagery',
      'Improved SEO with quality images',
      'Higher conversion rates'
    ],
    faqs: [
      { question: 'What image sizes are generated?', answer: 'We generate images optimized for WooCommerce galleries, thumbnails, and full-size product views.' },
      { question: 'Can I generate multiple variations?', answer: 'Yes! Create different angles, backgrounds, and styles for each product.' },
      { question: 'Is it compatible with my WordPress theme?', answer: 'Images are standard formats that work with any WordPress theme or WooCommerce setup.' }
    ]
  },
  {
    slug: 'bigcommerce',
    name: 'BigCommerce',
    title: 'ProduktPix for BigCommerce',
    description: 'Create enterprise-quality product photos for your BigCommerce store. Scale your catalog with AI-powered imagery.',
    metaTitle: 'AI Product Photos for BigCommerce',
    metaDescription: 'Generate enterprise-quality product photos for BigCommerce with AI. Scale your catalog with professional imagery.',
    logo: '/logos/bigcommerce.png',
    color: '#34313F',
    features: [
      'Enterprise-grade quality',
      'Bulk catalog processing',
      'Multi-channel ready',
      'Brand guideline compliance',
      'API integration ready'
    ],
    benefits: [
      'Enterprise-scale image generation',
      'Consistent multi-channel imagery',
      'Reduced photography costs',
      'Faster time to market',
      'Professional brand presentation'
    ],
    faqs: [
      { question: 'Can it handle large product catalogs?', answer: 'Absolutely. Our batch processing handles thousands of products efficiently.' },
      { question: 'Are images multi-channel ready?', answer: 'Yes! Generate images optimized for your website, marketplaces, and social channels simultaneously.' },
      { question: 'Is there API access for automation?', answer: 'Our API allows you to integrate image generation directly into your workflows.' }
    ]
  }
];

export const getIntegrationBySlug = (slug: string): Integration | undefined => {
  return integrations.find(i => i.slug === slug);
};
