import type { Metadata } from "next";
import { AlertsManagementView } from "@/components/alerts/AlertsManagementView";
import { RoleGuard } from "@/components/layout/RoleGuard";

export const metadata: Metadata = { title: "Alerts & Warnings" };
export const instant = false; // client-rendered from the shared data store

export default function AlertsPage() {
  return (
    <RoleGuard roles={["official", "admin"]}>
      <AlertsManagementView />
    </RoleGuard>
  );
}
