"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Card } from "@/components/ui/primitives";
import { DEMO_LOGIN_USERS } from "@/lib/data/seed";
import { ROLE_LABELS } from "@/lib/constants";
import { useAppData } from "@/lib/data/AppDataProvider";
import type { Role } from "@/lib/types";
import { useSwitchRole } from "./useSwitchRole";

/**
 * Page-level access check (UX layer). Data writes are independently authorised in the data
 * layer (demo) and by Supabase RLS / RPC checks (production), so hiding UI is never the only guard.
 */
export function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, mode } = useAppData();
  const switchRole = useSwitchRole();
  if (user && roles.includes(user.role)) return <>{children}</>;

  return (
    <div className="grid place-items-center py-16">
      <Card className="max-w-md p-6 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-navy-50 text-navy-700">
          <Lock className="size-5" />
        </div>
        <h1 className="mt-3 text-base font-bold text-navy-950">Restricted area</h1>
        <p className="mt-1 text-sm text-slate-600">
          This page is available to: {roles.map((r) => ROLE_LABELS[r]).join(", ")}.
          {user && <> You are signed in as {ROLE_LABELS[user.role]}.</>}
        </p>
        {mode === "demo" && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {roles.map((r) => (
              <Button key={r} variant="soft" size="sm" onClick={() => switchRole(DEMO_LOGIN_USERS[r])}>
                Continue as {ROLE_LABELS[r]}
              </Button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
