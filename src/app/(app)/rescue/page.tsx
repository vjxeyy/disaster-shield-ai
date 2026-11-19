import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { RescueView } from "@/components/rescue/RescueView";

export const metadata: Metadata = { title: "Rescue Management" };
export const instant = false; // client-rendered from the shared data store

export default function RescuePage() {
  return (
    <RoleGuard roles={["official", "rescue", "admin"]}>
      <Suspense>
        <RescueView />
      </Suspense>
    </RoleGuard>
  );
}
