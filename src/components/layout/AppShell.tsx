"use client";

import { CircleX, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Skeleton } from "@/components/ui/primitives";
import { useAppData } from "@/lib/data/AppDataProvider";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

function ShellSkeleton({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-64 shrink-0 bg-navy-950 lg:block" />
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck className="size-4 animate-pulse text-teal-600" /> {message}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-4 h-80" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, user, state, error, backend } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const needsLogin = status !== "loading" && !!state && !user;

  useEffect(() => {
    if (needsLogin) router.replace(`/?next=${encodeURIComponent(pathname)}`);
  }, [needsLogin, pathname, router]);

  const badges = useMemo(() => {
    if (!state || !user) return {};
    const unassigned = state.sos.filter((s) => s.status === "submitted").length;
    const myActive = state.sos.filter((s) => s.assignedTeamId === user.teamId && (s.status === "assigned" || s.status === "in_progress")).length;
    return {
      "/rescue": user.role === "rescue" ? myActive : unassigned,
      "/resident/track": state.sos.filter((s) => s.residentId === user.id && s.status !== "resolved").length,
    } as Record<string, number>;
  }, [state, user]);

  if (status === "error" && !state) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="max-w-md text-center">
          <CircleX className="mx-auto size-10 text-red-600" />
          <h1 className="mt-3 text-lg font-bold text-navy-950">Could not load data</h1>
          <p className="mt-1 text-sm text-slate-600">{error}</p>
          <Button className="mt-4" onClick={() => location.reload()}>
            Retry
          </Button>
          {backend.mode === "supabase" && (
            <p className="mt-3 text-xs text-slate-500">Check the Supabase URL/key and that the migration has been run.</p>
          )}
        </div>
      </div>
    );
  }

  if (status === "loading" || !state || !user) {
    return <ShellSkeleton message={needsLogin ? "Redirecting to sign-in…" : "Loading emergency data…"} />;
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={user.role} open={menuOpen} onClose={() => setMenuOpen(false)} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-5 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
