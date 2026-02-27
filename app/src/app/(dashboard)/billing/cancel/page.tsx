"use client";

import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Payment Cancelled</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your payment was cancelled. No charges were made. 
          You can try again anytime or choose a different plan.
        </p>
        
        <div className="space-y-3 w-full">
          <Link href="/dashboard/billing">
            <Button className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
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
  );
}
