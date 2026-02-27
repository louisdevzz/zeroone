"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApi, type Agent } from "@/lib/api-client";
import { Plus, Bot, Activity, Cpu, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/dashboard/skeletons";

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    api.agents.list()
      .then(setAgents)
      .catch(() => toast.error("Failed to load agents"))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const running = agents.filter((a) => a.status === "RUNNING").length;
  const total = agents.length;

  const stats = [
    { label: "Total agents", value: total, icon: Bot, color: "text-primary", bg: "bg-primary/10" },
    { label: "Running", value: running, icon: Activity, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Avg CPU", value: "<5%", icon: Cpu, color: "text-sky-400", bg: "bg-sky-400/10" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
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

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group rounded-xl border border-white/8 bg-white/3 p-5 transition-all hover:border-white/12 hover:bg-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Agent list */}
      <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="font-semibold text-sm">Recent Agents</h2>
          {total > 0 && (
            <Link
              href="/dashboard/agents"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
              <Bot className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-foreground">No agents yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Deploy your first AI agent in one click
            </p>
            <Link href="/dashboard/agents/new" className="mt-5">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20">
                <Plus className="h-3.5 w-3.5" />
                New agent
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/6">
            {agents.slice(0, 10).map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/dashboard/agents/${agent.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.provider} · {agent.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={agent.status} />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
