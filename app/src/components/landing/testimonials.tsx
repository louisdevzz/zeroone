"use client";
import { Marquee } from "@/components/shared/marquee";

const row1 = [
  {
    avatar: "JD",
    handle: "@jakedev",
    text: "I tried to build my own assistant bots before, and I am very impressed by how many hard things ZeroOne gets right. Persistent memory, channel routing, sub-10ms startup — it just works.",
  },
  {
    avatar: "MQ",
    handle: "@markjaquith",
    text: "I've been saying for six months that even if LLMs suddenly stopped improving, we could spend *years* discovering new transformative use cases. ZeroOne makes those deployable in one click.",
  },
  {
    avatar: "SR",
    handle: "@sara_r",
    text: "Feels like we're living in the future. Deployed a Telegram bot with persistent memory in under 2 minutes. Genuinely wild.",
  },
  {
    avatar: "AD",
    handle: "@AryehDubois",
    text: "Built on ZeroClaw by the Potluck Labs team. The architecture is clean, the runtime is lean, and the DX is excellent. Highly recommended.",
  },
];

const row2 = [
  {
    avatar: "PH",
    handle: "@Philo01",
    text: "Feels like we're living in the future — had a multi-channel AI agent running on my VPS for less than a dollar a month.",
  },
  {
    avatar: "NF",
    handle: "@Senator_NFTs",
    text: "ZeroOne is a game changer. The potential for custom extensions is huge, and AI really speeds up the whole process. Never going back to hosted chatbots.",
  },
  {
    avatar: "KL",
    handle: "@kayleeliu",
    text: "Ran 20 agents on a $6/mo VPS without any issues. The efficiency is incredible.",
  },
  {
    avatar: "TM",
    handle: "@tmack",
    text: "We replaced three SaaS chatbot subscriptions with one ZeroOne deployment. The savings paid for the VPS 10x over.",
  },
];

function TestimonialCard({ avatar, handle, text }: { avatar: string; handle: string; text: string }) {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col justify-between rounded-2xl border border-white/8 bg-white/3 p-5 hover:border-white/12 hover:bg-white/5 transition-all">
      <p className="mb-4 text-sm leading-relaxed text-foreground/75">
        &ldquo;{text}&rdquo;
      </p>
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary border border-primary/25">
          {avatar}
        </div>
        <span className="text-sm font-semibold text-primary">{handle}</span>
      </div>
    </div>
  );
}

export function Testimonials() {
  const items1 = row1.map((t, i) => (
    <TestimonialCard key={i} {...t} />
  ));
  const items2 = row2.map((t, i) => (
    <TestimonialCard key={i} {...t} />
  ));

  return (
    <section className="py-24 overflow-hidden">
      {/* Header */}
      <div className="mb-10 px-6 text-center">
        <span className="mb-4 inline-block rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Testimonials
        </span>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          What People Say
        </h2>
        <p className="mt-3 text-muted-foreground">
          Builders and teams from around the world trust ZeroOne.
        </p>
      </div>

      {/* Row 1 — left to right */}
      <div className="mb-4">
        <Marquee items={items1} />
      </div>

      {/* Row 2 — right to left */}
      <Marquee items={items2} reverse />
    </section>
  );
}
