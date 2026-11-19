"use client";

import { MapPinned } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/format";
import type { LeafletMapProps } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400">
      <div className="flex items-center gap-2 text-xs font-medium">
        <MapPinned className="size-4 animate-pulse" /> Loading map…
      </div>
    </div>
  ),
});

/** Client-only map (Leaflet touches `window`, so it is never server-rendered). */
export function MapView({ className, ...props }: LeafletMapProps & { className?: string }) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <LeafletMap {...props} />
    </div>
  );
}
