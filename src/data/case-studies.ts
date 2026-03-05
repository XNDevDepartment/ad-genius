export interface CaseStudy {
  slug: string;
  company: string;
  industry: string;
  logo?: string;
  challenge: string;
  solution: string;
  quote: string;
  quoteName: string;
  quoteRole: string;
  metrics: { label: string; value: string }[];
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'ogato-das-fraldas',
    company: 'OGatoDasFraldas',
    industry: 'Baby & Kids Fashion',
    challenge: 'As a small baby products brand, OGatoDasFraldas needed fresh product images for seasonal collections but couldn\'t afford recurring studio sessions. Each shoot cost over €500 and took a week to schedule.',
    solution: 'With ProduktPix, the founder uploads phone photos and generates professional lifestyle images in seconds. New collections now launch with full visual assets on day one.',
    quote: 'A tool with great potential. A valuable addition for generating stand-out, unique images.',
    quoteName: 'Andreia Vieira',
    quoteRole: 'Founder, OGatoDasFraldas',
    metrics: [
      { label: 'Photography cost reduction', value: '85%' },
      { label: 'Time to launch new products', value: '3x faster' },
      { label: 'Images generated per month', value: '120+' },
    ],
  },
  {
    slug: 'bug-hug',
    company: 'Bug Hug',
    industry: 'Fashion & Accessories',
    challenge: 'Bug Hug\'s creative director needed lifestyle images for social media and ads but the team of two couldn\'t justify hiring photographers for every campaign.',
    solution: 'ProduktPix became their go-to tool for generating on-brand lifestyle scenes. They now produce weeks of social content in a single afternoon.',
    quote: 'We are already achieving very, very interesting results! The results were shocking! They were so good!!',
    quoteName: 'Sofia Santos',
    quoteRole: 'Creative Director, Bug Hug',
    metrics: [
      { label: 'Social media content output', value: '4x more' },
      { label: 'Cost per product image', value: '€0.30' },
      { label: 'Campaign launch time', value: '1 day vs 2 weeks' },
    ],
  },
  {
    slug: 'yonos',
    company: 'Yonos',
    industry: 'E-commerce / Consumer Goods',
    challenge: 'Yonos needed consistent product photography across hundreds of SKUs but couldn\'t maintain visual consistency across multiple studio sessions.',
    solution: 'Using ProduktPix\'s batch processing and preset backgrounds, Yonos achieved perfect catalog consistency without ever booking a studio.',
    quote: 'Good ease of use is a fact but the end result...what a show.',
    quoteName: 'Luís Alves',
    quoteRole: 'Founder, Yonos',
    metrics: [
      { label: 'Catalog consistency', value: '100%' },
      { label: 'Images processed in bulk', value: '200+' },
      { label: 'Monthly photography savings', value: '€1,200' },
    ],
  },
];

export const getCaseStudyBySlug = (slug: string) =>
  caseStudies.find((cs) => cs.slug === slug);
