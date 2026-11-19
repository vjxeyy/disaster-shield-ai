import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { ShelterManagementView } from "@/components/shelters/ShelterManagementView";

export const metadata: Metadata = { title: "Shelter Management" };
export const instant = false; // client-rendered from the shared data store

export default function SheltersPage() {
  return (
    <RoleGuard roles={["official", "rescue", "admin"]}>
      <ShelterManagementView />
    </RoleGuard>
  );
}
