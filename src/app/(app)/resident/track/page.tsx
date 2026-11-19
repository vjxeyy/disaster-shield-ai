import type { Metadata } from "next";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { TrackSOS } from "@/components/resident/TrackSOS";

export const metadata: Metadata = { title: "Track My SOS" };
export const instant = false; // client-rendered from the shared data store

export default function TrackSOSPage() {
  return (
    <RoleGuard roles={["resident"]}>
      <TrackSOS />
    </RoleGuard>
  );
}