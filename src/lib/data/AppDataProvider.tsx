"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { assessAllZones, type RiskAssessment } from "../risk";
import type { AppState, UserProfile } from "../types";
import { type Backend, type BackendSnapshot, isSupabaseConfigured } from "./backend";
import { DemoBackend } from "./demo-backend";
import { SupabaseBackend } from "./supabase-backend";

let clientBackend: Backend | null = null;

function getBackend(): Backend {
  if (typeof window === "undefined") return new DemoBackend(); // server render: always "loading"
  if (!clientBackend) {
    clientBackend = isSupabaseConfigured()
      ? new SupabaseBackend(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      : new DemoBackend();
  }
  return clientBackend;
}

const BackendContext = createContext<Backend | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [backend] = useState(getBackend);
  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}

export function useBackend(): Backend {
  const backend = useContext(BackendContext);
  if (!backend) throw new Error("useBackend must be used inside <AppDataProvider>");
  return backend;
}

export interface AppData extends BackendSnapshot {
  backend: Backend;
  user: UserProfile | null;
  mode: Backend["mode"];
}

export function useAppData(): AppData {
  const backend = useBackend();
  const snap = useSyncExternalStore(backend.subscribe, backend.getSnapshot, backend.getServerSnapshot);
  const user = useMemo(
    () => snap.state?.users.find((u) => u.id === snap.sessionUserId && u.active) ?? null,
    [snap.state, snap.sessionUserId],
  );
  return { ...snap, backend, user, mode: backend.mode };
}

/** Ready-only variant: components rendered inside <RequireReady> can rely on `state` and `user`. */
export function useReadyData(): AppData & { state: AppState } {
  const data = useAppData();
  if (!data.state) throw new Error("useReadyData used before data was ready");
  return data as AppData & { state: AppState };
}

export function useRiskAssessments(state: AppState | null): Record<string, RiskAssessment> {
  return useMemo(() => (state ? assessAllZones(state) : {}), [state]);
}

/** Re-render every `ms` so relative times ("5 min ago") stay fresh. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
