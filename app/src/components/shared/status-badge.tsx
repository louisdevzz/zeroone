import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/lib/api";

const STATUS_CONFIG: Record<AgentStatus, { label: string; dot: string; text: string }> = {
  PENDING:  { label: "Pending",  dot: "bg-zinc-400",           text: "text-zinc-400" },
  STARTING: { label: "Starting", dot: "bg-yellow-400 animate-pulse", text: "text-yellow-400" },
  RUNNING:  { label: "Running",  dot: "bg-green-400 animate-pulse",  text: "text-green-400" },
  STOPPING: { label: "Stopping", dot: "bg-orange-400 animate-pulse", text: "text-orange-400" },
  STOPPED:  { label: "Stopped",  dot: "bg-zinc-500",           text: "text-zinc-500" },
  ERROR:    { label: "Error",    dot: "bg-red-500",             text: "text-red-400" },
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", cfg.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
