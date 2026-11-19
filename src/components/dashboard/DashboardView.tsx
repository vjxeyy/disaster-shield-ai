"use client";

import {
  ArrowRight,
  Bell,
  CircleCheck,
  Gauge,
  LifeBuoy,
  MapPinned,
  Megaphone,
  Siren,
  Tent,
  TriangleExclamationPoint,
  Users,
  WavesHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertFormModal, buildRiskAlertDraft } from "@/components/alerts/AlertFormModal";
import { RainfallTrendChart, RiskByZoneChart, SOSStatusChart, ShelterOccupancyChart } from "@/components/charts/Charts";
import { ActivityFeed } from "@/components/common/ActivityFeed";
import { StatCard } from "@/components/common/StatCard";
import { MapLegend, MARKER_LEGEND, RISK_LEGEND } from "@/components/map/MapLegend";
import { MapView } from "@/components/map/MapView";
import { reportLayers, shelterMarkers, sosMarkers, teamMarkers, zoneCircles } from "@/components/map/layers";
import {
  AlertLevelBadge,
  RiskBadge,
  SimulatedTag,
  SOSStatusBadge,
  TeamStatusBadge,
  UrgencyBadge,
} from "@/components/ui/badges";
import { Badge, Button, buttonClass, Card, CardHeader, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { can } from "@/lib/auth/permissions";
import { EMERGENCY_TYPE_LABELS, RISK_LABELS, SEVERITY_SHORT } from "@/lib/constants";
import { useNow, useReadyData, useRiskAssessments } from "@/lib/data/AppDataProvider";
import { dashboardStats, sortSOSForTriage, teamById, zoneName, zonesNeedingAlert } from "@/lib/data/selectors";
import { formatNumber, timeAgo } from "@/lib/format";
import type { AlertInput } from "@/lib/types";

export function DashboardView() {
  const { state, user, backend } = useReadyData();
  const assessments = useRiskAssessments(state);
  const stats = useMemo(() => dashboardStats(state, assessments), [state, assessments]);
  const now = useNow();
  const router = useRouter();
  const toast = useToast();
  const [alertDraft, setAlertDraft] = useState<AlertInput | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);

  const needAlert = zonesNeedingAlert(state, assessments);
  const highZones = Object.values(assessments).filter((a) => a.category === "high").sort((a, b) => b.score - a.score);
  const triage = sortSOSForTriage(state.sos).slice(0, 6);
  const activeAlerts = state.alerts.filter((a) => a.active);
  const reports = state.floodReports.filter((r) => r.status !== "cleared").slice(0, 6);
  const canAlert = can(user?.role, "alert:manage");
  const canVerify = can(user?.role, "report:verify");

  const circles = useMemo(() => zoneCircles(state, assessments), [state, assessments]);
  const roads = useMemo(() => reportLayers(state.floodReports), [state.floodReports]);
  const markers = useMemo(
    () => [
      ...roads.markers,
      ...shelterMarkers(state.shelters.filter((s) => s.status !== "closed")),
      ...teamMarkers(state.teams),
      ...sosMarkers(state.sos.filter((s) => s.status !== "resolved")),
    ],
    [roads.markers, state.shelters, state.teams, state.sos],
  );

  const topZoneIds = Object.values(assessments)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((a) => a.zoneId);

  function openRiskAlert() {
    const names = needAlert.map((id) => zoneName(state, id));
    setAlertDraft(buildRiskAlertDraft(names, needAlert));
    setAlertOpen(true);
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Emergency Operations Overview — Chennai"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            Urban flood monitoring across {state.zones.length} localities
            <SimulatedTag />
          </span>
        }
        action={
          <>
            {canAlert && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAlertDraft(null);
                  setAlertOpen(true);
                }}
              >
                <Megaphone className="size-3.5" /> Issue alert
              </Button>
            )}
            <Link href="/risk-map" className={buttonClass("primary", "sm")}>
              <MapPinned className="size-3.5" /> Open risk heatmap
            </Link>
          </>
        }
      />

      {highZones.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-600 text-white">
            <TriangleExclamationPoint className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-red-900">
              High flood risk: {highZones.map((a) => `${zoneName(state, a.zoneId)} (${a.score})`).join(", ")}
            </p>
            <p className="text-xs text-red-800">{assessments[highZones[0].zoneId]?.summary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {needAlert.length > 0 && canAlert ? (
              <Button variant="danger" size="sm" onClick={openRiskAlert}>
                <Megaphone className="size-3.5" /> Issue red alert
              </Button>
            ) : (
              <Badge tone="red">
                <CircleCheck className="size-3" /> Red alert active
              </Badge>
            )}
            <Link href="/rescue" className={buttonClass("outline", "sm")}>
              View SOS queue
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Current risk level"
          value={<span className={stats.overall === "high" ? "text-red-600" : stats.overall === "moderate" ? "text-orange-600" : "text-green-700"}>{RISK_LABELS[stats.overall]}</span>}
          icon={<Gauge className="size-4" />}
          tone={stats.overall === "high" ? "red" : stats.overall === "moderate" ? "orange" : "green"}
          hint={`${stats.riskCounts.high} high · ${stats.riskCounts.moderate} moderate · ${stats.riskCounts.low} low`}
          highlight={stats.overall === "high"}
        />
        <StatCard label="Affected areas" value={`${stats.affectedAreas} / ${stats.totalZones}`} icon={<WavesHorizontal className="size-4" />} tone="orange" hint={`${stats.activeReports} active flood reports`} />
        <StatCard label="Active SOS requests" value={stats.activeSOS} icon={<Siren className="size-4" />} tone="red" hint={`${stats.unassignedSOS} awaiting a team`} />
        <StatCard label="Available rescue teams" value={`${stats.availableTeams} / ${stats.totalTeams}`} icon={<LifeBuoy className="size-4" />} tone="teal" hint="Ready for deployment" />
        <StatCard label="Relief shelters" value={`${stats.openShelters} / ${stats.totalShelters}`} icon={<Tent className="size-4" />} tone="navy" hint="Open / registered" />
        <StatCard label="Available shelter capacity" value={formatNumber(stats.availableCapacity)} icon={<Users className="size-4" />} tone="green" hint={`${formatNumber(stats.occupied)} people sheltered`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Disaster monitoring map"
            subtitle="Risk zones, active SOS, flooded roads, shelters and rescue teams"
            icon={<MapPinned className="size-4" />}
            action={<SimulatedTag />}
          />
          <div className="relative h-[380px] sm:h-[440px]">
            <MapView
              circles={circles}
              lines={roads.lines}
              markers={markers}
              scrollZoom={false}
              onSelect={(kind, id) => {
                if (kind === "marker" && state.sos.some((s) => s.id === id)) router.push(`/rescue?sos=${id}`);
                if (kind === "zone") router.push(`/risk-map`);
              }}
              className="h-full"
            />
            <div className="absolute bottom-6 left-3 z-[400] hidden gap-2 md:flex">
              <MapLegend items={RISK_LEGEND} title="Risk" />
              <MapLegend items={MARKER_LEGEND} title="Markers" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Risk by locality" subtitle="Rule-based score, 0–100" icon={<Gauge className="size-4" />} />
          <div className="px-2 pt-2">
            <RiskByZoneChart state={state} assessments={assessments} height={250} />
          </div>
          <div className="grid grid-cols-3 border-t border-slate-100 text-center">
            {(["high", "moderate", "low"] as const).map((c) => (
              <div key={c} className="px-2 py-3">
                <p className="text-xl font-bold text-navy-950 tabular">{stats.riskCounts[c]}</p>
                <RiskBadge category={c} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent SOS requests"
            subtitle="Sorted by urgency and waiting time"
            icon={<Siren className="size-4" />}
            action={
              <Link href="/rescue" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                Rescue console <ArrowRight className="size-3" />
              </Link>
            }
          />
          {triage.length === 0 ? (
            <EmptyState icon={<Siren className="size-5" />} title="No SOS requests" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Request</th>
                    <th className="px-4 py-2 font-semibold">Locality</th>
                    <th className="px-4 py-2 font-semibold">Urgency</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold">Team</th>
                    <th className="px-4 py-2 font-semibold">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {triage.map((s) => (
                    <tr key={s.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/rescue?sos=${s.id}`)}>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-navy-950">{s.reference}</p>
                        <p className="text-[11px] text-slate-500">{EMERGENCY_TYPE_LABELS[s.emergencyType]} · {s.peopleCount} people</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{zoneName(state, s.zoneId)}</td>
                      <td className="px-4 py-2.5">
                        <UrgencyBadge urgency={s.urgency} />
                      </td>
                      <td className="px-4 py-2.5">
                        <SOSStatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{teamById(state, s.assignedTeamId)?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{timeAgo(s.createdAt, now)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Active alerts"
            subtitle={`${activeAlerts.length} public warning${activeAlerts.length === 1 ? "" : "s"} in force`}
            icon={<Bell className="size-4" />}
            action={
              canAlert ? (
                <Link href="/alerts" className="text-xs font-semibold text-teal-700 hover:underline">
                  Manage
                </Link>
              ) : null
            }
          />
          <ul className="divide-y divide-slate-100">
            {activeAlerts.slice(0, 4).map((a) => (
              <li key={a.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <AlertLevelBadge level={a.level} />
                  <span className="text-[11px] text-slate-400">{timeAgo(a.issuedAt, now)}</span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-slate-900">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{a.zoneIds.map((z) => zoneName(state, z)).join(", ")}</p>
              </li>
            ))}
            {activeAlerts.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">No active alerts.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Rainfall (24 h accumulation)" subtitle="Highest-risk localities" icon={<WavesHorizontal className="size-4" />} action={<SimulatedTag />} />
          <div className="p-3">
            <RainfallTrendChart state={state} zoneIds={topZoneIds.slice(0, 3)} height={230} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Emergency activity overview" subtitle="SOS requests by status" icon={<Siren className="size-4" />} />
          <div className="p-3">
            <SOSStatusChart state={state} height={230} />
          </div>
        </Card>
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader
            title="Shelter occupancy"
            subtitle={`${formatNumber(stats.occupied)} sheltered · ${formatNumber(stats.availableCapacity)} places free`}
            icon={<Tent className="size-4" />}
            action={
              <Link href="/shelters" className="text-xs font-semibold text-teal-700 hover:underline">
                Manage
              </Link>
            }
          />
          <div className="p-3">
            <ShelterOccupancyChart shelters={state.shelters} height={230} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Flood reports" subtitle="Citizen and field reports of waterlogged roads" icon={<WavesHorizontal className="size-4" />} />
          <ul className="divide-y divide-slate-100">
            {reports.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{r.roadName}</p>
                  <p className="text-[11px] text-slate-500">
                    {zoneName(state, r.zoneId)} · {SEVERITY_SHORT[r.severity]}
                    {r.waterDepthCm ? ` · ~${r.waterDepthCm} cm` : ""} · {timeAgo(r.createdAt, now)}
                  </p>
                </div>
                {r.status === "verified" ? (
                  <Badge tone="teal">Verified</Badge>
                ) : canVerify ? (
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() =>
                      backend
                        .setFloodReportStatus(r.id, "verified")
                        .then(() => toast.success("Report verified", r.roadName))
                        .catch((e) => toast.fromError(e, "Could not verify"))
                    }
                  >
                    Verify
                  </Button>
                ) : (
                  <Badge>Unverified</Badge>
                )}
              </li>
            ))}
            {reports.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">No active flood reports.</li>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Rescue team availability" subtitle={`${stats.availableTeams} of ${stats.totalTeams} available`} icon={<LifeBuoy className="size-4" />} />
          <ul className="divide-y divide-slate-100">
            {state.teams.map((t) => {
              const active = state.assignments.find((a) => a.teamId === t.id && a.status === "active");
              const sos = active ? state.sos.find((s) => s.id === active.sosId) : null;
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {t.members} members · base {zoneName(state, t.baseZoneId)}
                      {sos ? ` · on ${sos.reference}` : ""}
                    </p>
                  </div>
                  <TeamStatusBadge status={t.status} />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Live activity" subtitle="Every action across all modules" icon={<Bell className="size-4" />} />
          <div className="max-h-[420px] overflow-y-auto">
            <ActivityFeed events={state.activity} limit={12} />
          </div>
        </Card>
      </div>

      <AlertFormModal open={alertOpen} onClose={() => setAlertOpen(false)} initial={alertDraft} />
    </div>
  );
}
