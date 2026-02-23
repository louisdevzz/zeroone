"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSession } from "@/lib/auth";
import { api } from "@/lib/api";
import { Loader2, Check, Zap, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/api";

const PLAN_INFO = {
  FREE: {
    label: "Hobby",
    price: "$0",
    period: "forever",
    color: "text-muted-foreground",
    badge: "bg-white/8 text-muted-foreground border-white/10",
    icon: Sparkles,
    maxAgents: 1,
    features: [
      "1 active agent",
      "15+ LLM providers",
      "Shared subdomain (*.zeroonec.xyz)",
      "Community support",
    ],
  },
  PRO: {
    label: "Pro",
    price: "$9",
    period: "per month",
    color: "text-primary",
    badge: "bg-primary/10 text-primary border-primary/25",
    icon: Zap,
    maxAgents: 5,
    features: [
      "Up to 5 active agents",
      "All 15+ LLM providers",
      "Custom domain support",
      "Priority CPU & RAM allocation",
      "Email support",
      "Agent analytics & logs",
      "Telegram, Discord & Slack channels",
    ],
  },
  ENTERPRISE: {
    label: "Enterprise",
    price: "Custom",
    period: "",
    color: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    icon: Building2,
    maxAgents: Infinity,
    features: [
      "Unlimited agents",
      "Dedicated VPS cluster",
      "Custom integrations",
      "SSO / SAML",
      "On-prem deployment",
      "24/7 SLA support",
    ],
  },
} as const;

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    api.auth.me(session.token)
      .then((u) => {
        setUser(u);
        setName(u.name ?? "");
        setEmail(u.email);
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const plan = user?.plan ?? "FREE";
  const planInfo = PLAN_INFO[plan];
  const PlanIcon = planInfo.icon;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your account</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile */}
          <div className="rounded-xl border border-white/8 bg-white/4 p-6">
            <h2 className="mb-5 font-semibold">Profile</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/4 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  disabled
                  className="bg-white/4 border-white/10 opacity-60"
                />
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => toast.success("Profile updated")}
              >
                Save changes
              </Button>
            </div>
          </div>

          {/* Plan */}
          <div className={cn(
            "rounded-xl border p-6",
            plan === "PRO"
              ? "border-primary/25 bg-primary/5"
              : plan === "ENTERPRISE"
              ? "border-amber-500/25 bg-amber-500/5"
              : "border-white/8 bg-white/4"
          )}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="font-semibold">Plan</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Your current subscription</p>
              </div>
              <span className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                planInfo.badge
              )}>
                <PlanIcon className="h-3 w-3" />
                {planInfo.label}
                {planInfo.price !== "Custom" && (
                  <span className="opacity-60">
                    · {planInfo.price}{planInfo.period ? `/${planInfo.period}` : ""}
                  </span>
                )}
              </span>
            </div>

            <ul className="mb-5 space-y-2">
              {planInfo.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                  <Check className={cn("h-4 w-4 flex-shrink-0", planInfo.color)} />
                  {f}
                </li>
              ))}
            </ul>

            {plan === "FREE" && (
              <div className="rounded-lg border border-primary/20 bg-primary/8 p-4">
                <p className="text-sm font-medium text-primary">Upgrade to Pro — $9/month</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Get up to 3 agents, priority resources, and email support.
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => toast.info("Billing coming soon")}
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Upgrade to Pro
                </Button>
              </div>
            )}

            {plan === "PRO" && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-amber-400">Need more scale?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Contact us for unlimited agents, dedicated infra, and custom integrations.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => window.open("mailto:hello@zeroonec.xyz")}
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  Contact Enterprise
                </Button>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h2 className="mb-2 font-semibold text-red-400">Danger zone</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete your account and all associated data.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={() => toast.error("Contact support to delete your account")}
            >
              Delete account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
