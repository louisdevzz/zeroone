"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Hobby",
    price: "$0",
    period: "forever",
    description: "Perfect for experimenting and personal projects.",
    badge: null,
    features: [
      "1 active agent",
      "~5MB RAM per agent",
      "Shared subdomain (*.zeroonec.xyz)",
      "15+ LLM providers",
      "Community support",
      "Self-hostable",
    ],
    cta: "Start for free",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "per month",
    description: "For builders shipping production-grade AI agents.",
    badge: "Most popular",
    features: [
      "Up to 5 active agents",
      "Custom domain support",
      "Priority CPU & RAM allocation",
      "All 15+ LLM providers",
      "Email support",
      "Agent analytics & logs",
      "Telegram, Discord & Slack channels",
    ],
    cta: "Get started",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Unlimited scale, dedicated infra, and white-glove support.",
    badge: null,
    features: [
      "Unlimited agents",
      "Dedicated VPS cluster",
      "Custom integrations",
      "SSO / SAML",
      "On-prem deployment",
      "24/7 SLA support",
    ],
    cta: "Contact us",
    href: "mailto:hello@zeroonec.xyz",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start free. No credit card required. Scale as you grow.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 transition-all duration-300",
                plan.highlight
                  ? "border-primary/40 bg-primary/8 shadow-[0_0_60px_-15px_rgba(186,72,17,0.3)]"
                  : "border-white/8 bg-white/4 hover:border-white/12"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="mb-1 text-sm text-muted-foreground">/{plan.period}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <Button
                  size="lg"
                  className={cn(
                    "w-full font-semibold",
                    plan.highlight
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "border-white/10 bg-white/6 hover:bg-white/10"
                  )}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
