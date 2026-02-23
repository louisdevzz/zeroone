"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { api, type Agent } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  ArrowLeft, Bot, Copy, ExternalLink,
  Loader2, Pencil, Play, RotateCcw, Send, Square, Zap, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => { fetchAgent(); }, [id]);

  useEffect(() => {
    const TRANSIENT = ["PENDING", "STARTING", "STOPPING"];
    if (!agent || !TRANSIENT.includes(agent.status)) return;
    const timer = setInterval(async () => {
      const session = getSession();
      if (!session) return;
      try { setAgent(await api.agents.get(session.token, id)); } catch { }
    }, 3000);
    return () => clearInterval(timer);
  }, [agent?.status, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchAgent() {
    const session = getSession();
    if (!session) return;
    try {
      setAgent(await api.agents.get(session.token, id));
    } catch {
      toast.error("Agent not found");
      router.push("/dashboard/agents");
    } finally {
      setLoading(false);
    }
  }

  async function control(action: "start" | "stop" | "restart") {
    const session = getSession();
    if (!session) return;
    setActionLoading(true);
    try {
      await api.agents.control(session.token, id, action);
      toast.success(`Agent ${action}ed`);
      setTimeout(fetchAgent, 2000);
    } catch {
      toast.error(`Failed to ${action} agent`);
    } finally {
      setActionLoading(false);
    }
  }

  async function sendMessage() {
    const session = getSession();
    if (!session || !input.trim() || !agent) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);
    try {
      const res = await api.agents.message(session.token, id, text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response ?? res.message ?? JSON.stringify(res) },
      ]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Message failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  }

  async function loadLogs() {
    const session = getSession();
    if (!session) return;
    setLogsLoading(true);
    try {
      const data = await api.agents.logs(session.token, id);
      const lines = Array.isArray(data.logs) ? data.logs : [];
      setLogs(lines);
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      toast.error("Failed to fetch logs");
    } finally {
      setLogsLoading(false);
    }
  }

  async function openDashboard() {
    if (!dashboardUrl) return;
    const session = getSession();
    if (!session) return;
    setTokenLoading(true);
    try {
      const data = await api.agents.dashboardToken(session.token, id);
      window.open(`${dashboardUrl}?token=${encodeURIComponent(data.token)}`, "_blank");
    } catch {
      toast.error("Failed to get dashboard token");
    } finally {
      setTokenLoading(false);
    }
  }

  const isLocalDev = typeof window !== "undefined" && window.location.hostname === "localhost";
  const dashboardUrl = isLocalDev && agent?.containerPort
    ? `http://127.0.0.1:${agent.containerPort}`
    : agent?.subdomain
    ? `https://${agent.subdomain}`
    : agent?.containerPort
    ? `http://127.0.0.1:${agent.containerPort}`
    : null;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Zap className="h-6 w-6 animate-pulse text-primary" />
      </div>
    );
  }

  if (!agent) return null;

  const isRestarting = agent.status === "STARTING" || agent.status === "PENDING";

  return (
    <div className="flex h-full flex-col">
      {/* Restarting banner */}
      {isRestarting && (
        <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/8 px-8 py-2.5">
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
          <p className="text-xs text-amber-300">
            Agent is restarting and applying new config — this takes about 20–40 seconds. Chat will be available once it&apos;s back online.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 bg-background/40 backdrop-blur-sm px-8 py-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/agents">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold leading-tight">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.provider} · {agent.model}</p>
          </div>
          <StatusBadge status={agent.status} />
        </div>

        <div className="flex items-center gap-2">
          {dashboardUrl && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-white/10 bg-white/4 text-muted-foreground hover:text-foreground hover:bg-white/8 text-xs"
              disabled={agent.status !== "RUNNING" || tokenLoading}
              onClick={openDashboard}
            >
              {tokenLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Dashboard
            </Button>
          )}
          <Link href={`/dashboard/agents/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/4 text-muted-foreground hover:text-foreground hover:bg-white/8 text-xs">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/10 bg-white/4 text-muted-foreground hover:text-foreground hover:bg-white/8 text-xs"
            onClick={() => control("stop")}
            disabled={actionLoading || agent.status !== "RUNNING"}
          >
            {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
            Stop
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/10 bg-white/4 text-muted-foreground hover:text-foreground hover:bg-white/8 text-xs"
            onClick={() => control("restart")}
            disabled={actionLoading}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs shadow-lg shadow-primary/20"
            onClick={() => control("start")}
            disabled={actionLoading || agent.status === "RUNNING"}
          >
            <Play className="h-3.5 w-3.5" />
            Start
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden px-8 py-6">
        <Tabs defaultValue="dashboard" className="h-full flex flex-col">
          <TabsList className="mb-5 w-fit border border-white/8 bg-white/4 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/20">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/20">
              Quick Chat
            </TabsTrigger>
            <TabsTrigger value="logs" onClick={loadLogs} className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/20">
              Logs
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/20">
              Info
            </TabsTrigger>
          </TabsList>

          {/* Dashboard tab */}
          <TabsContent value="dashboard" className="flex-1 overflow-y-auto data-[state=active]:block">
            <div className="max-w-lg space-y-4">
              <div className="rounded-xl border border-white/8 bg-white/3 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Agent Dashboard</p>
                    <p className="text-xs text-muted-foreground">Chat, Memory, Config, Tools, Logs</p>
                  </div>
                </div>

                {dashboardUrl ? (
                  <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2.5">
                    <span className="flex-1 truncate font-mono text-xs text-zinc-400">{dashboardUrl}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(dashboardUrl); toast.success("Copied"); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Subdomain not configured yet.</p>
                )}

                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg shadow-primary/20"
                  disabled={!dashboardUrl || agent.status !== "RUNNING" || tokenLoading}
                  onClick={openDashboard}
                >
                  {tokenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Open Dashboard
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Quick Chat tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden data-[state=active]:flex">
            <div className="flex-1 overflow-y-auto rounded-xl border border-white/8 bg-black/20 p-4 space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
                    <Bot className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {agent.status === "RUNNING"
                      ? "Send a message to start chatting"
                      : "Start the agent to begin chatting"}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    Messages are proxied through the backend
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "border border-white/8 bg-white/6 text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-white/8 bg-white/6 px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={agent.status === "RUNNING" ? "Type a message…" : "Agent is not running"}
                disabled={agent.status !== "RUNNING" || chatLoading}
                className="bg-white/4 border-white/10 focus:border-primary/40 transition-colors"
              />
              <Button
                type="submit"
                size="icon"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-lg shadow-primary/20"
                disabled={!input.trim() || agent.status !== "RUNNING" || chatLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </TabsContent>

          {/* Logs tab */}
          <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden data-[state=active]:flex gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Last 200 lines</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadLogs}
                disabled={logsLoading}
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {logsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Refresh
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/8 bg-black/30 p-4 font-mono text-xs">
              {logsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading logs…
                </div>
              ) : logs.length === 0 ? (
                <p className="text-muted-foreground">No logs yet. Start the agent and click Refresh.</p>
              ) : (
                <>
                  {logs.map((line, i) => (
                    <p
                      key={i}
                      className={[
                        "leading-5 whitespace-pre-wrap break-all",
                        /error|failed|panic|fatal/i.test(line) ? "text-red-400"
                          : /warn/i.test(line) ? "text-yellow-400"
                          : /pairing|paired|token|health|ok/i.test(line) ? "text-green-400"
                          : "text-zinc-400",
                      ].join(" ")}
                    >
                      {line}
                    </p>
                  ))}
                  <div ref={logsEndRef} />
                </>
              )}
            </div>
          </TabsContent>

          {/* Info tab */}
          <TabsContent value="info">
            <div className="max-w-lg rounded-xl border border-white/8 bg-white/3 overflow-hidden">
              {[
                { label: "Name", value: agent.name },
                { label: "Agent name", value: agent.agentName ?? "ZeroClaw" },
                { label: "Provider", value: agent.provider },
                { label: "Model", value: agent.model },
                { label: "Status", value: agent.status },
                { label: "Memory", value: agent.memoryBackend ?? "sqlite" },
                { label: "Style", value: agent.communicationStyle ?? "—" },
                { label: "Subdomain", value: agent.subdomain ?? "—" },
                { label: "Created", value: new Date(agent.createdAt).toLocaleString() },
              ].map((row, i) => (
                <div key={row.label} className={`flex justify-between px-5 py-3.5 text-sm ${i !== 0 ? "border-t border-white/6" : ""}`}>
                  <span className="text-muted-foreground text-xs">{row.label}</span>
                  <span className="font-mono text-foreground/80 text-right text-xs max-w-[60%] truncate">{row.value}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
