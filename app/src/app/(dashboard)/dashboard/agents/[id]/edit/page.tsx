"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api, type Agent, type ChannelsInput } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelsForm } from "@/components/dashboard/channels-form";

const COMM_STYLES = [
  {
    id: "direct",
    label: "Direct & concise",
    value: "Be direct and concise. Skip pleasantries. Get to the point.",
  },
  {
    id: "friendly",
    label: "Friendly & casual",
    value: "Be friendly, human, and conversational. Show warmth and empathy while staying efficient. Use natural contractions.",
  },
  {
    id: "professional",
    label: "Professional",
    value: "Be professional and polished. Stay calm, structured, and respectful.",
  },
  {
    id: "technical",
    label: "Technical & detailed",
    value: "Be technical and detailed. Thorough explanations, code-first.",
  },
  {
    id: "balanced",
    label: "Balanced",
    value: "Adapt to the situation. Default to warm and clear communication; be concise when needed, thorough when it matters.",
  },
];

const MEMORY_BACKENDS = [
  { id: "sqlite", label: "SQLite", description: "Fast local database. Recommended." },
  { id: "markdown", label: "Markdown", description: "Human-readable files in workspace." },
  { id: "none", label: "None", description: "No persistent memory." },
];

export default function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [userName, setUserName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [commStyle, setCommStyle] = useState(COMM_STYLES[4]);
  const [memoryBackend, setMemoryBackend] = useState(MEMORY_BACKENDS[0]);
  const [autoSave, setAutoSave] = useState(true);
  const [channels, setChannels] = useState<ChannelsInput>({});

  useEffect(() => {
    async function load() {
      const session = getSession();
      if (!session) return;
      try {
        const data = await api.agents.get(session.token, id);
        setAgent(data);
        setName(data.name);
        setAgentName(data.agentName ?? "ZeroClaw");
        setUserName(data.userName ?? "");
        setTimezone(data.timezone ?? "UTC");
        const matchedStyle = COMM_STYLES.find((s) => s.value === data.communicationStyle);
        setCommStyle(matchedStyle ?? COMM_STYLES[4]);
        const matchedBackend = MEMORY_BACKENDS.find((b) => b.id === data.memoryBackend);
        setMemoryBackend(matchedBackend ?? MEMORY_BACKENDS[0]);
        setAutoSave(data.autoSave === "true" || data.autoSave === null);
        if (data.channels) setChannels(data.channels);
      } catch {
        toast.error("Agent not found");
        router.push("/dashboard/agents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave() {
    const session = getSession();
    if (!session) return;
    setSaving(true);
    const hasChannels = Object.keys(channels).length > 0;
    try {
      await api.agents.update(session.token, id, {
        name,
        agentName,
        userName: userName || undefined,
        timezone,
        communicationStyle: commStyle.value,
        memoryBackend: memoryBackend.id as "sqlite" | "markdown" | "none",
        autoSave,
        channels: hasChannels ? channels : undefined,
      });
      if (hasChannels && agent?.status === "RUNNING") {
        toast.success("Saved — agent is restarting with new config. Please wait ~30s before chatting.", {
          duration: 8000,
        });
      } else {
        toast.success("Agent updated");
      }
      router.push(`/dashboard/agents/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="mx-auto max-w-2xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link href={`/dashboard/agents/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground p-1.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit agent</h1>
          <p className="text-sm text-muted-foreground">{agent.name}</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* General */}
        <section className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">General</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Agent display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/4 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentname">Agent persona name</Label>
            <Input
              id="agentname"
              placeholder="ZeroClaw"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="bg-white/4 border-white/10"
            />
            <p className="text-xs text-muted-foreground">How the agent refers to itself.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">
              Your name <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="username"
              placeholder="e.g. Alex"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="bg-white/4 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="UTC">UTC</option>
              <option value="US/Eastern">US/Eastern (EST/EDT)</option>
              <option value="US/Central">US/Central (CST/CDT)</option>
              <option value="US/Pacific">US/Pacific (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (ICT)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
            </select>
          </div>
        </section>

        {/* Communication style */}
        <section className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Communication style</h2>
          <div className="space-y-2">
            {COMM_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setCommStyle(s)}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left transition-all",
                  commStyle.id === s.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-white/4 hover:bg-white/8"
                )}
              >
                <p className={cn("text-sm font-medium", commStyle.id === s.id ? "text-primary" : "text-foreground")}>
                  {s.label}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Memory */}
        <section className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Memory</h2>
          <div className="space-y-2">
            {MEMORY_BACKENDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setMemoryBackend(b)}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left transition-all",
                  memoryBackend.id === b.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-white/4 hover:bg-white/8"
                )}
              >
                <p className={cn("text-sm font-medium", memoryBackend.id === b.id ? "text-primary" : "text-foreground")}>
                  {b.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
              </button>
            ))}
          </div>

          {memoryBackend.id !== "none" && (
            <label className="flex cursor-pointer items-center gap-3 pt-1">
              <div
                onClick={() => setAutoSave(!autoSave)}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  autoSave ? "bg-primary" : "bg-white/20"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  autoSave ? "translate-x-[18px]" : "translate-x-0"
                )} />
              </div>
              <div>
                <p className="text-sm font-medium">Auto-save conversations</p>
                <p className="text-xs text-muted-foreground">Automatically persist sessions to memory</p>
              </div>
            </label>
          )}
        </section>

        {/* Channels */}
        <section className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Channels</h2>
          <ChannelsForm value={channels} onChange={setChannels} />
        </section>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href={`/dashboard/agents/${id}`}>
            <Button variant="outline" className="border-white/10">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
