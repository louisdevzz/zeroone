"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    const msg = typeof json.error === "string"
      ? json.error
      : (json.message ?? `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return (json.data ?? json) as T;
}

// ── Types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";
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
  providerUrl?: string;
  agentName?: string;
  userName?: string;
  timezone?: string;
  communicationStyle?: string;
  memoryBackend?: "sqlite" | "markdown" | "none";
  autoSave?: boolean;
  channels?: ChannelsInput;
}

// ── Payment Types ───────────────────────────────────────────────

export interface PlanConfig {
  plan: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  limits: {
    maxAgents: number;
    maxMemoryMb: number;
    maxCpuQuota: number;
  };
  features: string[];
}

export interface Subscription {
  id: string;
  plan: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "PAST_DUE" | "TRIALING";
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  billingInterval: "month" | "year";
  amountPaid: number;
  currency: string;
}

export interface Payment {
  id: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "EXPIRED" | "PROCESSING" | "REQUIRES_ACTION";
  amount: number;
  currency: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
  paymentMethod?: string;
  provider?: string;
  paidAt?: string;
  createdAt?: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
  paymentId: string;
  expiresAt: string;
}

export interface PortalSession {
  portalUrl: string;
}

// ── Hook ───────────────────────────────────────────────────────

export function useApi() {
  const { getToken } = useAuth();

  const agents = {
    list: useCallback(() =>
      request<Agent[]>("/api/agents", getToken), [getToken]),
    
    checkName: useCallback((name: string) =>
      request<{ available: boolean }>(`/api/agents/check-name?name=${encodeURIComponent(name)}`, getToken), [getToken]),
    
    get: useCallback((id: string) =>
      request<Agent>(`/api/agents/${id}`, getToken), [getToken]),
    
    create: useCallback((body: CreateAgentInput) =>
      request<Agent>("/api/agents", getToken, {
        method: "POST",
        body: JSON.stringify(body),
      }), [getToken]),
    
    control: useCallback((id: string, action: "start" | "stop" | "restart") =>
      request<{ status: string }>(`/api/agents/${id}/${action}`, getToken, {
        method: "POST",
      }), [getToken]),
    
    update: useCallback((id: string, body: UpdateAgentInput) =>
      request<Agent>(`/api/agents/${id}`, getToken, {
        method: "PATCH",
        body: JSON.stringify(body),
      }), [getToken]),
    
    delete: useCallback((id: string) =>
      request<{ deleted: boolean }>(`/api/agents/${id}`, getToken, {
        method: "DELETE",
      }), [getToken]),
    
    message: useCallback((id: string, message: string) =>
      request<{ response?: string; message?: string }>(`/api/agents/${id}/message`, getToken, {
        method: "POST",
        body: JSON.stringify({ message }),
      }), [getToken]),
    
    logs: useCallback((id: string, tail = 100) =>
      request<{ logs: string[] }>(`/api/agents/${id}/logs?tail=${tail}`, getToken), [getToken]),
    
    stats: useCallback((id: string) =>
      request<{ memoryMb: number; cpuPercent: number }>(`/api/agents/${id}/stats`, getToken), [getToken]),
    
    health: useCallback((id: string) =>
      request<{ healthy: boolean }>(`/api/agents/${id}/health`, getToken), [getToken]),
    
    dashboardToken: useCallback((id: string) =>
      request<{ token: string }>(`/api/agents/${id}/dashboard-token`, getToken), [getToken]),
  };

  const payments = {
    getPlans: useCallback(() =>
      request<PlanConfig[]>("/api/payments/plans", getToken), [getToken]),
    
    getSubscription: useCallback(() =>
      request<Subscription | null>("/api/payments/subscription", getToken), [getToken]),
    
    createCheckout: useCallback((plan: "PRO" | "BUSINESS" | "ENTERPRISE", billingInterval: "month" | "year") =>
      request<CheckoutSession>("/api/payments/checkout", getToken, {
        method: "POST",
        body: JSON.stringify({ plan, billingInterval }),
      }), [getToken]),
    
    createCheckoutCrypto: useCallback((plan: "PRO" | "BUSINESS" | "ENTERPRISE", billingInterval: "month" | "year") =>
      request<CheckoutSession>("/api/payments/checkout/crypto", getToken, {
        method: "POST",
        body: JSON.stringify({ plan, billingInterval }),
      }), [getToken]),
    
    cancelSubscription: useCallback((immediate?: boolean) =>
      request<{ message: string }>("/api/payments/subscription/cancel", getToken, {
        method: "POST",
        body: JSON.stringify({ immediate: immediate ?? false }),
      }), [getToken]),
    
    getHistory: useCallback(() =>
      request<Payment[]>("/api/payments/history", getToken), [getToken]),
    
    getPaymentStatus: useCallback((paymentId: string) =>
      request<Payment>(`/api/payments/status/${paymentId}`, getToken), [getToken]),
    
    createPortalSession: useCallback(() =>
      request<PortalSession>("/api/payments/portal", getToken, {
        method: "POST",
      }), [getToken]),
    
    getCheckoutSession: useCallback((sessionId: string) =>
      request<{ paymentId: string; status: string; amount: number; currency: string }>(
        `/api/payments/checkout-session/${sessionId}`,
        getToken
      ), [getToken]),
  };

  return { agents, payments };
}
