"use client";

import { ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import type { Role } from "@/lib/types";
import { NAV, navItemFor } from "./nav";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-500/15 ring-1 ring-teal-400/40">
        <ShieldCheck className="size-5 text-teal-300" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight text-white">Disaster-Shield AI</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ role, open, onClose, badges }: { role: Role; open: boolean; onClose: () => void; badges: Record<string, number> }) {
  const pathname = usePathname();
  const active = navItemFor(pathname)?.href;

  return (
    <>
      {open && <div className="fixed inset-0 z-[700] bg-navy-950/50 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[710] flex w-72 flex-col bg-navy-950 text-navy-100 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-4 pb-4 pt-5">
          <BrandMark />
          <button onClick={onClose} className="rounded-md p-1 text-navy-300 hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {NAV.map((section) => {
            const items = section.items.filter((i) => i.roles.includes(role));
            if (items.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">{section.title}</p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.href;
                    const badge = badges[item.href];
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                            isActive ? "bg-white/10 text-white" : "text-navy-200 hover:bg-white/5 hover:text-white",
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className={cn("size-4 shrink-0", isActive ? "text-teal-300" : "text-navy-400 group-hover:text-navy-200")} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge ? (
                            <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white tabular">{badge}</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
