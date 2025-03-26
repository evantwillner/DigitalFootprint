import { Card, CardContent } from "@/components/ui/card";
import SearchForm from "@/components/search/search-form";
import { PAGE_TITLES } from "@/lib/constants";

export default function Search() {
  return (
    <div className="max-w-4xl mx-auto">
      <section id="search-section" className="mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold mb-6">{PAGE_TITLES.search}</h1>
          <p className="text-gray-600 mb-6">
            Enter a username and select platforms to analyze their digital footprint across the web.
          </p>
          
          <SearchForm />
        </div>
      </section>
      
      <section className="mb-12">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-primary mr-3">
                    <span className="material-icons text-sm">search</span>
                  </div>
                  <h3 className="font-medium">Search</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Enter the username you want to analyze and select the platforms where you want to search.
                </p>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-primary mr-3">
                    <span className="material-icons text-sm">analytics</span>
                  </div>
                  <h3 className="font-medium">Analyze</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Our system will collect and analyze public information to generate insights about the digital footprint.
                </p>
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-primary mr-3">
                    <span className="material-icons text-sm">visibility</span>
                  </div>
                  <h3 className="font-medium">Review</h3>
                </div>
                <p className="text-sm text-gray-600">
                  View detailed analysis, including activity patterns, content analysis, and privacy recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      
      <section className="mb-8">
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start">
              <span className="material-icons text-amber-500 mr-3">info</span>
              <div>
                <h3 className="font-medium mb-2">Privacy Notice</h3>
                <p className="text-sm text-gray-600">
                  DigitalClear only analyzes publicly available information on social media platforms. We do not access private accounts or content protected by privacy settings. All analysis is conducted in accordance with the terms of service of the respective platforms.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
