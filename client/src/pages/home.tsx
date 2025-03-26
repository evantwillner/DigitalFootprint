import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <section className="mb-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Digital Footprint Analyzer</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover and analyze your digital presence across popular social media platforms
          </p>
        </div>
        
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">Track Your Digital Footprint</h2>
                <p className="text-gray-600 mb-6">
                  Our powerful analysis tools scan public profiles across Instagram, Reddit, Facebook, Twitter and more to provide insights about your online presence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild size="lg">
                    <Link href="/search">Start Searching</Link>
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link href="/pricing">View Plans</Link>
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="h-48 w-48 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="material-icons text-primary text-6xl">privacy_tip</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary mb-4">
                  <span className="material-icons">search</span>
                </span>
                <h3 className="text-lg font-medium">Search</h3>
              </div>
              <p className="text-gray-600">
                Enter a username and select the platforms you want to analyze. Our system will search for publicly available data.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary mb-4">
                  <span className="material-icons">analytics</span>
                </span>
                <h3 className="text-lg font-medium">Analyze</h3>
              </div>
              <p className="text-gray-600">
                Our algorithms analyze content, activity patterns, and engagement to provide comprehensive insights about the digital footprint.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-primary mb-4">
                  <span className="material-icons">shield</span>
                </span>
                <h3 className="text-lg font-medium">Protect</h3>
              </div>
              <p className="text-gray-600">
                Get recommendations to improve your online privacy or use our premium services to remove unwanted digital footprints.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <section className="mb-12">
        <Card className="bg-blue-50 border-none">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Ready to discover your digital footprint?</h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Start with a free search to see what information is publicly available about you or someone else online.
              </p>
              <Button asChild size="lg">
                <Link href="/search">Search Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-center">Why Choose DigitalClear</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <span className="text-primary material-icons">check_circle</span>
            <div>
              <h3 className="text-lg font-medium mb-2">Comprehensive Analysis</h3>
              <p className="text-gray-600">
                Detailed insights across multiple platforms to give you a complete picture of your digital presence.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <span className="text-primary material-icons">check_circle</span>
            <div>
              <h3 className="text-lg font-medium mb-2">Privacy Focused</h3>
              <p className="text-gray-600">
                We only analyze publicly available information and prioritize your privacy at every step.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <span className="text-primary material-icons">check_circle</span>
            <div>
              <h3 className="text-lg font-medium mb-2">Actionable Insights</h3>
              <p className="text-gray-600">
                Get practical recommendations to improve your digital footprint and online privacy.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <span className="text-primary material-icons">check_circle</span>
            <div>
              <h3 className="text-lg font-medium mb-2">Premium Cleanup</h3>
              <p className="text-gray-600">
                Advanced options to remove unwanted content and enhance your online reputation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
