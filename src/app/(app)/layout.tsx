import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

/**
 * App pages read the shared emergency data on the client (demo store / Supabase realtime),
 * so the shell renders a loading state on the server and the page once data is ready.
 * Opt this subtree out of Next.js instant-navigation validation accordingly.
 */
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
