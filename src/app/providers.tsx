"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { AppDataProvider } from "@/lib/data/AppDataProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppDataProvider>
      <ToastProvider>{children}</ToastProvider>
    </AppDataProvider>
  );
}
