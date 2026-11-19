"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { ROLE_HOME } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { useAppData } from "@/lib/data/AppDataProvider";
import { routeAllowed } from "./nav";

/** Demo-mode helper: sign in as another demo user and move to a page that role can open. */
export function useSwitchRole() {
  const { backend, state, user: current } = useAppData();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  return useCallback(
    async (userId: string, goTo?: string) => {
      const user = state?.users.find((u) => u.id === userId);
      if (!user) return;
      try {
        if (current?.id !== userId) {
          await backend.signInDemo(userId);
          toast.info(`Now acting as ${ROLE_LABELS[user.role]}`, user.name);
        }
        const target = goTo ?? (routeAllowed(pathname, user.role) && pathname !== "/" ? pathname : ROLE_HOME[user.role]);
        if (target !== pathname) router.push(target);
      } catch (err) {
        toast.fromError(err, "Could not switch role");
      }
    },
    [backend, state, current, pathname, router, toast],
  );
}
