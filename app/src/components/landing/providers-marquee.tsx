"use client";
import { motion } from "framer-motion";
import { Marquee } from "@/components/shared/marquee";

const providers = [
  { name: "OpenAI", color: "#10a37f" },
  { name: "Anthropic", color: "#d4a472" },
  { name: "Google Gemini", color: "#4285f4" },
  { name: "Mistral AI", color: "#ff6b35" },
  { name: "Groq", color: "#f55036" },
  { name: "Ollama", color: "#ffffff" },
  { name: "Cohere", color: "#39594d" },
  { name: "Together AI", color: "#6366f1" },
  { name: "Perplexity", color: "#20808d" },
  { name: "DeepSeek", color: "#4a90e2" },
  { name: "Fireworks AI", color: "#ef4444" },
  { name: "AWS Bedrock", color: "#ff9900" },
  { name: "Azure OpenAI", color: "#0078d4" },
  { name: "Replicate", color: "#6d28d9" },
  { name: "HuggingFace", color: "#ffd21e" },
];

function ProviderChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm font-medium text-foreground/80 whitespace-nowrap"
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}

export function ProvidersMarquee() {
  const items = providers.map((p) => (
    <ProviderChip key={p.name} name={p.name} color={p.color} />
  ));

  return (
    <section id="providers" className="relative py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-10 px-6 text-center"
      >
        <span className="mb-4 inline-block rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Providers
        </span>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Works with every major LLM
        </h2>
        <p className="mt-3 text-muted-foreground">
          ZeroClaw supports 15+ providers out of the box. Configure via TOML — no code changes needed.
        </p>
      </motion.div>

      <div className="space-y-3 overflow-hidden">
        <Marquee items={items} />
        <Marquee items={items} reverse />
      </div>
    </section>
  );
}
