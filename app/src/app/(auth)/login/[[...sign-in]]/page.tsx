"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-1">
            <img src="/logo.png" className="w-10" alt="ZeroOne Logo" />
            <span className="text-3xl font-bold">
              <span className="text-primary">Zero</span>
              <span className="text-foreground">One</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <div className="w-full">
          <SignIn 
            appearance={{
              theme: dark,
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none p-0",
                header: "hidden",
                socialButtonsBlockButton: "w-full border-white/10 bg-white/4 hover:bg-white/8 text-foreground",
                socialButtonsBlockButtonText: "text-sm font-medium",
                dividerRow: "border-white/8",
                dividerText: "text-muted-foreground text-xs",
                formFieldLabel: "text-foreground",
                formFieldInput: "bg-white/4 border-white/10 text-foreground placeholder:text-muted-foreground",
                formButtonPrimary: "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold",
                footer: "hidden",
                identityPreviewText: "text-foreground",
                identityPreviewEditButton: "text-primary",
                formFieldAction: "text-primary hover:text-primary/80",
                alternativeMethodsBlockButton: "text-primary hover:text-primary/80",
                otpCodeFieldInput: "bg-white/4 border-white/10 text-foreground",
              },
            }}
            routing="path"
            path="/login"
            signUpUrl="/register"
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}
