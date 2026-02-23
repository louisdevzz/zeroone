"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-white/8 bg-background/80 backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <img src="/logo.png" className="w-8" alt="ZeroOne Logo" />
            <span className="text-xl font-bold">
              <span className="text-primary">Zero</span>
              <span className="text-foreground">One</span>
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#providers" className="hover:text-foreground transition-colors">Providers</Link>
          <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="https://github.com/zeroclaw-labs/zeroclaw" target="_blank" className="hover:text-foreground transition-colors">
            Docs
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Get started free
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
