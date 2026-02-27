"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Bot, Activity, Cpu, ArrowRight, Zap, CreditCard, Shield, Landmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Dashboard Overview Skeleton - dynamic data skeleton only
export function DashboardSkeleton() {
  return (
    <div className="p-8">
      {/* Header - keep static text */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Overview
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your AI agent fleet
          </p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            New agent
          </Button>
        </Link>
      </div>

      {/* Stats - number value skeleton only */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total agents", icon: Bot, color: "text-primary", bg: "bg-primary/10" },
          { label: "Running", icon: Activity, color: "text-green-400", bg: "bg-green-400/10" },
          { label: "CPU / agent", icon: Cpu, color: "text-sky-400", bg: "bg-sky-400/10" },
        ].map((s, i) => (
          <div
            key={i}
            className="group rounded-xl border border-white/8 bg-white/3 p-5 transition-all hover:border-white/12 hover:bg-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <Skeleton className="h-8 w-16 bg-white/10" />
          </div>
        ))}
      </div>

      {/* Agent list - keep header, skeleton rows only */}
      <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="font-semibold text-sm">Recent Agents</h2>
        </div>
        <div className="divide-y divide-white/6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Skeleton className="h-4 w-32 bg-white/10" />
                  <Skeleton className="mt-1 h-3 w-24 bg-white/10" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Agents List Skeleton - table data skeleton only, excluding header
export function AgentsListSkeleton() {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
        <div className="border-b border-white/8 bg-white/2 px-5 py-3">
          <div className="flex gap-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[40%]">Agent</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Provider</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Status</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Created</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[10%] text-right">Actions</span>
          </div>
        </div>
        <div className="divide-y divide-white/6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 w-[40%]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-32 bg-white/10" />
                    <Skeleton className="mt-1 h-3 w-20 bg-white/10" />
                  </div>
                </div>
                <div className="w-[15%]">
                  <Skeleton className="h-5 w-16 bg-white/10" />
                </div>
                <div className="w-[15%]">
                  <Skeleton className="h-6 w-20 bg-white/10" />
                </div>
                <div className="w-[20%]">
                  <Skeleton className="h-4 w-24 bg-white/10" />
                </div>
                <div className="w-[10%] flex justify-end">
                  <Skeleton className="h-7 w-7 bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
  );
}

// Agent Detail Skeleton - dynamic data skeleton only
export function AgentDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header - keep structure, dynamic text skeleton only */}
      <div className="flex items-center justify-between border-b border-white/8 bg-background/40 px-8 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/agents">
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <Skeleton className="h-5 w-32 bg-white/10" />
            <Skeleton className="mt-1 h-3 w-48 bg-white/10" />
          </div>
          <Skeleton className="h-6 w-16 bg-white/10" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 bg-white/10" />
          <Skeleton className="h-8 w-16 bg-white/10" />
          <Skeleton className="h-8 w-16 bg-white/10" />
          <Skeleton className="h-8 w-16 bg-white/10" />
          <Skeleton className="h-8 w-16 bg-white/10" />
        </div>
      </div>

      {/* Tabs - keep static tab names */}
      <div className="flex-1 overflow-hidden px-8 py-6">
        <div className="mb-5 flex gap-1 border border-white/8 bg-white/4 p-1 w-fit rounded-lg">
          <div className="px-4 py-2 rounded-md text-xs bg-primary/15 text-primary border border-primary/20">Dashboard</div>
          <div className="px-4 py-2 rounded-md text-xs text-muted-foreground">Quick Chat</div>
          <div className="px-4 py-2 rounded-md text-xs text-muted-foreground">Logs</div>
          <div className="px-4 py-2 rounded-md text-xs text-muted-foreground">Info</div>
        </div>

        <div className="max-w-lg space-y-4">
          <div className="rounded-xl border border-white/8 bg-white/3 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ArrowRight className="h-4 w-4 -rotate-45" />
              </div>
              <div>
                <p className="font-semibold text-sm">Agent Dashboard</p>
                <p className="text-xs text-muted-foreground">Chat, Memory, Config, Tools, Logs</p>
              </div>
            </div>
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Skeleton - dynamic data skeleton only
export function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your account</p>
      </div>

      <div className="space-y-6">
        {/* Profile - keep static labels */}
        <div className="rounded-xl border border-white/8 bg-white/4 p-6">
          <h2 className="mb-5 font-semibold">Profile</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
            <Skeleton className="h-10 w-32 bg-white/10" />
          </div>
        </div>

        {/* Plan - keep static labels */}
        <div className="rounded-xl border border-white/8 bg-white/4 p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="font-semibold">Plan</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Your current subscription</p>
            </div>
            <Skeleton className="h-7 w-24 bg-white/10" />
          </div>

          <div className="mb-5 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/10">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                </div>
                <Skeleton className="h-4 w-48 bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone - keep static labels */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="mb-2 font-semibold text-red-400">Danger zone</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
          <Skeleton className="h-8 w-32 bg-white/10" />
        </div>
      </div>
    </div>
  );
}

