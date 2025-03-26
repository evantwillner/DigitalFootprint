import { useState } from "react";
import { PAGE_TITLES, DELETION_TIERS } from "@/lib/constants";
import PricingCard from "@/components/pricing/pricing-card";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    toast({
      title: "Plan Selected",
      description: `You've selected the ${planName} plan. This feature is coming soon!`,
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <section id="pricing-section" className="mb-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">{PAGE_TITLES.pricing}</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Take control of your online presence with our deletion services. Choose the plan that's right for you.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DELETION_TIERS.map((tier) => (
            <PricingCard
              key={tier.id}
              name={tier.name}
              price={tier.price}
              description={tier.description}
              features={tier.features}
              isPopular={tier.isPopular}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            All plans include a 14-day money-back guarantee. Need a custom solution?{' '}
            <a href="#" className="text-primary hover:underline">Contact us</a>
          </p>
        </div>
      </section>
      
      <section className="mb-12">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">How does the digital footprint cleanup work?</h3>
              <p className="text-gray-600 text-sm">
                Our service connects to your accounts through secure authentication and helps you identify and remove unwanted content. We provide tools and guidance to clean up your digital footprint across the platforms included in your plan.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Can you guarantee removal of all content?</h3>
              <p className="text-gray-600 text-sm">
                While we work diligently to remove as much content as possible, we cannot guarantee 100% removal. Some platforms have limitations on what can be removed, and cached versions may persist. We focus on removing content directly under your control and providing guidance for other instances.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">How long does the cleanup process take?</h3>
              <p className="text-gray-600 text-sm">
                The initial cleanup typically takes 3-5 business days, depending on the volume of content. After that, we provide ongoing monitoring and cleanup according to your subscription plan.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Can I cancel my subscription at any time?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can cancel your subscription at any time. We offer a 14-day money-back guarantee if you're not satisfied with our service.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Do you provide services for businesses or public figures?</h3>
              <p className="text-gray-600 text-sm">
                Yes, our Enterprise plan is designed for businesses and public figures who need comprehensive digital reputation management. We also offer custom solutions for specific needs.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="mb-12">
        <div className="bg-blue-50 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Still have questions?</h2>
          <p className="text-gray-600 mb-6">
            Our team is here to help you choose the right plan for your needs.
          </p>
          <button className="px-6 py-3 bg-white border border-primary text-primary font-medium rounded-md hover:bg-blue-50 transition-colors">
            Contact Support
          </button>
        </div>
      </section>
    </div>
  );
}
