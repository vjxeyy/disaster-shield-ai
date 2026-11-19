import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { ShelterFinder } from "@/components/resident/ShelterFinder";

export const metadata: Metadata = { title: "Nearby Shelters" };
export const instant = false; // client-rendered from the shared data store

export default function ShelterFinderPage() {
  return (
    <RoleGuard roles={["resident"]}>
      <ShelterFinder />
    </RoleGuard>
  );
}