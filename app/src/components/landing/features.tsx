"use client";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/shared/spotlight-card";
import { Zap, Container, Globe, Lock, Activity, Layers } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "~5MB RAM per agent",
    description:
      "ZeroClaw is a Rust-native AI runtime. Each agent container idles at just ~5MB of RAM — run hundreds of agents on a single VPS without breaking the bank.",
  },
  {
    icon: Container,
    title: "Isolated Docker containers",
    description:
      "Every agent runs in its own sandboxed container. Full process isolation, no shared state, no interference.",
  },
  {
    icon: Globe,
    title: "15+ LLM providers",
    description:
      "OpenAI, Anthropic, Gemini, Mistral, Groq, Ollama, and more. Switch providers with a single config change.",
  },
  {
    icon: Activity,
    title: "<10ms cold start",
    description:
      "Rust binary boots instantly. From deploy to first token in under 10 milliseconds.",
  },
  {
    icon: Lock,
    title: "Encrypted at rest",
    description:
      "API keys and bearer tokens are AES-256-GCM encrypted. Secrets never leave your infrastructure in plaintext.",
  },
  {
    icon: Layers,
    title: "Self-hostable",
    description:
      "Full stack runs on any Linux VPS. No vendor lock-in. Own your data, own your infrastructure.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Features
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for scale from day one
          </h2>
          <p className="mt-3 text-muted-foreground">
            ZeroOne handles the infrastructure. You focus on building agents.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <SpotlightCard className="h-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
