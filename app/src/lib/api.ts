const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    // Backend wraps errors in { success: false, error: "..." }
    const msg = typeof json.error === "string"
      ? json.error
      : (json.message ?? `Request failed (${res.status})`);
    throw new Error(msg);
  }

  // Backend wraps success in { success: true, data: ... } — unwrap it
  return (json.data ?? json) as T;
}

export const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      request<{ user: User; token: string }>("/api/auth/register", null, {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ user: User; token: string }>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    google: (idToken: string) =>
      request<{ user: User; token: string }>("/api/auth/google", null, {
        method: "POST",
        body: JSON.stringify({ idToken }),
      }),
    me: (token: string) => request<User>("/api/auth/me", token),
  },

  agents: {
    list: (token: string) => request<Agent[]>("/api/agents", token),
    checkName: (token: string, name: string) =>
      request<{ available: boolean }>(`/api/agents/check-name?name=${encodeURIComponent(name)}`, token),
    get: (token: string, id: string) => request<Agent>(`/api/agents/${id}`, token),
    create: (token: string, body: CreateAgentInput) =>
      request<Agent>("/api/agents", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    control: (token: string, id: string, action: "start" | "stop" | "restart") =>
      request<{ status: string }>(`/api/agents/${id}/${action}`, token, {
        method: "POST",
      }),
    update: (token: string, id: string, body: UpdateAgentInput) =>
      request<Agent>(`/api/agents/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (token: string, id: string) =>
      request<{ deleted: boolean }>(`/api/agents/${id}`, token, {
        method: "DELETE",
      }),
    message: (token: string, id: string, message: string) =>
      request<{ response?: string; message?: string }>(`/api/agents/${id}/message`, token, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    logs: (token: string, id: string, tail = 100) =>
      request<{ logs: string[] }>(`/api/agents/${id}/logs?tail=${tail}`, token),
    stats: (token: string, id: string) =>
      request<{ memoryMb: number; cpuPercent: number }>(`/api/agents/${id}/stats`, token),
    health: (token: string, id: string) =>
      request<{ healthy: boolean }>(`/api/agents/${id}/health`, token),
    dashboardToken: (token: string, id: string) =>
      request<{ token: string }>(`/api/agents/${id}/dashboard-token`, token),
  },
};

// ── Types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: "FREE" | "PRO" | "ENTERPRISE";
}

export type AgentStatus =
  | "PENDING"
  | "STARTING"
  | "RUNNING"
  | "STOPPING"
  | "STOPPED"
  | "ERROR";

export interface Agent {
  id: string;
  name: string;
  slug: string;
  status: AgentStatus;
  provider: string;
  model: string;
  temperature: number;
  systemPrompt: string | null;
  containerPort: number | null;
  subdomain: string | null;
  agentName: string | null;
  userName: string | null;
  timezone: string | null;
  communicationStyle: string | null;
  memoryBackend: string | null;
  autoSave: string | null;
  memoryMb: number | null;
  cpuPercent: number | null;
  lastHealthAt: string | null;
  createdAt: string;
  updatedAt: string;
  channels: ChannelsInput | null;
}

export interface ChannelsTelegramInput {
  botToken: string;
  allowedUsers?: string[];
}
export interface ChannelsDiscordInput {
  botToken: string;
  guildId?: string;
  allowedUsers?: string[];
}
export interface ChannelsSlackInput {
  botToken: string;
  appToken?: string;
  channelId?: string;
}
export interface ChannelsInput {
  telegram?: ChannelsTelegramInput;
  discord?: ChannelsDiscordInput;
  slack?: ChannelsSlackInput;
}

export interface UpdateAgentInput {
  name?: string;
  agentName?: string;
  userName?: string;
  timezone?: string;
  communicationStyle?: string;
  memoryBackend?: "sqlite" | "markdown" | "none";
  autoSave?: boolean;
  channels?: ChannelsInput;
}

export interface CreateAgentInput {
  name: string;
  provider: string;
  model: string;
  apiKey?: string;
  // ZeroClaw identity (written to IDENTITY.md / USER.md)
  agentName?: string;
  userName?: string;
  timezone?: string;
  communicationStyle?: string;
  // ZeroClaw memory config
  memoryBackend?: "sqlite" | "markdown" | "none";
  autoSave?: boolean;
  // ZeroClaw channels
  channels?: ChannelsInput;
}
