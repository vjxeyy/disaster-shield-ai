import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { ResidentAlerts } from "@/components/resident/ResidentAlerts";

export const metadata: Metadata = { title: "Disaster Alerts" };
export const instant = false; // client-rendered from the shared data store

export default function ResidentAlertsPage() {
  return (
    <RoleGuard roles={["resident"]}>
      <ResidentAlerts />
    </RoleGuard>
  );
}