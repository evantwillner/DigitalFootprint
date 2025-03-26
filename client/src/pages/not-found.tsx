import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 fade-in border-none shadow-xl glass-effect">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold heading-gradient mb-4">404 Not Found</h1>
            <p className="mb-6 text-muted-foreground">
              We couldn't find the page you were looking for. It might have been moved or deleted.
            </p>
            <Link href="/">
              <Button className="button-gradient">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
