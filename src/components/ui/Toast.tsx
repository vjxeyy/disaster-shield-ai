"use client";

import { CircleCheck, CircleX, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn, uid } from "@/lib/format";
import { ValidationError } from "@/lib/validation";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  /** Convenience: show a friendly error toast for any thrown value. */
  fromError: (err: unknown, fallback?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = uid("t");
      setItems((list) => [...list.slice(-3), { id, kind, title, description }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6500 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
      fromError: (err, fallback = "Something went wrong") => {
        const message = err instanceof ValidationError || err instanceof Error ? err.message : fallback;
        push("error", fallback, message !== fallback ? message : undefined);
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] flex flex-col items-center gap-2 p-4 sm:bottom-4 sm:right-4 sm:left-auto sm:items-end"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg",
              t.kind === "success" && "border-teal-200",
              t.kind === "error" && "border-red-200",
              t.kind === "info" && "border-navy-200",
            )}
            role={t.kind === "error" ? "alert" : "status"}
          >
            {t.kind === "success" && <CircleCheck className="mt-0.5 size-5 shrink-0 text-teal-600" />}
            {t.kind === "error" && <CircleX className="mt-0.5 size-5 shrink-0 text-red-600" />}
            {t.kind === "info" && <Info className="mt-0.5 size-5 shrink-0 text-navy-600" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-slate-600">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
