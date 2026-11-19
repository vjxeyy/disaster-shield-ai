"use client";

import { ArrowRight, Bell, ClipboardList, MapPin, Phone, Siren, WavesHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { SOSStepper } from "@/components/sos/SOSTimeline";
import { AlertLevelBadge, ALERT_STYLES, RiskBadge, SimulatedTag } from "@/components/ui/badges";
import { Card } from "@/components/ui/primitives";
import { ALERT_LEVEL_RANK } from "@/lib/constants";
import { useNow, useReadyData, useRiskAssessments } from "@/lib/data/AppDataProvider";
import { shelterAvailable, zoneName } from "@/lib/data/selectors";
import { cn, timeAgo } from "@/lib/format";
import { distanceKm, formatDistance } from "@/lib/geo";

const HELPLINES = [
  { label: "National emergency", number: "112" },
  { label: "Ambulance", number: "108" },
  { label: "Fire & rescue", number: "101" },
  { label: "State disaster control room", number: "1070" },
  { label: "District control room", number: "1077" },
];

export function ResidentHome() {
  const { state, user } = useReadyData();
  const assessments = useRiskAssessments(state);
  const now = useNow();
  const zoneId = user?.zoneId ?? "velachery";
  const zone = state.zones.find((z) => z.id === zoneId) ?? state.zones[0];
  const risk = assessments[zone.id];

  const alerts = useMemo(
    () =>
      state.alerts
        .filter((a) => a.active)
        .sort((a, b) => ALERT_LEVEL_RANK[b.level] - ALERT_LEVEL_RANK[a.level] || b.issuedAt.localeCompare(a.issuedAt)),
    [state.alerts],
  );
  const localAlert = alerts.find((a) => a.zoneIds.includes(zone.id)) ?? null;
  const mine = state.sos.filter((s) => s.residentId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = mine[0];
  const nearest = state.shelters
    .filter((s) => s.status === "open" && shelterAvailable(s) > 0)
    .map((s) => ({ s, km: distanceKm(zone.lat, zone.lng, s.lat, s.lng) }))
    .sort((a, b) => a.km - b.km)[0];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">Vanakkam, {user?.name.split(" ")[0]}</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">How can we help?</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <MapPin className="size-3.5" /> {zone.name}
          {risk && <RiskBadge category={risk.category} score={risk.score} />}
        </div>
      </div>

      {localAlert && (
        <Link
          href="/resident/alerts"
          className={cn("block rounded-xl border-2 p-4 transition-colors hover:brightness-[0.98]", ALERT_STYLES[localAlert.level].border, ALERT_STYLES[localAlert.level].bg)}
        >
          <div className="flex items-center justify-between gap-2">
            <AlertLevelBadge level={localAlert.level} />
            <span className="text-[11px] text-slate-500">{timeAgo(localAlert.issuedAt, now)}</span>
          </div>
          <p className={cn("mt-2 text-base font-bold", ALERT_STYLES[localAlert.level].text)}>{localAlert.title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{localAlert.message}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-800">
            Safety instructions <ArrowRight className="size-3" />
          </p>
        </Link>
      )}

      <Link
        href="/resident/sos"
        className="flex items-center gap-4 rounded-2xl bg-red-600 p-5 text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700 sm:p-6"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/15 ring-4 ring-white/20">
          <Siren className="size-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-bold sm:text-2xl">Emergency SOS</span>
          <span className="block text-sm text-red-50">அவசர உதவி · Request rescue or urgent help</span>
        </span>
        <ArrowRight className="size-6 shrink-0" />
      </Link>

      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          href="/resident/report"
          icon={<WavesHorizontal className="size-5" />}
          title="Report flooded road"
          tamil="வெள்ளம் குறித்து தெரிவிக்க"
          detail="Tell officials where water is collecting"
          tone="bg-sky-50 text-sky-700"
        />
        <Tile
          href="/resident/alerts"
          icon={<Bell className="size-5" />}
          title="Disaster alerts"
          tamil="எச்சரிக்கைகள்"
          detail={`${alerts.length} active warning${alerts.length === 1 ? "" : "s"}`}
          tone="bg-orange-50 text-orange-700"
        />
        <Tile
          href="/resident/shelters"
          icon={<MapPin className="size-5" />}
          title="Nearby relief shelters"
          tamil="நிவாரண முகாம்கள்"
          detail={nearest ? `Nearest open: ${nearest.s.name.split(" ").slice(0, 3).join(" ")} · ${formatDistance(nearest.km)}` : "No open shelters with space"}
          tone="bg-teal-50 text-teal-700"
        />
        <Tile
          href="/resident/track"
          icon={<ClipboardList className="size-5" />}
          title="Track my SOS"
          tamil="கோரிக்கை நிலை"
          detail={latest ? `${latest.reference}: ${latest.status.replace("_", " ")}` : "No requests yet"}
          tone="bg-navy-50 text-navy-700"
        />
      </div>

      {latest && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">Your latest request · {timeAgo(latest.createdAt, now)}</p>
              <p className="text-sm font-bold text-navy-950">
                {latest.reference} · {zoneName(state, latest.zoneId)}
              </p>
            </div>
            <Link href="/resident/track" className="text-xs font-semibold text-teal-700 hover:underline">
              Details
            </Link>
          </div>
          <SOSStepper status={latest.status} compact />
        </Card>
      )}

      <Card className="p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Official helplines</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {HELPLINES.map((h) => (
            <a key={h.number} href={`tel:${h.number}`} className="rounded-lg border border-slate-200 px-3 py-2 text-center hover:bg-slate-50">
              <span className="flex items-center justify-center gap-1 text-lg font-bold text-navy-950">
                <Phone className="size-3.5" />
                {h.number}
              </span>
              <span className="block text-[10px] leading-tight text-slate-500">{h.label}</span>
            </a>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
          <SimulatedTag label="Prototype" /> SOS requests in this demo are not sent to real emergency services — call these numbers in a real emergency.
        </p>
      </Card>
    </div>
  );
}

function Tile({ href, icon, title, tamil, detail, tone }: { href: string; icon: React.ReactNode; title: string; tamil: string; detail: string; tone: string }) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-navy-300">
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", tone)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-navy-950">{title}</span>
        <span className="block text-[11px] text-slate-400">{tamil}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-600">{detail}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
