"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PaymentSuccessSkeleton } from "@/components/dashboard/skeletons";

export default function PaymentSuccessPage() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Small delay for better UX
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!showContent) {
    return <PaymentSuccessSkeleton />;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Payment Successful!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Thank you for your subscription. Your plan will be activated shortly. 
            You may need to refresh the page to see your updated plan.
          </p>
          
          <div className="space-y-3 w-full">
            <Link href="/dashboard/billing">
              <Button className="w-full gap-2">
                Go to Billing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
