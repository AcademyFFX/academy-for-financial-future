"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { navItems } from "@/lib/data";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="sticky top-0 z-50 border-b border-gold-500/20 bg-navy-950/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center border border-gold-500/45 bg-navy-800 text-gold-300 shadow-gold">
              <ShieldCheck size={22} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-lg font-semibold uppercase tracking-[.08em] text-white">
                Academy for Financial Future
              </span>
              <span className="block text-xs uppercase tracking-[.22em] text-gold-300">Forex Training Division</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-2 text-xs transition ${
                  pathname === item.href ? "text-gold-300" : "text-ink/76 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/login" className="ml-2 border border-gold-500/45 px-4 py-2 text-xs font-semibold text-gold-300">
              Login
            </Link>
          </nav>
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center border border-gold-500/40 text-gold-300 xl:hidden"
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {open ? (
          <div className="border-t border-gold-500/20 bg-navy-900 px-4 py-3 xl:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-3 text-sm ${pathname === item.href ? "text-gold-300" : "text-ink/80"}`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href="/login" className="border border-gold-500/40 px-3 py-3 text-center text-sm text-gold-300">
                  Login
                </Link>
                <Link href="/register" className="bg-gold-500 px-3 py-3 text-center text-sm font-bold text-navy-950">
                  Register
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>
      <main>{children}</main>
      <footer className="border-t border-gold-500/20 bg-navy-950 px-4 py-10 text-sm text-ink/68">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Academy for Financial Future. All rights reserved.</p>
          <p>Administrator: Dr. Jean Rene Moricette</p>
        </div>
      </footer>
    </div>
  );
}
