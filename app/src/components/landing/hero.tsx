"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Cpu } from "lucide-react";

const stats = [
  { value: "<10ms", label: "Cold start" },
  { value: "15+", label: "LLM providers" },
  { value: "Rust", label: "Powered by" },
  { value: "100%", label: "Open source" },
];

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 text-center">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[140px]" />
        <div className="absolute left-1/4 top-1/4 h-[300px] w-[300px] rounded-full bg-orange-900/10 blur-[80px]" />
        <div className="absolute right-1/4 bottom-1/3 h-[200px] w-[200px] rounded-full bg-primary/8 blur-[60px]" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex max-w-4xl flex-col items-center gap-6"
      >
        {/* Badge */}
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          <Zap className="h-3 w-3" />
          Launch AI agents instantly. No infra. No hassle.
        </span>

        {/* Headline */}
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl">
          Deploy AI agents{" "}
          <span className="bg-gradient-to-r from-primary via-orange-400 to-amber-400 bg-clip-text text-transparent">
            in one click
          </span>
        </h1>

        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          ZeroOne runs ZeroClaw AI agents inside isolated Docker containers.
          Built with Rust for maximum efficiency — run hundreds of agents
          on a single VPS.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 px-8"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="https://github.com/zeroclaw-labs/zeroclaw" target="_blank">
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 bg-white/4 hover:bg-white/8 gap-2"
            >
              <Cpu className="h-4 w-4 text-primary" />
              View ZeroClaw
            </Button>
          </Link>
        </div>

        {/* Trust note */}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-green-400" />
          Free plan · No credit card required · Self-hostable
        </p>

        {/* Quick Start banner */}
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/6 px-5 py-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Quick Start — No API key required</p>
            <p className="text-xs text-muted-foreground">
              Built-in ModelArk provider · 100 messages/day included · Upgrade anytime
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative z-10 mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-4"
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 bg-background px-8 py-6"
          >
            <span className="text-2xl font-bold text-primary">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
