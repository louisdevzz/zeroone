"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { api, type Agent } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Plus, Bot, Zap, MoreHorizontal, Play, Square, RotateCcw, Trash2, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  // Poll while any agent is in a transient state
  useEffect(() => {
    const TRANSIENT = ["PENDING", "STARTING", "STOPPING"];
    const hasTransient = agents.some((a) => TRANSIENT.includes(a.status));
    if (!hasTransient) return;

    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [agents]);

  async function refresh() {
    const session = getSession();
    if (!session) return;
    try {
      const data = await api.agents.list(session.token);
      setAgents(data);
    } catch {
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  }

  async function control(id: string, action: "start" | "stop" | "restart") {
    const session = getSession();
    if (!session) return;
    setActionId(id);
    try {
      await api.agents.control(session.token, id, action);
      toast.success(`Agent ${action}ed`);
      setTimeout(refresh, 1500);
    } catch {
      toast.error(`Failed to ${action} agent`);
    } finally {
      setActionId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const session = getSession();
    if (!session) return;
    setDeleting(true);
    try {
      await api.agents.delete(session.token, deleteTarget.id);
      setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success("Agent deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Agents
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} deployed
          </p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            New agent
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Zap className="h-6 w-6 animate-pulse text-primary" />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/8 bg-white/3 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
            <Bot className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="font-medium">No agents deployed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Launch your first AI agent in one click
          </p>
          <Link href="/dashboard/agents/new" className="mt-5">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" />
              New agent
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {agents.map((agent) => (
                <tr key={agent.id} className="group transition-colors hover:bg-white/3">
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/agents/${agent.id}`} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.slug}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-all ml-1" />
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-xs text-muted-foreground font-mono">
                      {agent.provider}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={actionId === agent.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 border-white/10 bg-zinc-900/95 backdrop-blur-sm">
                        <DropdownMenuItem onClick={() => control(agent.id, "start")} className="gap-2 text-xs">
                          <Play className="h-3.5 w-3.5" />
                          Start
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => control(agent.id, "stop")} className="gap-2 text-xs">
                          <Square className="h-3.5 w-3.5" />
                          Stop
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => control(agent.id, "restart")} className="gap-2 text-xs">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restart
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/8" />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(agent)}
                          className="gap-2 text-xs text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <DialogContent className="border-white/10 bg-zinc-900 sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <DialogTitle>Delete agent</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              This will stop and remove the container and all associated data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-white/4 hover:bg-white/8"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
