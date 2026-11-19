import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { RoleGuard } from "@/components/layout/RoleGuard";

export const metadata: Metadata = { title: "Government Dashboard" };
export const instant = false; // client-rendered from the shared data store

export default function DashboardPage() {
  return (
    <RoleGuard roles={["official", "admin"]}>
      <DashboardView />
    </RoleGuard>
  );
}
