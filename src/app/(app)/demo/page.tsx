import type { Metadata } from "next";
import { DemoGuideView } from "@/components/demo/DemoGuideView";

export const metadata: Metadata = { title: "Demo Guide" };
export const instant = false; // client-rendered from the shared data store

export default function DemoPage() {
  return <DemoGuideView />;
}
