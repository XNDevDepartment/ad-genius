import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle } from "lucide-react";

export const FAQAccordion = () => {
  const { t } = useTranslation();

  const faqs = [
    {
      question: t('landingV2.faq.q1', 'What types of products work best with ProduktPix?'),
      answer: t('landingV2.faq.a1', 'ProduktPix works great with fashion, accessories, jewelry, home goods, electronics, and virtually any physical product. Our AI is trained on millions of e-commerce images to handle diverse product categories.'),
    },
    {
      question: t('landingV2.faq.q2', 'How many images can I generate with the free plan?'),
      answer: t('landingV2.faq.a2', 'The free plan includes 10 credits per month. Each image generation costs 1 credit, so you can create 10 professional product images every month at no cost.'),
    },
    {
      question: t('landingV2.faq.q3', 'What resolution are the generated images?'),
      answer: t('landingV2.faq.a3', 'Images are generated in high resolution suitable for e-commerce platforms. Paid plans unlock even higher resolution options perfect for print and large displays.'),
    },
    {
      question: t('landingV2.faq.q4', 'Can I use the images commercially?'),
      answer: t('landingV2.faq.a4', 'Yes! All images generated with ProduktPix are yours to use commercially. You have full rights to use them on your website, social media, marketplaces, and marketing materials.'),
    },
    {
      question: t('landingV2.faq.q5', 'How long does it take to generate an image?'),
      answer: t('landingV2.faq.a5', 'Most images are generated in under 30 seconds. Complex scenes or batch processing may take slightly longer, but our AI is optimized for speed without sacrificing quality.'),
    },
    {
      question: t('landingV2.faq.q6', 'Do you offer refunds?'),
      answer: t('landingV2.faq.a6', 'Yes, we offer a 7-day money-back guarantee on all paid plans. If you\'re not satisfied, contact our support team for a full refund.'),
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.faq.title', 'Frequently Asked Questions')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landingV2.faq.subtitle', 'Everything you need to know about ProduktPix')}
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-lg transition-shadow"
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact section */}
        <div className="mt-12 text-center p-8 rounded-2xl bg-primary/5 border border-primary/10">
          <MessageCircle className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t('landingV2.faq.stillHaveQuestions', 'Still have questions?')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('landingV2.faq.contactDescription', 'Our team is here to help you get started.')}
          </p>
          <a 
            href="mailto:info@produktpix.com" 
            className="text-primary hover:underline font-medium"
          >
            info@produktpix.com
          </a>
        </div>
      </div>
    </section>
  );
};
