"use client";
import { cn } from "@/lib/utils";

interface MarqueeProps {
  items: React.ReactNode[];
  speed?: number;
  className?: string;
  reverse?: boolean;
}

export function Marquee({ items, className, reverse = false }: MarqueeProps) {
  return (
    <div className={cn("flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]", className)}>
      <ul
        className={cn(
          "flex min-w-full shrink-0 items-stretch gap-4 py-4",
          "animate-[marquee_25s_linear_infinite]",
          reverse && "[animation-direction:reverse]"
        )}
        style={{ "--marquee-speed": "25s" } as React.CSSProperties}
      >
        {[...items, ...items].map((item, i) => (
          <li key={i} className="flex flex-shrink-0 self-stretch">{item}</li>
        ))}
      </ul>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
