"use client";

import { Pencil, Phone, Plus, Search, Tent, Trash, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/common/StatCard";
import { MapView } from "@/components/map/MapView";
import type { MapFocus } from "@/components/map/LeafletMap";
import { shelterMarkers, sosMarkers, zoneCircles } from "@/components/map/layers";
import { RiskBadge, ShelterStatusBadge, SimulatedTag } from "@/components/ui/badges";
import { Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { Button, Card, CardHeader, EmptyState, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { can } from "@/lib/auth/permissions";
import { useNow, useReadyData, useRiskAssessments } from "@/lib/data/AppDataProvider";
import { shelterAvailable, zoneName } from "@/lib/data/selectors";
import { cn, formatNumber, pct, timeAgo } from "@/lib/format";
import { distanceKm, formatDistance } from "@/lib/geo";
import type { Shelter, ShelterStatus } from "@/lib/types";
import { FacilityList } from "./FacilityIcons";
import { OccupancyModal, ShelterFormModal } from "./ShelterModals";

export function ShelterManagementView() {
  const { state, user, backend } = useReadyData();
  const assessments = useRiskAssessments(state);
  const now = useNow();
  const toast = useToast();
  const canManage = can(user?.role, "shelter:manage");
  const canOccupancy = can(user?.role, "shelter:update_occupancy");

  const highest = Object.values(assessments).sort((a, b) => b.score - a.score)[0];
  const [nearZone, setNearZone] = useState<string>(highest?.zoneId ?? "velachery");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShelterStatus | "all">("all");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [occupancyFor, setOccupancyFor] = useState<Shelter | null>(null);
  const [editing, setEditing] = useState<Shelter | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Shelter | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const zone = state.zones.find((z) => z.id === nearZone) ?? state.zones[0];
  const rows = useMemo(
    () =>
      state.shelters
        .map((s) => ({ s, km: distanceKm(zone.lat, zone.lng, s.lat, s.lng), free: shelterAvailable(s) }))
        .filter((r) => statusFilter === "all" || r.s.status === statusFilter)
        .filter((r) => !query.trim() || `${r.s.name} ${r.s.address}`.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.km - b.km),
    [state.shelters, zone, statusFilter, query],
  );

  const open = state.shelters.filter((s) => s.status !== "closed");
  const totalCap = open.reduce((n, s) => n + s.capacity, 0);
  const occupied = open.reduce((n, s) => n + s.occupied, 0);
  const available = state.shelters.reduce((n, s) => n + shelterAvailable(s), 0);

  const circles = useMemo(() => zoneCircles(state, assessments, nearZone), [state, assessments, nearZone]);
  const markers = useMemo(() => [...shelterMarkers(state.shelters), ...sosMarkers(state.sos.filter((s) => s.status !== "resolved"))], [state.shelters, state.sos]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await backend.deleteShelter(deleting.id);
      toast.success("Shelter removed", deleting.name);
      setDeleting(null);
    } catch (err) {
      toast.fromError(err, "Could not remove shelter");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Shelter Management"
        subtitle="Relief centre capacity, occupancy and facilities — changes reach residents and the dashboard instantly."
        action={
          <>
            <SimulatedTag label="Sample shelters" />
            {canManage && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Add shelter
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Registered shelters" value={state.shelters.length} icon={<Tent className="size-4" />} hint={`${open.length} open or full`} />
        <StatCard label="Total capacity (open)" value={formatNumber(totalCap)} icon={<Users className="size-4" />} tone="slate" />
        <StatCard label="People sheltered" value={formatNumber(occupied)} icon={<Users className="size-4" />} tone="orange" hint={`${pct(occupied, totalCap)}% utilisation`} />
        <StatCard label="Places available" value={formatNumber(available)} icon={<Tent className="size-4" />} tone="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search shelters" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search shelters" />
            </div>
            <Select className="sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ShelterStatus | "all")} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="full">Full</option>
              <option value="closed">Closed / standby</option>
            </Select>
            <Select className="sm:w-48" value={nearZone} onChange={(e) => setNearZone(e.target.value)} aria-label="Sort by distance from locality">
              {state.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  Nearest to {z.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            Distances from <strong className="text-navy-950">{zone.name}</strong>
            {assessments[zone.id] && <RiskBadge category={assessments[zone.id].category} score={assessments[zone.id].score} />}
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={<Tent className="size-5" />} title="No shelters match" description="Adjust the search or filter." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map(({ s, km, free }) => (
                <li key={s.id} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setFocus({ lat: s.lat, lng: s.lng, zoom: 15, key: Date.now() })}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-navy-950">{s.name}</h3>
                        <ShelterStatusBadge status={s.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {s.address} · {zoneName(state, s.zoneId)} · <span className="font-semibold text-slate-700">{formatDistance(km)}</span>
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <ProgressBar
                          className="max-w-64"
                          value={s.occupied}
                          max={s.capacity}
                          tone={s.status === "closed" ? "navy" : free === 0 ? "red" : free / s.capacity < 0.2 ? "orange" : "teal"}
                        />
                        <span className="whitespace-nowrap text-xs text-slate-700 tabular">
                          <strong>{s.occupied}</strong> / {s.capacity} · <span className="text-teal-700">{free} free</span>
                        </span>
                      </div>
                      <div className="mt-2">
                        <FacilityList facilities={s.facilities} />
                      </div>
                      <p className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" /> {s.contact || "—"}
                        </span>
                        Updated {timeAgo(s.updatedAt, now)}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {canOccupancy && (
                        <Button size="sm" variant="teal" onClick={() => setOccupancyFor(s)}>
                          <Users className="size-3.5" /> Update occupancy
                        </Button>
                      )}
                      {canManage && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(s);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(s)} aria-label={`Remove ${s.name}`}>
                            <Trash className="size-3.5 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className={cn("overflow-hidden xl:sticky xl:top-20 xl:self-start")}>
          <CardHeader title="Shelters near risk zones" subtitle="Shelters (squares), active SOS (circles) and risk zones" />
          <MapView className="h-[420px] xl:h-[560px]" circles={circles} markers={markers} focus={focus} scrollZoom={false} />
        </Card>
      </div>

      <OccupancyModal shelter={occupancyFor} onClose={() => setOccupancyFor(null)} />
      <ShelterFormModal open={formOpen} shelter={editing} onClose={() => setFormOpen(false)} />
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Remove shelter?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>
              Remove shelter
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          <strong>{deleting?.name}</strong> will be removed from the registry and will no longer appear to residents. To close it temporarily, set its
          availability to &ldquo;Closed / standby&rdquo; instead.
        </p>
      </Modal>
    </div>
  );
}
