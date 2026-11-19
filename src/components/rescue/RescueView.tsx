"use client";

import {
  CircleCheckBig,
  Clock,
  LifeBuoy,
  MapPin,
  Navigation,
  Phone,
  CirclePlay as PlayCircle,
  Siren,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/common/StatCard";
import { MapView } from "@/components/map/MapView";
import type { MapMarker } from "@/components/map/LeafletMap";
import { sosMarkers, teamMarkers, zoneCircles } from "@/components/map/layers";
import { SOSStepper, SOSTimeline } from "@/components/sos/SOSTimeline";
import { SimulatedTag, SOSStatusBadge, TeamStatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { Input, Select } from "@/components/ui/form";
import { Button, Card, CardHeader, EmptyState, SectionTitle, Segmented } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { can, canUpdateSOS } from "@/lib/auth/permissions";
import { EMERGENCY_TYPE_LABELS, TEAM_STATUS_LABELS } from "@/lib/constants";
import { useNow, useReadyData, useRiskAssessments } from "@/lib/data/AppDataProvider";
import { sortSOSForTriage, teamById, zoneName } from "@/lib/data/selectors";
import { cn, timeAgo } from "@/lib/format";
import { directionsUrl } from "@/lib/geo";
import type { SOSRequest, SOSStatus, TeamStatus } from "@/lib/types";
import { AssignTeamModal } from "./AssignTeamModal";

type Filter = "pending" | "active" | "resolved" | "all";

export function RescueView() {
  const { state, user, backend } = useReadyData();
  const assessments = useRiskAssessments(state);
  const now = useNow();
  const toast = useToast();
  const params = useSearchParams();
  const isRescue = user?.role === "rescue";
  const myTeam = isRescue ? teamById(state, user?.teamId) : null;
  const canAssign = can(user?.role, "sos:assign");

  const visible = useMemo(
    () => (isRescue ? state.sos.filter((s) => s.assignedTeamId === user?.teamId) : state.sos),
    [isRescue, state.sos, user?.teamId],
  );
  const [filter, setFilter] = useState<Filter>(isRescue ? "active" : "pending");
  const [assignOpen, setAssignOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<SOSStatus | null>(null);

  const counts = {
    pending: visible.filter((s) => s.status === "submitted").length,
    active: visible.filter((s) => s.status === "assigned" || s.status === "in_progress").length,
    resolved: visible.filter((s) => s.status === "resolved").length,
    all: visible.length,
  };
  const list = sortSOSForTriage(
    visible.filter((s) =>
      filter === "all" ? true : filter === "pending" ? s.status === "submitted" : filter === "active" ? s.status === "assigned" || s.status === "in_progress" : s.status === "resolved",
    ),
  );

  const paramId = params.get("sos");
  const selected: SOSRequest | null = (paramId && visible.find((s) => s.id === paramId)) || list[0] || null;

  function select(id: string) {
    window.history.replaceState(null, "", `?sos=${encodeURIComponent(id)}`);
    setNote("");
  }

  async function advance(status: SOSStatus) {
    if (!selected) return;
    setBusy(status);
    try {
      await backend.updateSOSStatus(selected.id, status, note);
      toast.success(`${selected.reference} → ${status === "in_progress" ? "In Progress" : "Resolved"}`, "The resident's tracking page has been updated.");
      setNote("");
    } catch (err) {
      toast.fromError(err, "Status update failed");
    } finally {
      setBusy(null);
    }
  }

  async function changeTeamStatus(teamId: string, status: TeamStatus) {
    try {
      await backend.setTeamStatus(teamId, status);
      toast.success("Team status updated", TEAM_STATUS_LABELS[status]);
    } catch (err) {
      toast.fromError(err, "Could not update team");
    }
  }

  const circles = useMemo(() => zoneCircles(state, assessments), [state, assessments]);
  const selectedId = selected?.id ?? null;
  const markers: MapMarker[] = [
    ...teamMarkers(state.teams),
    ...sosMarkers(
      (isRescue ? visible : state.sos).filter((s) => s.status !== "resolved" || s.id === selectedId),
      selectedId,
    ),
  ];

  const team = selected ? teamById(state, selected.assignedTeamId) : null;
  const mayUpdate = selected ? canUpdateSOS(user, selected) : false;

  return (
    <div className="space-y-4">
      <SectionTitle
        title={isRescue ? "My rescue assignments" : "Rescue Management"}
        subtitle={
          isRescue && myTeam ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {myTeam.name} · {myTeam.members} members <TeamStatusBadge status={myTeam.status} />
            </span>
          ) : (
            "Triage incoming SOS requests, assign the nearest suitable team and track every operation."
          )
        }
        action={<SimulatedTag label="Sample incidents & teams" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={isRescue ? "Awaiting my team" : "Awaiting assignment"} value={isRescue ? visible.filter((s) => s.status === "assigned").length : counts.pending} icon={<Siren className="size-4" />} tone="red" />
        <StatCard label="In progress" value={visible.filter((s) => s.status === "in_progress").length} icon={<PlayCircle className="size-4" />} tone="orange" />
        <StatCard label="Completed operations" value={counts.resolved} icon={<CircleCheckBig className="size-4" />} tone="green" />
        <StatCard
          label="Teams available"
          value={`${state.teams.filter((t) => t.status === "available").length} / ${state.teams.length}`}
          icon={<LifeBuoy className="size-4" />}
          tone="teal"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        <Card className="flex max-h-[860px] flex-col">
          <div className="border-b border-slate-100 p-3">
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                ...(isRescue ? [] : [{ value: "pending" as Filter, label: "Pending", count: counts.pending }]),
                { value: "active", label: "Active", count: counts.active },
                { value: "resolved", label: "Resolved", count: counts.resolved },
                { value: "all", label: "All", count: counts.all },
              ]}
            />
          </div>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => select(s.id)}
                  className={cn("w-full px-4 py-3 text-left transition-colors hover:bg-slate-50", selected?.id === s.id && "bg-teal-50/70")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-navy-950">{s.reference}</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="size-3" /> {timeAgo(s.createdAt, now)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-800">{EMERGENCY_TYPE_LABELS[s.emergencyType]}</p>
                  <p className="text-[11px] text-slate-500">
                    {zoneName(state, s.zoneId)} · {s.peopleCount} people{s.landmark ? ` · ${s.landmark}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <UrgencyBadge urgency={s.urgency} />
                    <SOSStatusBadge status={s.status} />
                    {s.assignedTeamId && <span className="text-[11px] text-slate-500">{teamById(state, s.assignedTeamId)?.name}</span>}
                  </div>
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <li>
                <EmptyState
                  icon={<LifeBuoy className="size-5" />}
                  title={isRescue ? "No requests in this list" : "Nothing here"}
                  description={isRescue ? "When the control room assigns an SOS to your team it appears here instantly." : "Change the filter to see other requests."}
                />
              </li>
            )}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <MapView
              className="h-[300px] sm:h-[360px]"
              circles={circles}
              markers={markers}
              scrollZoom={false}
              focus={selected ? { lat: selected.lat, lng: selected.lng, zoom: 14, key: selected.id } : null}
              onSelect={(kind, id) => kind === "marker" && visible.some((s) => s.id === id) && select(id)}
            />
          </Card>

          {selected ? (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="font-mono text-lg font-bold text-navy-950">{selected.reference}</p>
                  <p className="text-sm text-slate-700">{EMERGENCY_TYPE_LABELS[selected.emergencyType]}</p>
                  <p className="text-xs text-slate-500">Received {timeAgo(selected.createdAt, now)} · updated {timeAgo(selected.updatedAt, now)}</p>
                </div>
                <div className="flex gap-1.5">
                  <UrgencyBadge urgency={selected.urgency} />
                  <SOSStatusBadge status={selected.status} />
                </div>
              </div>
              <div className="grid gap-5 p-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <SOSStepper status={selected.status} compact />
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{selected.description}</p>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase text-slate-500">Requested by</dt>
                      <dd className="text-slate-900">{selected.name}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase text-slate-500">People</dt>
                      <dd className="flex items-center gap-1 text-slate-900">
                        <Users className="size-3.5" /> {selected.peopleCount}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[11px] font-semibold uppercase text-slate-500">Location</dt>
                      <dd className="flex items-start gap-1 text-slate-900">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                        {selected.landmark ? `${selected.landmark}, ` : ""}
                        {zoneName(state, selected.zoneId)} ({selected.lat.toFixed(4)}, {selected.lng.toFixed(4)})
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:${selected.phone.replace(/\s/g, "")}`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Phone className="size-3.5" /> {selected.phone}
                    </a>
                    <a
                      href={directionsUrl(selected.lat, selected.lng, team?.lat, team?.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Navigation className="size-3.5" /> Route
                    </a>
                  </div>

                  {selected.status !== "resolved" && (
                    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Actions</p>
                      {canAssign && (
                        <Button variant={selected.status === "submitted" ? "teal" : "outline"} className="w-full" onClick={() => setAssignOpen(true)}>
                          <LifeBuoy className="size-4" /> {selected.assignedTeamId ? "Reassign team" : "Assign rescue team"}
                        </Button>
                      )}
                      {selected.assignedTeamId && mayUpdate && (
                        <>
                          <Input placeholder="Progress note (optional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} aria-label="Progress note" />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              variant={selected.status === "assigned" ? "primary" : "outline"}
                              disabled={selected.status !== "assigned"}
                              loading={busy === "in_progress"}
                              onClick={() => advance("in_progress")}
                            >
                              <PlayCircle className="size-4" /> Mark In Progress
                            </Button>
                            <Button
                              variant={selected.status === "in_progress" ? "teal" : "outline"}
                              loading={busy === "resolved"}
                              onClick={() => advance("resolved")}
                            >
                              <CircleCheckBig className="size-4" /> Mark Resolved
                            </Button>
                          </div>
                        </>
                      )}
                      {!selected.assignedTeamId && !canAssign && <p className="text-xs text-slate-500">Waiting for the control room to assign a team.</p>}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Timeline</p>
                  <SOSTimeline state={state} sos={selected} />
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <EmptyState icon={<Siren className="size-5" />} title="Select a request" description="Choose an SOS from the list to see details and actions." />
            </Card>
          )}
        </div>
      </div>

      {!isRescue && (
        <Card>
          <CardHeader title="Rescue teams" subtitle="Availability and current operations" icon={<LifeBuoy className="size-4" />} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Team</th>
                  <th className="px-4 py-2 font-semibold">Base</th>
                  <th className="px-4 py-2 font-semibold">Members</th>
                  <th className="px-4 py-2 font-semibold">Current operation</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.teams.map((t) => {
                  const op = state.assignments.find((a) => a.teamId === t.id && a.status === "active");
                  const opSos = op ? state.sos.find((s) => s.id === op.sosId) : null;
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-navy-950">{t.name}</p>
                        <p className="text-[11px] text-slate-500">{t.agency}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{zoneName(state, t.baseZoneId)}</td>
                      <td className="px-4 py-2.5 text-slate-700 tabular">{t.members}</td>
                      <td className="px-4 py-2.5">
                        {opSos ? (
                          <button className="font-mono text-xs font-semibold text-teal-700 hover:underline" onClick={() => select(opSos.id)}>
                            {opSos.reference}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {can(user?.role, "team:update_status") && !op ? (
                          <Select
                            aria-label={`Status of ${t.name}`}
                            className="h-8 w-36 text-xs"
                            value={t.status}
                            onChange={(e) => changeTeamStatus(t.id, e.target.value as TeamStatus)}
                          >
                            <option value="available">Available</option>
                            <option value="off_duty">Off duty</option>
                          </Select>
                        ) : (
                          <TeamStatusBadge status={t.status} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AssignTeamModal sos={selected} open={assignOpen} onClose={() => setAssignOpen(false)} />
    </div>
  );
}
