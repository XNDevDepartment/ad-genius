import { useParams, useNavigate } from "react-router-dom";
import { getCaseStudyBySlug } from "@/data/case-studies";
import SEO from "@/components/SEO";
import { buildWebPageSchema } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const CaseStudyPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const cs = getCaseStudyBySlug(slug || '');

  if (!cs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Case study not found</h1>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${cs.company} — Professional Product Photos Case Study | ProduktPix`}
        description={cs.challenge.slice(0, 155)}
        path={`/case-studies/${cs.slug}`}
        schema={[buildWebPageSchema(
          `${cs.company} Case Study`,
          cs.challenge.slice(0, 155),
          `/case-studies/${cs.slug}`
        )]}
      />

      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        {/* Header */}
        <div className="space-y-4 mb-12">
          <p className="text-sm font-medium text-primary">{cs.industry}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            How {cs.company} Gets Professional Product Photos Without a Studio
          </h1>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {cs.metrics.map((metric, i) => (
            <Card key={i}>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-primary mb-1">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Challenge */}
        <div className="space-y-4 mb-12">
          <h2 className="text-2xl font-bold text-foreground">The Challenge</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{cs.challenge}</p>
        </div>

        {/* Solution */}
        <div className="space-y-4 mb-12">
          <h2 className="text-2xl font-bold text-foreground">The Solution</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{cs.solution}</p>
        </div>

        {/* Quote */}
        <div className="p-8 rounded-2xl bg-primary/5 border border-primary/10 mb-16">
          <Quote className="h-8 w-8 text-primary/30 mb-4" />
          <p className="text-xl text-foreground leading-relaxed mb-4">"{cs.quote}"</p>
          <p className="text-sm font-semibold text-foreground">{cs.quoteName}</p>
          <p className="text-sm text-muted-foreground">{cs.quoteRole}</p>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold text-foreground">
            Ready to get the same results?
          </h3>
          <p className="text-muted-foreground">
            Join {cs.company} and thousands of other e-commerce businesses.
          </p>
          <Button
            size="lg"
            className="rounded-full px-8 py-6 text-lg"
            onClick={() => navigate('/signup')}
          >
            Try It Free — No Credit Card
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CaseStudyPage;
