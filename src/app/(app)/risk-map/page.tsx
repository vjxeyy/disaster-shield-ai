import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { RiskMapView } from "@/components/risk/RiskMapView";

export const metadata: Metadata = { title: "AI Risk Heatmap" };
export const instant = false; // client-rendered from the shared data store

export default function RiskMapPage() {
  return (
    <RoleGuard roles={["resident", "official", "rescue", "admin"]}>
      <RiskMapView />
    </RoleGuard>
  );
}
