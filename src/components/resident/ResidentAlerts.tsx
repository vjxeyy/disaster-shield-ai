"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { AlertCard } from "@/components/alerts/AlertCard";
import { EmptyState, Segmented } from "@/components/ui/primitives";
import { ALERT_LEVEL_RANK } from "@/lib/constants";
import { useNow, useReadyData } from "@/lib/data/AppDataProvider";

export function ResidentAlerts() {
  const { state, user } = useReadyData();
  const now = useNow();
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const myZone = user?.zoneId ?? "velachery";
  const active = state.alerts
    .filter((a) => a.active)
    .sort((a, b) => ALERT_LEVEL_RANK[b.level] - ALERT_LEVEL_RANK[a.level] || b.issuedAt.localeCompare(a.issuedAt));
  const list = filter === "mine" ? active.filter((a) => a.zoneIds.includes(myZone)) : active;
  const zone = state.zones.find((z) => z.id === myZone);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Disaster alerts</h1>
          <p className="mt-1 text-sm text-slate-500">Official warnings and what you should do.</p>
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "mine", label: `My area (${zone?.name ?? ""})`, count: active.filter((a) => a.zoneIds.includes(myZone)).length },
            { value: "all", label: "All Chennai", count: active.length },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Bell className="size-5" />} title="No active alerts" description="There are no active warnings for this area right now. Stay alert to official announcements." />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <AlertCard key={a.id} alert={a} state={state} now={now} highlightZoneId={myZone} />
          ))}
        </div>
      )}
    </div>
  );
}
