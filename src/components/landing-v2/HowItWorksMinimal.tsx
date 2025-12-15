import { useTranslation } from "react-i18next";
import { Upload, Wand2, Download } from "lucide-react";

export const HowItWorksMinimal = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: Upload,
      number: "01",
      title: t('landingV2.howItWorks.step1.title', 'Upload Your Photo'),
      description: t('landingV2.howItWorks.step1.description', 'Drop any product image - even a simple phone photo works great.'),
    },
    {
      icon: Wand2,
      number: "02",
      title: t('landingV2.howItWorks.step2.title', 'AI Does the Magic'),
      description: t('landingV2.howItWorks.step2.description', 'Our AI enhances, places on models, or creates stunning backgrounds.'),
    },
    {
      icon: Download,
      number: "03",
      title: t('landingV2.howItWorks.step3.title', 'Download & Sell'),
      description: t('landingV2.howItWorks.step3.description', 'Get high-resolution images ready for your store in seconds.'),
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('landingV2.howItWorks.title', 'How It Works')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landingV2.howItWorks.subtitle', 'Three simple steps to professional product photos')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center group">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/50 to-primary/10" />
              )}
              
              {/* Step number */}
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                  <step.icon className="h-10 w-10 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
