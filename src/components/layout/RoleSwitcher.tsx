"use client";

import { Check, ChevronDown, Repeat } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ROLE_LABELS } from "@/lib/constants";
import { useAppData } from "@/lib/data/AppDataProvider";
import { cn } from "@/lib/format";
import type { Role } from "@/lib/types";
import { useSwitchRole } from "./useSwitchRole";

const ORDER: Role[] = ["official", "resident", "rescue", "admin"];

export function RoleSwitcher({ className }: { className?: string }) {
  const { state, user, mode } = useAppData();
  const switchRole = useSwitchRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (mode !== "demo" || !state) return null;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Repeat className="size-3.5 text-teal-700" />
        <span className="hidden sm:inline">Switch role</span>
        <ChevronDown className="size-3.5 text-slate-400" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[600] mt-2 max-h-[70vh] w-80 animate-slide-up overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
          {ORDER.map((role) => (
            <div key={role} className="py-1">
              <p className="px-2 py-1 text-[11px] font-bold text-navy-700">{ROLE_LABELS[role]}</p>
              {state.users
                .filter((u) => u.role === role && u.active)
                .slice(0, role === "resident" ? 2 : 6)
                .map((u) => {
                  const team = u.teamId ? state.teams.find((t) => t.id === u.teamId) : null;
                  const current = u.id === user?.id;
                  return (
                    <button
                      key={u.id}
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (!current) void switchRole(u.id);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50",
                        current && "bg-teal-50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">{u.name}</span>
                        <span className="block truncate text-[11px] text-slate-500">{team ? team.name : u.title ?? ROLE_LABELS[u.role]}</span>
                      </span>
                      {current && <Check className="size-4 shrink-0 text-teal-700" />}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
