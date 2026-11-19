import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { SOSForm } from "@/components/resident/SOSForm";

export const metadata: Metadata = { title: "Emergency SOS" };
export const instant = false; // client-rendered from the shared data store

export default function SOSFormPage() {
  return (
    <RoleGuard roles={["resident"]}>
      <SOSForm />
    </RoleGuard>
  );
}