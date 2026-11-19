import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { ResidentHome } from "@/components/resident/ResidentHome";

export const metadata: Metadata = { title: "Resident Portal" };
export const instant = false; // client-rendered from the shared data store

export default function ResidentHomePage() {
  return (
    <RoleGuard roles={["resident"]}>
      <ResidentHome />
    </RoleGuard>
  );
}