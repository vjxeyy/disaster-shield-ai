import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { FloodReportForm } from "@/components/resident/FloodReportForm";

export const metadata: Metadata = { title: "Report Flooding" };
export const instant = false; // client-rendered from the shared data store

export default function FloodReportFormPage() {
  return (
    <RoleGuard roles={["resident"]}>
      <FloodReportForm />
    </RoleGuard>
  );
}