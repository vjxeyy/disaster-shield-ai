import type { Metadata } from "next";
import { AdminView } from "@/components/admin/AdminView";
import { RoleGuard } from "@/components/layout/RoleGuard";

export const metadata: Metadata = { title: "Administration" };
export const instant = false; // client-rendered from the shared data store

export default function AdminPage() {
  return (
    <RoleGuard roles={["admin"]}>
      <AdminView />
    </RoleGuard>
  );
}
