"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "Free",
    period: "forever",
    description: "Perfect for getting started with AI agents.",
    badge: "No credit card",
    features: [
      "1 active agent",
      "All AI providers",
      "Telegram, Discord & Slack",
      "SQLite memory",
      "Community support",
    ],
    cta: "Start now",
    href: "/register",
    highlight: false,
    icon: Zap,
  },
  {
    name: "Pro",
    price: "$9",
    period: "month",
    priceYearly: "$89",
    periodYearly: "year",
    description: "For builders shipping production-grade AI agents.",
    badge: "Most popular",
    features: [
      "Up to 5 active agents",
      "Custom domain support",
      "Priority email support",
      "Advanced memory options",
      "Agent analytics & logs",
    ],
    cta: "Get started",
    href: "/register?plan=pro",
    highlight: true,
    icon: Zap,
  },
  {
    name: "Business",
    price: "$49",
    period: "month",
    priceYearly: "$490",
    periodYearly: "year",
    description: "For teams collaborating on AI agent projects.",
    badge: "Best value",
    features: [
      "Up to 50 active agents",
      "Team Collaboration",
      "Priority configuration support",
      "Shared workspaces",
      "Advanced analytics",
    ],
    cta: "Get started",
    href: "/register?plan=business",
    highlight: false,
    icon: Users,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Unlimited scale, dedicated infra, and enterprise security.",
    badge: null,
    features: [
      "Unlimited agents",
      "On-premise deployment",
      "SSO / SAML authentication",
      "Dedicated support",
      "Custom SLA & audit logs",
    ],
    cta: "Contact sales",
    href: "mailto:sales@zeroone.ai",
    highlight: false,
    icon: Building2,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative px-6 py-24">
      <div className="mx-auto max-w-7xl">
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
          <p className="mt-1 text-xs text-muted-foreground">
            Yearly billing saves ~17.5%
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 transition-all duration-300",
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
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                  </div>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="mb-1 text-sm text-muted-foreground">/{plan.period}</span>}
                  </div>
                  {plan.priceYearly && (
                    <p className="mt-1 text-xs text-green-400">
                      or {plan.priceYearly}/{plan.periodYearly} (save ~17.5%)
                    </p>
                  )}
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
