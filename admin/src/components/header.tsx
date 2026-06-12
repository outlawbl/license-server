"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth";

const TABS = [
  { href: "/", label: "Pregled" },
  { href: "/licenses", label: "Licence" },
  { href: "/logs", label: "Validacije" },
];

export function Masthead() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="border-b-2 border-ink/80">
      <div className="max-w-5xl mx-auto px-6">
        {/* masthead */}
        <div className="flex items-end justify-between pt-7 pb-4">
          <Link href="/" className="block">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-seal">
              ALF-OM · Izdavač licenci
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">
              Registar licenci
            </h1>
          </Link>
          <button
            onClick={logout}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft hover:text-seal pb-1 cursor-pointer"
          >
            Odjava
          </button>
        </div>

        {/* tabovi */}
        <nav className="flex gap-6 -mb-px">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "pb-2.5 text-sm font-medium border-b-2 transition-colors",
                isActive(tab.href)
                  ? "border-seal text-seal"
                  : "border-transparent text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
