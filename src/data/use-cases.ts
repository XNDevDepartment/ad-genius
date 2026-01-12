export interface UseCase {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  heroImage: string;
  icon: string;
  benefits: string[];
  faqs: { question: string; answer: string }[];
  relatedUseCases: string[];
}

export const useCases: UseCase[] = [
  {
    slug: 'amazon-product-photos',
    title: 'AI Product Photos for Amazon',
    description: 'Create Amazon-compliant product images that convert. Generate white background photos, lifestyle shots, and infographics in seconds.',
    metaTitle: 'AI Product Photos for Amazon Listings',
    metaDescription: 'Generate Amazon-compliant product photos instantly. White backgrounds, lifestyle images, and infographics that meet Amazon requirements and boost conversions.',
    heroImage: '/use-cases/amazon.webp',
    icon: 'ShoppingCart',
    benefits: [
      'Amazon-compliant white backgrounds',
      'Lifestyle images that show products in use',
      'Infographic-ready templates',
      'Bulk processing for large catalogs',
      'Consistent quality across all listings'
    ],
    faqs: [
      { question: 'Does ProduktPix create Amazon-compliant images?', answer: 'Yes! Our AI automatically generates images with pure white backgrounds that meet Amazon\'s technical requirements for main images.' },
      { question: 'Can I create lifestyle images for Amazon?', answer: 'Absolutely. Generate lifestyle shots showing your product in real-world contexts, perfect for secondary image slots on Amazon listings.' },
      { question: 'How fast can I process my entire catalog?', answer: 'With our batch processing, you can generate images for hundreds of products in minutes, not days.' }
    ],
    relatedUseCases: ['shopify-listing-images', 'ecommerce-product-photos', 'white-background-photos']
  },
  {
    slug: 'shopify-listing-images',
    title: 'AI Images for Shopify Stores',
    description: 'Create stunning product photos for your Shopify store. Professional quality images that match your brand aesthetic.',
    metaTitle: 'AI Product Images for Shopify Stores',
    metaDescription: 'Generate professional Shopify product photos with AI. Create consistent, brand-aligned images for your entire store in minutes.',
    heroImage: '/use-cases/shopify.webp',
    icon: 'Store',
    benefits: [
      'Brand-consistent imagery',
      'Multiple angles and variations',
      'Lifestyle and context shots',
      'Optimized for web performance',
      'Direct Shopify integration coming soon'
    ],
    faqs: [
      { question: 'Can I match my brand style?', answer: 'Yes! Describe your brand aesthetic and our AI will generate images that match your store\'s look and feel.' },
      { question: 'What image formats are supported?', answer: 'We export in PNG and JPG formats, optimized for web performance on Shopify stores.' },
      { question: 'Can I import products directly from Shopify?', answer: 'Our Shopify integration allows you to import product images directly and generate variations.' }
    ],
    relatedUseCases: ['amazon-product-photos', 'ecommerce-product-photos', 'fashion-model-photography']
  },
  {
    slug: 'fashion-model-photography',
    title: 'AI Model Photos for Clothing',
    description: 'Generate professional model photography for fashion and apparel. Virtual try-on technology puts your clothes on realistic AI models.',
    metaTitle: 'AI Model Photography for Fashion & Clothing',
    metaDescription: 'Create professional fashion model photos with AI. Virtual try-on technology for clothing brands. No expensive photoshoots required.',
    heroImage: '/use-cases/fashion.webp',
    icon: 'Shirt',
    benefits: [
      'Diverse model representation',
      'Multiple poses and angles',
      'No model booking required',
      'Consistent lighting and quality',
      'Scale from 1 to 1000 products'
    ],
    faqs: [
      { question: 'How realistic are the AI models?', answer: 'Our AI generates photorealistic model images that are indistinguishable from traditional photography.' },
      { question: 'Can I choose different model types?', answer: 'Yes! Select from various body types, ethnicities, ages, and poses to represent your brand inclusively.' },
      { question: 'Does it work with all clothing types?', answer: 'Our virtual try-on works with tops, bottoms, dresses, outerwear, and accessories.' }
    ],
    relatedUseCases: ['shopify-listing-images', 'lookbook-photography', 'ecommerce-product-photos']
  },
  {
    slug: 'jewelry-product-photos',
    title: 'AI Jewelry Photography',
    description: 'Capture the sparkle and detail of jewelry with AI-powered photography. Perfect lighting, reflections, and macro detail.',
    metaTitle: 'AI Jewelry Product Photography',
    metaDescription: 'Create stunning jewelry photos with AI. Perfect lighting, reflections, and detail that showcase your pieces beautifully.',
    heroImage: '/use-cases/jewelry.webp',
    icon: 'Gem',
    benefits: [
      'Perfect lighting for metals and gems',
      'Macro detail preservation',
      'Consistent style across collections',
      'Multiple background options',
      'Reflection and sparkle effects'
    ],
    faqs: [
      { question: 'Can AI capture jewelry details accurately?', answer: 'Yes! Our AI preserves fine details, textures, and the natural sparkle of gems and precious metals.' },
      { question: 'What backgrounds work best for jewelry?', answer: 'We offer elegant backgrounds including marble, velvet, gradient, and pure white options.' },
      { question: 'Does it work for all jewelry types?', answer: 'From rings and necklaces to watches and earrings, our AI handles all jewelry categories.' }
    ],
    relatedUseCases: ['luxury-product-photos', 'white-background-photos', 'ecommerce-product-photos']
  },
  {
    slug: 'cosmetics-packaging',
    title: 'AI Beauty & Cosmetics Photography',
    description: 'Create luxurious product shots for cosmetics and beauty products. Perfect for skincare, makeup, and personal care brands.',
    metaTitle: 'AI Cosmetics & Beauty Product Photography',
    metaDescription: 'Generate stunning beauty and cosmetics product photos with AI. Luxury aesthetics for skincare, makeup, and personal care brands.',
    heroImage: '/use-cases/cosmetics.webp',
    icon: 'Sparkles',
    benefits: [
      'Luxury aesthetic options',
      'Texture and finish accuracy',
      'Ingredient-inspired backgrounds',
      'Consistent brand imagery',
      'Social media ready formats'
    ],
    faqs: [
      { question: 'Can you show product textures?', answer: 'Yes! Our AI can showcase cream textures, powder finishes, and liquid products beautifully.' },
      { question: 'What about packaging reflections?', answer: 'We handle reflective packaging like glass bottles and metallic tubes with professional lighting.' },
      { question: 'Can I create lifestyle beauty shots?', answer: 'Absolutely. Generate spa-inspired, natural, or glamorous lifestyle contexts for your products.' }
    ],
    relatedUseCases: ['luxury-product-photos', 'skincare-photography', 'ecommerce-product-photos']
  },
  {
    slug: 'food-photography',
    title: 'AI Food Product Photography',
    description: 'Make your food products look irresistible. Perfect for packaged foods, beverages, and food brands.',
    metaTitle: 'AI Food Product Photography',
    metaDescription: 'Create appetizing food product photos with AI. Perfect for packaged foods, beverages, and CPG brands.',
    heroImage: '/use-cases/food.webp',
    icon: 'UtensilsCrossed',
    benefits: [
      'Appetizing presentation',
      'Ingredient-forward styling',
      'Recipe context shots',
      'Seasonal variations',
      'Packaging and product focus'
    ],
    faqs: [
      { question: 'Does it work for packaged food products?', answer: 'Yes! We specialize in packaged food photography, showing products in appetizing contexts.' },
      { question: 'Can I show ingredients alongside products?', answer: 'Absolutely. Generate shots with fresh ingredients that highlight your product\'s quality.' },
      { question: 'What about beverages?', answer: 'From bottles to cans, we create refreshing beverage shots with condensation, ice, and garnishes.' }
    ],
    relatedUseCases: ['beverage-photography', 'ecommerce-product-photos', 'packaging-photography']
  },
  {
    slug: 'furniture-lifestyle',
    title: 'AI Furniture & Home Decor Photos',
    description: 'Show your furniture in beautiful room settings. Generate lifestyle images that help customers visualize products in their homes.',
    metaTitle: 'AI Furniture & Home Decor Photography',
    metaDescription: 'Create stunning furniture lifestyle photos with AI. Show products in beautiful room settings that inspire customers.',
    heroImage: '/use-cases/furniture.webp',
    icon: 'Sofa',
    benefits: [
      'Multiple room settings',
      'Style variations (modern, traditional, etc.)',
      'Scale visualization',
      'Color and material accuracy',
      'Seasonal decor options'
    ],
    faqs: [
      { question: 'Can I show furniture in different room styles?', answer: 'Yes! Choose from modern, traditional, minimalist, bohemian, and many other interior styles.' },
      { question: 'How accurate are the proportions?', answer: 'Our AI maintains accurate proportions so customers can visualize how pieces fit in their spaces.' },
      { question: 'Does it work for small decor items too?', answer: 'Absolutely. From large furniture to small decor accessories, we handle all home goods.' }
    ],
    relatedUseCases: ['home-decor-photography', 'ecommerce-product-photos', 'lifestyle-photography']
  },
  {
    slug: 'electronics-tech',
    title: 'AI Electronics & Tech Product Photos',
    description: 'Showcase tech products with sleek, modern imagery. Perfect for consumer electronics, gadgets, and tech accessories.',
    metaTitle: 'AI Electronics & Tech Product Photography',
    metaDescription: 'Create sleek tech product photos with AI. Modern aesthetics for consumer electronics, gadgets, and accessories.',
    heroImage: '/use-cases/electronics.webp',
    icon: 'Smartphone',
    benefits: [
      'Clean, modern aesthetics',
      'Screen mockups included',
      'Technical detail focus',
      'Lifestyle tech contexts',
      'Multiple angle coverage'
    ],
    faqs: [
      { question: 'Can you add screen content to devices?', answer: 'Yes! We can add realistic screen mockups to phones, tablets, and monitors.' },
      { question: 'What backgrounds work for tech products?', answer: 'We offer minimalist, gradient, desk setup, and lifestyle backgrounds perfect for tech.' },
      { question: 'Does it preserve small details like ports and buttons?', answer: 'Our AI maintains crisp detail on technical features and small product elements.' }
    ],
    relatedUseCases: ['gadget-photography', 'ecommerce-product-photos', 'white-background-photos']
  },
  {
    slug: 'etsy-handmade',
    title: 'AI Photos for Etsy Sellers',
    description: 'Create charming product photos that stand out on Etsy. Perfect for handmade, vintage, and craft products.',
    metaTitle: 'AI Product Photos for Etsy Sellers',
    metaDescription: 'Generate beautiful Etsy product photos with AI. Charming, artisanal aesthetics that help your handmade products stand out.',
    heroImage: '/use-cases/etsy.webp',
    icon: 'Palette',
    benefits: [
      'Artisanal aesthetic options',
      'Craft-inspired backgrounds',
      'Natural lighting styles',
      'Scale reference shots',
      'Process/making-of contexts'
    ],
    faqs: [
      { question: 'Can I maintain the handmade feel?', answer: 'Absolutely! Our AI creates warm, artisanal aesthetics that highlight the handcrafted nature of your products.' },
      { question: 'What about showing product scale?', answer: 'Generate images with hands, common objects, or lifestyle contexts that help buyers understand size.' },
      { question: 'Does it work for vintage items?', answer: 'Yes! We can create nostalgic, period-appropriate settings for vintage and antique products.' }
    ],
    relatedUseCases: ['handmade-photography', 'craft-product-photos', 'amazon-product-photos']
  },
  {
    slug: 'white-background-photos',
    title: 'AI White Background Product Photos',
    description: 'Generate clean, professional white background photos instantly. Perfect for marketplaces, catalogs, and e-commerce.',
    metaTitle: 'AI White Background Product Photography',
    metaDescription: 'Create perfect white background product photos with AI. Clean, professional images for marketplaces and e-commerce.',
    heroImage: '/use-cases/white-bg.webp',
    icon: 'Square',
    benefits: [
      'Pure white backgrounds',
      'Marketplace compliant',
      'Consistent lighting',
      'Shadow options',
      'Batch processing'
    ],
    faqs: [
      { question: 'Are the backgrounds truly white?', answer: 'Yes! Our AI generates pure white (RGB 255,255,255) backgrounds that meet marketplace requirements.' },
      { question: 'Can I add or remove shadows?', answer: 'Choose from no shadow, soft shadow, or reflection shadow options to match your needs.' },
      { question: 'How fast is batch processing?', answer: 'Process hundreds of products in minutes with consistent white backgrounds across your entire catalog.' }
    ],
    relatedUseCases: ['amazon-product-photos', 'ecommerce-product-photos', 'catalog-photography']
  }
];

export const getUseCaseBySlug = (slug: string): UseCase | undefined => {
  return useCases.find(uc => uc.slug === slug);
};

export const getRelatedUseCases = (slugs: string[]): UseCase[] => {
  return useCases.filter(uc => slugs.includes(uc.slug));
};
