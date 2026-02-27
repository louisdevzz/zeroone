"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useApi, type ChannelsInput } from "@/lib/api-client";
import { ArrowLeft, Loader2, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelsForm } from "@/components/dashboard/channels-form";

// ── Provider catalogue ──────────────────────────────────────────

const PROVIDERS = [
  {
    id: "ark",
    name: "ModelArk",
    description: "DeepSeek V3 - No API key required",
    models: ["deepseek-v3-2-251201"],
    requiresKey: false,
    requiresUrl: true,
    defaultUrl: "https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "200+ models, 1 API key",
    models: [
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-opus-4-6",
      "openai/gpt-4o",
      "openai/gpt-4.1",
      "openai/o3",
      "google/gemini-2.5-pro",
      "google/gemini-2.0-flash",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-r1",
      "x-ai/grok-3",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-72b-instruct",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4.1, o3",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o1", "o1-mini", "o3", "o3-mini", "gpt-4-turbo"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5/4 Sonnet & Opus",
    models: [
      "claude-sonnet-4-6",
      "claude-opus-4-6",
      "claude-haiku-4-5-20251001",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "gemini",
    name: "Google",
    description: "Gemini 2.5 Pro/Flash",
    models: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek V3 & R1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "xai",
    name: "xAI",
    description: "Grok 3 & 4",
    models: ["grok-3", "grok-3-fast", "grok-3-mini", "grok-3-mini-fast", "grok-2-1212"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "mistral",
    name: "Mistral",
    description: "Mistral Large & Codestral",
    models: [
      "mistral-large-latest",
      "mistral-small-latest",
      "codestral-latest",
      "magistral-small-2506",
      "magistral-medium-2506",
      "mistral-nemo-latest",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast LPU inference",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
      "qwen-qwq-32b",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Search-augmented AI",
    models: ["sonar-pro", "sonar", "sonar-reasoning-pro", "sonar-reasoning", "sonar-deep-research"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "venice",
    name: "Venice",
    description: "Privacy-first inference",
    models: ["llama-3.3-70b", "mistral-31-24b", "qwen-2.5-vl-72b"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "vercel",
    name: "Vercel AI",
    description: "Vercel AI Gateway",
    models: ["gpt-4o", "claude-sonnet-4-6", "gemini-2.0-flash"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "cloudflare",
    name: "Cloudflare AI",
    description: "Cloudflare AI Gateway",
    models: [
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-3.1-8b-instruct-fast",
      "@cf/google/gemma-7b-it",
      "@hf/mistral/mistral-7b-instruct-v0.2",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "moonshot",
    name: "Moonshot",
    description: "Kimi & Kimi Coding",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k", "kimi-latest", "kimi-thinking-preview"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "glm",
    name: "GLM",
    description: "ChatGLM / Zhipu models",
    models: ["glm-4-plus", "glm-4-0520", "glm-4-air", "glm-4-flash", "glm-z1-preview"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "qwen",
    name: "Qwen",
    description: "Alibaba DashScope",
    models: [
      "qwen-max",
      "qwen-plus",
      "qwen-turbo",
      "qwen2.5-72b-instruct",
      "qwen2.5-32b-instruct",
      "qwq-32b",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "bedrock",
    name: "Amazon Bedrock",
    description: "AWS managed model access",
    models: [
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "anthropic.claude-3-haiku-20240307-v1:0",
      "meta.llama3-70b-instruct-v1:0",
      "amazon.titan-text-premier-v1:0",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "together",
    name: "Together AI",
    description: "Open-source model hosting",
    models: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "meta-llama/Llama-3.1-8B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
      "deepseek-ai/DeepSeek-R1",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    description: "Fast open-source inference",
    models: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/mixtral-8x7b-instruct",
      "accounts/fireworks/models/qwen2p5-72b-instruct",
      "accounts/fireworks/models/deepseek-r1",
    ],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "cohere",
    name: "Cohere",
    description: "Command R+ & embeddings",
    models: ["command-r-plus-08-2024", "command-r-08-2024", "command-a-03-2025", "command-light"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "zai",
    name: "Z.AI",
    description: "Z.AI inference",
    models: ["glm-4-plus", "glm-4-air", "glm-4-flash"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "minimax",
    name: "MiniMax",
    description: "MiniMax AI models",
    models: ["abab6.5s-chat", "abab6.5g-chat", "abab5.5s-chat", "abab6.5-chat"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "qianfan",
    name: "Qianfan",
    description: "Baidu AI models",
    models: ["ernie-4.0-turbo-8k", "ernie-4.0-8k", "ernie-3.5-8k", "ernie-lite-8k"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "synthetic",
    name: "Synthetic",
    description: "Synthetic AI models",
    models: ["synthetic-1"],
    requiresKey: true,
    requiresUrl: false,
  },
  {
    id: "compatible",
    name: "Custom Model",
    description: "Any OpenAI-compatible endpoint",
    models: [],
    requiresKey: false,  // API key is optional for custom endpoints
    requiresUrl: true,   // Base URL is required
  },
];

// ── Communication styles (from ZeroClaw wizard) ─────────────────

const COMM_STYLES = [
  {
    id: "direct",
    label: "Direct & concise",
    description: "Skip pleasantries, get to the point",
    value: "Be direct and concise. Skip pleasantries. Get to the point.",
  },
  {
    id: "friendly",
    label: "Friendly & casual",
    description: "Warm, human, and helpful",
    value: "Be friendly, human, and conversational. Show warmth and empathy while staying efficient. Use natural contractions.",
  },
  {
    id: "professional",
    label: "Professional",
    description: "Calm, confident, and clear",
    value: "Be professional and polished. Stay calm, structured, and respectful.",
  },
  {
    id: "technical",
    label: "Technical & detailed",
    description: "Thorough explanations, code-first",
    value: "Be technical and detailed. Thorough explanations, code-first.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Adapt to the situation",
    value: "Adapt to the situation. Default to warm and clear communication; be concise when needed, thorough when it matters.",
  },
];

// ── Memory backends (from ZeroClaw) ────────────────────────────

const MEMORY_BACKENDS = [
  { id: "sqlite", label: "SQLite", description: "Fast local database. Recommended." },
  { id: "markdown", label: "Markdown", description: "Human-readable files in workspace." },
  { id: "none", label: "None", description: "No persistent memory." },
];

// ── Component ───────────────────────────────────────────────────

const STEPS = ["Provider", "Identity", "Memory", "Channels", "Review"];

export default function NewAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApi();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Keep a stable ref to api so effects don't re-run when api object identity changes
  const apiRef = useRef(api);
  apiRef.current = api;

  // Step 0 — Provider
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [model, setModel] = useState(PROVIDERS[0].models[0]);
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [customModel, setCustomModel] = useState("");

  // Step 1 — Identity
  const [agentName, setAgentName] = useState("ZeroClaw");
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameChecking, setNameChecking] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userName, setUserName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [commStyle, setCommStyle] = useState(COMM_STYLES[1]);

  // Step 2 — Memory
  const [memoryBackend, setMemoryBackend] = useState(MEMORY_BACKENDS[0]);
  const [autoSave, setAutoSave] = useState(true);

  // Step 3 — Channels
  const [channels, setChannels] = useState<ChannelsInput>({});

  // Handle provider query parameter from URL (e.g., ?provider=ark)
  useEffect(() => {
    const providerParam = searchParams.get("provider");
    if (providerParam) {
      const foundProvider = PROVIDERS.find((p) => p.id === providerParam);
      if (foundProvider) {
        setProvider(foundProvider);
        setModel(foundProvider.models[0] ?? "__custom__");
        if (foundProvider.defaultUrl) {
          setApiUrl(foundProvider.defaultUrl);
        }
      }
    }
  }, [searchParams]);

  // Debounced name check — only fires after the user has touched the input
  useEffect(() => {
    if (!nameTouched) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!agentName.trim()) {
      setNameError(null);
      setNameChecking(false);
      return;
    }

    setNameChecking(true);
    setNameError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await apiRef.current.agents.checkName(agentName.trim());
        setNameError(available ? null : `An agent named "${agentName.trim()}" already exists.`);
      } catch {
        setNameError(null); // fail open — backend will catch on deploy
      } finally {
        setNameChecking(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentName, nameTouched]);

  // Derived
  const isCustomProvider = provider.requiresUrl;
  const finalModel = (model === "__custom__" || isCustomProvider) ? customModel.trim() : model;
  const needsApiKey = provider.requiresKey;
  const needsApiUrl = provider.requiresUrl;

  function handleProviderChange(id: string) {
    const p = PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
    setProvider(p);
    setModel(p.models[0] ?? "__custom__");
    setCustomModel("");
    // Auto-fill URL for providers with default URL
    if (p.defaultUrl) {
      setApiUrl(p.defaultUrl);
    }
  }

  // Step guards
  function canGoNext() {
    if (step === 0) {
      if (needsApiKey && !apiKey.trim()) return false;
      if (needsApiUrl && !apiUrl.trim()) return false;
      if (!finalModel) return false;
      return true;
    }
    if (step === 1) return agentName.trim().length > 0 && !nameError && !nameChecking;
    return true;
  }

  async function handleDeploy() {
    setLoading(true);
    try {
      const agent = await api.agents.create({
        name: agentName,
        provider: provider.id,
        model: finalModel,
        apiKey: needsApiKey ? apiKey : (apiKey.trim() || undefined),
        providerUrl: needsApiUrl ? apiUrl.trim() : undefined,
        agentName,
        userName: userName || undefined,
        timezone,
        communicationStyle: commStyle.value,
        memoryBackend: memoryBackend.id as "sqlite" | "markdown" | "none",
        autoSave,
        channels: Object.keys(channels).length > 0 ? channels : undefined,
      });
      toast.success("Agent deploying…");
      router.push(`/dashboard/agents/${agent.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link href="/dashboard/agents">
          <Button variant="outline" size="sm" className="gap-2 border-white/10 bg-white/4 text-muted-foreground hover:text-foreground hover:bg-white/8 px-3 py-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New agent</h1>
          <p className="text-sm text-muted-foreground">Deploy a ZeroClaw AI agent</p>
        </div>
      </div>

      {/* Steps */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all",
              i === step ? "bg-primary text-primary-foreground"
                : i < step ? "bg-primary/30 text-primary"
                : "bg-white/8 text-muted-foreground"
            )}>
              {i + 1}
            </div>
            <span className={cn(
              "text-sm hidden sm:inline",
              i === step ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-6 sm:w-10", i < step ? "bg-primary/40" : "bg-white/10")} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/4 p-8">

        {/* ── Step 0: Provider ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">LLM Provider</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleProviderChange(p.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-all",
                      provider.id === p.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/10 bg-white/4 hover:bg-white/8"
                    )}
                  >
                    <p className={cn("text-sm font-medium", provider.id === p.id ? "text-primary" : "text-foreground")}>
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom provider URL */}
            {needsApiUrl && (
              <div className="space-y-2">
                <Label htmlFor="apiurl">Provider URL <span className="text-red-400">*</span></Label>
                <Input
                  id="apiurl"
                  type="url"
                  placeholder="http://localhost:11434"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="bg-white/4 border-white/10 font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Base URL of your OpenAI-compatible endpoint (e.g. Ollama, LM Studio, LocalAI, vLLM).
                </p>
              </div>
            )}

            {/* Model selector */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              {isCustomProvider ? (
                <Input
                  id="model"
                  placeholder="e.g. llama3.2, mistral, qwen2.5:7b"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="bg-white/4 border-white/10 font-mono"
                />
              ) : (
                <>
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {provider.models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="__custom__">Custom model name…</option>
                  </select>
                  {model === "__custom__" && (
                    <Input
                      placeholder="e.g. my-fine-tuned-model"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="bg-white/4 border-white/10 font-mono"
                      autoFocus
                    />
                  )}
                </>
              )}
            </div>

            {/* API Key */}
            {needsApiKey && (
              <div className="space-y-2">
                <Label htmlFor="apikey">API Key</Label>
                <Input
                  id="apikey"
                  type="password"
                  placeholder={provider.id === "openrouter" ? "sk-or-..." : "sk-..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-white/4 border-white/10 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Encrypted with AES-256-GCM at rest. Never logged or exposed.
                </p>
              </div>
            )}

            {/* Custom provider: optional API key */}
            {isCustomProvider && (
              <div className="space-y-2">
                <Label htmlFor="apikey">API Key <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="apikey"
                  type="password"
                  placeholder="sk-... (leave blank if not required)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-white/4 border-white/10 font-mono"
                />
              </div>
            )}

            <Button
              onClick={() => setStep(1)}
              disabled={!canGoNext()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Next →
            </Button>
          </div>
        )}

        {/* ── Step 1: Identity ── */}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground -mt-2">
              ZeroClaw uses workspace identity files instead of a system prompt. These settings are written to{" "}
              <code className="rounded bg-white/8 px-1 py-0.5 text-xs">IDENTITY.md</code> and{" "}
              <code className="rounded bg-white/8 px-1 py-0.5 text-xs">USER.md</code> inside the agent.
            </p>

            <div className="space-y-2">
              <Label htmlFor="agentname">Agent name</Label>
              <div className="relative">
                <Input
                  id="agentname"
                  placeholder="ZeroClaw"
                  value={agentName}
                  onChange={(e) => { setNameTouched(true); setAgentName(e.target.value); }}
                  className={cn(
                    "bg-white/4 border-white/10",
                    nameError && "border-red-500/60 focus-visible:ring-red-500/40"
                  )}
                />
                {nameChecking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              {nameError ? (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {nameError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The name the agent uses for itself in responses.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Your name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="username"
                placeholder="e.g. Alex"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-white/4 border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                How the agent addresses you.
              </p>
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

            <div className="space-y-2">
              <Label>Communication style</Label>
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
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="border-white/10">
                ← Back
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canGoNext()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Memory ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Memory backend</Label>
              <p className="text-xs text-muted-foreground">
                How ZeroClaw stores and searches memories between sessions.
              </p>
              <div className="space-y-2 mt-3">
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
            </div>

            {memoryBackend.id !== "none" && (
              <label className="flex cursor-pointer items-center gap-3">
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="border-white/10">
                ← Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Channels ── */}
        {step === 3 && (
          <div className="space-y-6">
            <ChannelsForm value={channels} onChange={setChannels} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="border-white/10">
                ← Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/8 bg-white/4 divide-y divide-white/8 text-sm">
              {[
                { label: "Provider", value: `${provider.name} / ${finalModel}` },
                ...(needsApiUrl ? [{ label: "Provider URL", value: apiUrl || "—" }] : []),
                { label: "API Key", value: needsApiKey ? (apiKey ? "••••••••" : "Not set") : (apiKey ? "••••••••" : "Not required") },
                { label: "Agent name", value: agentName },
                { label: "User name", value: userName || "—" },
                { label: "Timezone", value: timezone },
                { label: "Style", value: commStyle.label },
                { label: "Memory", value: `${memoryBackend.label}${memoryBackend.id !== "none" ? ` · auto-save ${autoSave ? "on" : "off"}` : ""}` },
                { label: "Channels", value: [channels.telegram && "Telegram", channels.discord && "Discord", channels.slack && "Slack"].filter(Boolean).join(", ") || "Webhook only" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-right max-w-[60%] truncate">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                What happens next
              </p>
              <ul className="space-y-1 list-disc pl-4 text-muted-foreground">
                <li>Docker container starts with ZeroClaw runtime</li>
                <li>Identity files written: <code className="text-xs bg-white/8 rounded px-1">IDENTITY.md</code>, <code className="text-xs bg-white/8 rounded px-1">USER.md</code>, <code className="text-xs bg-white/8 rounded px-1">SOUL.md</code></li>
                <li>Orchestrator reads pairing code, pairs automatically</li>
                <li>Agent online in ~10 seconds</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="border-white/10">
                ← Back
              </Button>
              <Button
                onClick={handleDeploy}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Deploy agent
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
