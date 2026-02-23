import type { AgentConfigInput } from "../types";

/**
 * Generates a zeroclaw config.toml string for a given agent.
 * This file is written to the container volume before start.
 */
export function buildZeroclawConfig(
  input: AgentConfigInput & { apiKey: string }
): string {
  const memoryBackend = input.memoryBackend ?? "sqlite";
  const autonomyLevel = input.autonomyLevel ?? "supervised";

  const systemPromptLine = input.systemPrompt
    ? `system_prompt = ${JSON.stringify(input.systemPrompt)}\n`
    : "";

  return `# ZeroOne — auto-generated ZeroClaw config
workspace_dir = "/zeroclaw-data/workspace"
config_path = "/zeroclaw-data/.zeroclaw/config.toml"

api_key = ${JSON.stringify(input.apiKey)}
default_provider = ${JSON.stringify(input.provider ?? "openrouter")}
default_model = ${JSON.stringify(input.model ?? "anthropic/claude-sonnet-4-6")}
default_temperature = ${input.temperature ?? 0.7}
${systemPromptLine}
[memory]
backend = ${JSON.stringify(memoryBackend)}
auto_save = true
embedding_provider = "none"

[gateway]
port = 42617
host = "[::]"
require_pairing = true
allow_public_bind = true

[autonomy]
level = ${JSON.stringify(autonomyLevel)}
workspace_only = true
allowed_commands = ["git", "npm", "cargo", "ls", "cat", "grep"]

[runtime]
kind = "native"

[secrets]
encrypt = true
`;
}
