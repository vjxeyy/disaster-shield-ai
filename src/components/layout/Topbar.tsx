"use client";

import { Bell, Database, FlaskConical, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABELS } from "@/lib/constants";
import { useAppData } from "@/lib/data/AppDataProvider";
import { formatTime } from "@/lib/format";
import { navItemFor } from "./nav";
import { RoleSwitcher } from "./RoleSwitcher";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, state, mode, backend } = useAppData();
  const pathname = usePathname();
  const router = useRouter();
  const item = navItemFor(pathname);
  if (!user || !state) return null;

  const activeAlerts = state.alerts.filter((a) => a.active).length;
  const alertsHref = user.role === "resident" ? "/resident/alerts" : user.role === "rescue" ? "/risk-map" : "/alerts";
  const team = user.teamId ? state.teams.find((t) => t.id === user.teamId) : null;

  return (
    <header className="sticky top-0 z-[500] border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
        <button onClick={onMenu} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy-950">{item?.label ?? "Disaster-Shield AI"}</p>
          <p className="hidden truncate text-[11px] text-slate-500 sm:block">{item?.description}</p>
        </div>

        {mode === "demo" ? (
          <span
            className="hidden items-center gap-1.5 rounded-md border border-dashed border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 md:inline-flex"
            title="Running without a database: sample data stored in this browser."
          >
            <FlaskConical className="size-3.5" /> Demo mode · Simulated data
          </span>
        ) : (
          <span className="hidden items-center gap-1.5 rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800 md:inline-flex">
            <Database className="size-3.5" /> Supabase connected
          </span>
        )}
        <span className="hidden items-center gap-1.5 text-[11px] text-slate-500 xl:inline-flex" title="Last data change">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-teal-500" />
          </span>
          Synced {formatTime(state.meta.lastUpdated)}
        </span>

        <Link href={alertsHref} className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label={`${activeAlerts} active alerts`}>
          <Bell className="size-5" />
          {activeAlerts > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {activeAlerts}
            </span>
          )}
        </Link>

        <RoleSwitcher />

        <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
          <div className="grid size-8 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">
            {user.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="max-w-40 leading-tight">
            <p className="truncate text-xs font-semibold text-slate-800">{user.name}</p>
            <p className="truncate text-[11px] text-slate-500">{team ? team.name : ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await backend.signOut();
            router.push("/");
          }}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}