// Billing Skeleton - matches actual billing page layout
export function BillingSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header - keep static text */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Billing & Subscription
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan and payment history
        </p>
      </div>

      {/* Billing Interval & Payment Provider Toggle */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
        {/* Billing Interval */}
        <div className="inline-flex items-center p-1 rounded-xl border border-white/8 bg-white/3">
          <div className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground">Monthly</div>
          <div className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground flex items-center gap-2">
            Yearly
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">Save 17.5%</span>
          </div>
        </div>

        {/* Payment Provider */}
        <div className="inline-flex items-center p-1 rounded-xl border border-white/8 bg-white/3">
          <div className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Card / Bank
          </div>
          <div className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Crypto
          </div>
        </div>
      </div>

      {/* Plans - 4 columns grid matching actual layout */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-12 items-stretch">
        {[
          { name: "Free", icon: Zap, iconColor: "text-yellow-400" },
          { name: "Pro", icon: Zap, iconColor: "text-blue-400" },
          { name: "Business", icon: Activity, iconColor: "text-indigo-400" },
          { name: "Enterprise", icon: Cpu, iconColor: "text-purple-400" },
        ].map((plan, i) => (
          <div key={i} className="rounded-2xl border border-white/8 bg-white/3 p-5 flex flex-col h-full">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <plan.icon className={`h-4 w-4 ${plan.iconColor}`} />
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>
              <Skeleton className="h-3 w-32 bg-white/10" />
            </div>

            <div className="mb-4">
              <Skeleton className="h-8 w-20 bg-white/10" />
              <p className="text-xs text-muted-foreground mt-1">/month</p>
            </div>

            <div className="space-y-2 mb-4 flex-1">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/10">
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                  </div>
                  <Skeleton className="h-3 w-28 bg-white/10" />
                </div>
              ))}
            </div>

            <Skeleton className="h-9 w-full bg-white/10 mt-auto" />
          </div>
        ))}
      </div>

      {/* Payment Methods Info */}
      <div className="mt-8 rounded-xl border border-white/8 bg-white/3 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Shield className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-5 w-48 bg-white/10 mb-1" />
            <Skeleton className="h-4 w-full max-w-md bg-white/10" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <CreditCard className="h-4 w-4" />
            </div>
            <Skeleton className="h-4 w-20 bg-white/10" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <Landmark className="h-4 w-4" />
            </div>
            <Skeleton className="h-4 w-24 bg-white/10" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <Skeleton className="h-4 w-24 bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Payment Success Skeleton - keep static text
export function PaymentSuccessSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="rounded-2xl border border-white/8 bg-white/3 p-12 text-center max-w-md w-full">
        <Skeleton className="mx-auto h-16 w-16 rounded-full bg-white/10" />
        <h1 className="mx-auto mt-6 text-xl font-semibold">Processing Payment...</h1>
        <p className="mx-auto mt-3 text-sm text-muted-foreground">
          Please wait while we confirm your payment
        </p>
      </div>
    </div>
  );
}
