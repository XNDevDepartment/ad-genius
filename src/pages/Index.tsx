
import HeroSection from "@/components/landing/HeroSection";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import SocialProofSection from "@/components/landing/SocialProofSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Hero Section */}
      <HeroSection />
      
      {/* Feature Showcase */}
      <FeatureShowcase />
      
      {/* Social Proof and Testimonials */}
      <SocialProofSection />
    </div>
  );
};

export default Index;
