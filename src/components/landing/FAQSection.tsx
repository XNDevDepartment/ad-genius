import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion";
  
  const faqs = [
    {
      question: "How does the AI understand my brand?",
      answer: "Our AI analyzes your uploaded brand assets (logo, colors, fonts) and any style references you provide. It learns your brand's visual language and applies it consistently across all generated ads."
    },
    {
      question: "What formats can I export my ads in?",
      answer: "You can export in multiple formats including PNG, JPG for static ads, MP4 for videos, and GIF for animated banners. We support various dimensions for different platforms like Instagram, Facebook, Google Ads, and more."
    },
    {
      question: "Can I edit the generated ads?",
      answer: "Yes! While our AI creates production-ready ads, you can make adjustments to text, colors, and layout. You can also regenerate specific elements or request variations until you're completely satisfied."
    },
    {
      question: "How accurate are the generated ads to my prompt?",
      answer: "Our AI has a 95% accuracy rate in matching creative briefs. If the result doesn't meet your expectations, you can refine your prompt or use our iterative generation feature to get closer to your vision."
    },
    {
      question: "Do I own the rights to generated ads?",
      answer: "Yes, you have full commercial rights to all ads generated with your account. This includes using them for client work, selling products, or any other commercial purposes."
    },
    {
      question: "What's included in the free plan?",
      answer: "The free plan includes 30 generation credits per month, access to basic templates, 720p resolution exports, and community support. It's perfect for testing our platform and small projects."
    },
    {
      question: "Can I integrate Ad Genius with my existing tools?",
      answer: "Yes, our Pro and Growth plans include API access. You can integrate with popular platforms like Canva, Figma, and various marketing automation tools. We also offer webhooks for custom workflows."
    },
    {
      question: "How fast is ad generation?",
      answer: "Most static ads are generated in 3-10 seconds, while video ads typically take 30-60 seconds. Processing time may vary based on complexity and current server load."
    }
  ];
  
  const FAQ = () => {
    return (
      <section className="py-section px-6" id="faq">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="heading-lg mb-4">Frequently asked questions</h2>
            <p className="body-lg text-muted-foreground">
              Everything you need to know about Ad Genius
            </p>
          </div>
  
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
  
          <div className="text-center mt-12 p-8 bg-background-alt rounded-2xl border border-border">
            <h3 className="font-semibold text-lg mb-2">Still have questions?</h3>
            <p className="text-muted-foreground mb-4">
              Our team is here to help you get the most out of Ad Genius.
            </p>
            <button className="btn-ghost border border-border px-6 py-2 rounded-lg hover:bg-background">
              Contact support
            </button>
          </div>
        </div>
      </section>
    );
  };
  
  export default FAQ;