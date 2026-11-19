"use client";

import { LocateFixed, Navigation, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { MapView } from "@/components/map/MapView";
import type { MapFocus, MapMarker } from "@/components/map/LeafletMap";
import { shelterMarkers } from "@/components/map/layers";
import { FacilityList } from "@/components/shelters/FacilityIcons";
import { ShelterStatusBadge, SimulatedTag } from "@/components/ui/badges";
import { Select } from "@/components/ui/form";
import { Button, Card, ProgressBar, Segmented } from "@/components/ui/primitives";
import { useNow, useReadyData } from "@/lib/data/AppDataProvider";
import { shelterAvailable } from "@/lib/data/selectors";
import { cn, timeAgo } from "@/lib/format";
import { directionsUrl, distanceKm, formatDistance, isInDemoRegion } from "@/lib/geo";

export function ShelterFinder() {
  const { state, user } = useReadyData();
  const now = useNow();
  const home = state.zones.find((z) => z.id === (user?.zoneId ?? "velachery")) ?? state.zones[0];
  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string }>({ lat: home.lat, lng: home.lng, label: home.name });
  const [filter, setFilter] = useState<"available" | "all">("available");
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  const ranked = useMemo(
    () =>
      state.shelters
        .map((s) => ({ s, km: distanceKm(origin.lat, origin.lng, s.lat, s.lng), free: shelterAvailable(s) }))
        .filter((x) => filter === "all" || (x.s.status === "open" && x.free > 0))
        .sort((a, b) => a.km - b.km),
    [state.shelters, origin, filter],
  );

  const markers = useMemo<MapMarker[]>(
    () => [
      ...shelterMarkers(ranked.map((r) => r.s), selected),
      { id: "me", lat: origin.lat, lng: origin.lng, kind: "user", size: 18, tooltip: "Your location" },
    ],
    [ranked, selected, origin],
  );

  function gps() {
    if (!("geolocation" in navigator)) return setGpsMsg("GPS not available.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!isInDemoRegion(p.coords.latitude, p.coords.longitude)) {
          setGpsMsg("You appear to be outside Chennai, so distances use the selected locality instead.");
          return;
        }
        setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude, label: "Your GPS location" });
        setFocus({ lat: p.coords.latitude, lng: p.coords.longitude, zoom: 13, key: Date.now() });
        setGpsMsg(null);
      },
      () => setGpsMsg("Location permission denied — choose your locality instead."),
      { timeout: 10_000 },
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950">Nearby relief shelters</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            Live capacity from shelter managers <SimulatedTag />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Your locality"
            className="w-44"
            value={state.zones.some((z) => z.name === origin.label) ? state.zones.find((z) => z.name === origin.label)!.id : ""}
            onChange={(e) => {
              const z = state.zones.find((x) => x.id === e.target.value);
              if (z) {
                setOrigin({ lat: z.lat, lng: z.lng, label: z.name });
                setFocus({ lat: z.lat, lng: z.lng, zoom: 13, key: Date.now() });
              }
            }}
          >
            <option value="" disabled>
              GPS location
            </option>
            {state.zones.map((z) => (
              <option key={z.id} value={z.id}>
                Near {z.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={gps}>
            <LocateFixed className="size-4" /> GPS
          </Button>
        </div>
      </div>
      {gpsMsg && <p className="text-xs text-navy-700">{gpsMsg}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "available", label: "Open with space", count: state.shelters.filter((s) => s.status === "open" && shelterAvailable(s) > 0).length },
              { value: "all", label: "All shelters", count: state.shelters.length },
            ]}
          />
          {ranked.map(({ s, km, free }, i) => (
            <Card
              key={s.id}
              className={cn("cursor-pointer p-4 transition-colors hover:border-navy-300", selected === s.id && "border-teal-500 ring-2 ring-teal-100")}
              onClick={() => {
                setSelected(s.id);
                setFocus({ lat: s.lat, lng: s.lng, zoom: 15, key: Date.now() });
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {i === 0 && filter === "available" && (
                    <span className="mb-1 inline-block rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Nearest</span>
                  )}
                  <h3 className="text-sm font-bold text-navy-950">{s.name}</h3>
                  <p className="text-xs text-slate-500">{s.address}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-navy-950 tabular">{formatDistance(km)}</p>
                  <p className="text-[10px] text-slate-500">from {origin.label}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ShelterStatusBadge status={s.status} />
                <div className="flex-1">
                  <ProgressBar value={s.occupied} max={s.capacity} tone={free === 0 ? "red" : free / s.capacity < 0.2 ? "orange" : "teal"} />
                </div>
                <span className="text-xs font-semibold text-slate-700 tabular">
                  {free} of {s.capacity} free
                </span>
              </div>
              <div className="mt-3">
                <FacilityList facilities={s.facilities} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">Updated {timeAgo(s.updatedAt, now)}</span>
                <div className="flex gap-2">
                  <a
                    href={`tel:${s.contact.replace(/\s/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Phone className="size-3.5" /> Call
                  </a>
                  <a
                    href={directionsUrl(s.lat, s.lng, origin.lat, origin.lng)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md bg-navy-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-navy-800"
                  >
                    <Navigation className="size-3.5" /> Directions
                  </a>
                </div>
              </div>
            </Card>
          ))}
          {ranked.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No shelters match this filter.</p>}
        </div>
        <Card className="overflow-hidden lg:sticky lg:top-20 lg:self-start">
          <MapView
            className="h-[380px] lg:h-[600px]"
            center={[origin.lat, origin.lng]}
            zoom={12}
            markers={markers}
            focus={focus}
            onSelect={(kind, id) => kind === "marker" && id !== "me" && setSelected(id)}
          />
        </Card>
      </div>
    </div>
  );
}
