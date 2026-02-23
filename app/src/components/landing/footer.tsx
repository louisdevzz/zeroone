import Link from "next/link";
import { Github } from "lucide-react";

const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Providers", href: "#providers" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
  ],
  Developers: [
    { label: "Documentation", href: "https://github.com/zeroclaw-labs/zeroclaw" },
    { label: "ZeroClaw GitHub", href: "https://github.com/zeroclaw-labs/zeroclaw" },
    { label: "API Reference", href: "#" },
    { label: "Self-hosting", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/8 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
              <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <img src="/logo.png" className="w-8" alt="ZeroOne Logo" />
                <span className="text-xl font-bold">
                  <span className="text-primary">Zero</span>
                  <span className="text-foreground">One</span>
                </span>
              </div>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Launch AI agents instantly. No infra. No hassle.
            </p>
            <a
              href="https://github.com/zeroclaw-labs/zeroclaw"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              zeroclaw-labs/zeroclaw
            </a>
          </div>

          {/* Link groups */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/6 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ZeroOne. Built with{" "}
            <a
              href="https://potlock.org"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Potluck Labs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
