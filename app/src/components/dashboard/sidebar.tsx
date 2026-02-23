"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, Settings, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession, getSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@/lib/api";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Agents", href: "/dashboard/agents", icon: Bot },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const PLAN_BADGE = {
  FREE: { label: "Hobby", className: "bg-white/6 text-muted-foreground border-white/10" },
  PRO: { label: "Pro", className: "bg-primary/10 text-primary border-primary/25" },
  ENTERPRISE: { label: "Enterprise", className: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const session = getSession();
    if (session) setUser(session.user);
  }, []);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <aside className="relative flex h-screen w-56 flex-col border-r border-white/8 bg-background/80 backdrop-blur-sm">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-primary/6 to-transparent" />

      {/* Logo */}
      <div className="relative flex h-14 items-center gap-2 px-4 border-b border-white/8">
        <Link href="/dashboard" className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <img src="/logo.png" className="w-7" alt="ZeroOne Logo" />
            <span className="text-2xl font-bold">
              <span className="text-primary">Zero</span>
              <span className="text-foreground">One</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                    active
                      ? "bg-primary/12 text-primary font-medium border border-primary/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Plan badge */}
      {user && (() => {
        const badge = PLAN_BADGE[user.plan];
        return (
          <div className="relative px-3 pb-2">
            <Link href="/dashboard/settings" className="group flex items-center justify-between rounded-lg border px-3 py-2 transition-all hover:bg-white/5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{user.name ?? user.email}</p>
                <span className={cn("mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", badge.className)}>
                  {badge.label}
                </span>
              </div>
              {user.plan === "FREE" && (
                <Zap className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              )}
            </Link>
          </div>
        );
      })()}

      {/* Logout */}
      <div className="relative border-t border-white/8 p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
