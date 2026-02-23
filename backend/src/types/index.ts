import type { Plan, AgentStatus } from "../db/schema";

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AgentConfigInput {
  name: string;
  provider?: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  apiKey: string;
  memoryBackend?: "sqlite" | "postgres" | "markdown" | "none";
  autonomyLevel?: "readonly" | "supervised" | "full";
}

export interface AgentPublic {
  id: string;
  name: string;
  slug: string;
  status: AgentStatus;
  provider: string;
  model: string;
  temperature: number;
  systemPrompt: string | null;
  subdomain: string | null;
  memoryMb: number | null;
  cpuPercent: number | null;
  lastHealthAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimits {
  maxAgents: number;
  memoryLimit: string;
  cpuQuota: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: { maxAgents: 1, memoryLimit: "128m", cpuQuota: 0.5 },
  PRO: { maxAgents: 5, memoryLimit: "256m", cpuQuota: 1.0 },
  ENTERPRISE: { maxAgents: Infinity, memoryLimit: "512m", cpuQuota: 2.0 },
};
