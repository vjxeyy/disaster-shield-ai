"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { MapView } from "@/components/map/MapView";
import type { MapCircle, MapFocus, MapMarker } from "@/components/map/LeafletMap";
import { Field, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/primitives";
import { isInDemoRegion, nearestZone } from "@/lib/geo";
import type { RiskZone } from "@/lib/types";

export interface PickedLocation {
  zoneId: string;
  lat: number;
  lng: number;
}

/**
 * Locality selector + "use my GPS location" + tap-on-map pin.
 * The nearest demo locality is derived from the pin so every SOS/report is tagged to a risk zone.
 */
export function LocationPicker({
  zones,
  value,
  onChange,
  error,
  mapHeight = "h-56",
  idPrefix,
}: {
  zones: RiskZone[];
  value: PickedLocation;
  onChange: (v: PickedLocation) => void;
  error?: string;
  mapHeight?: string;
  idPrefix: string;
}) {
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const circles = useMemo<MapCircle[]>(
    () =>
      zones.map((z) => ({
        id: z.id,
        lat: z.lat,
        lng: z.lng,
        radius: z.radiusM,
        color: z.id === value.zoneId ? "#0d9488" : "#94a3b8",
        selected: z.id === value.zoneId,
        label: z.name,
      })),
    [zones, value.zoneId],
  );
  const markers = useMemo<MapMarker[]>(() => [{ id: "pin", lat: value.lat, lng: value.lng, kind: "pin", tooltip: "Selected location" }], [value.lat, value.lng]);

  function pick(lat: number, lng: number, fly = false) {
    const near = nearestZone(zones, lat, lng);
    if (!near) return;
    onChange({ zoneId: near.zone.id, lat, lng });
    if (fly) setFocus({ lat, lng, zoom: 15, key: Date.now() });
  }

  function useGps() {
    if (!("geolocation" in navigator)) {
      setGpsMsg("GPS is not available in this browser. Tap the map instead.");
      return;
    }
    setLocating(true);
    setGpsMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (!isInDemoRegion(latitude, longitude)) {
          setGpsMsg("Your GPS position is outside the Chennai demonstration region, so it was not used. Select a locality or tap the map.");
          return;
        }
        pick(latitude, longitude, true);
        setGpsMsg("Location set from GPS.");
      },
      (err) => {
        setLocating(false);
        setGpsMsg(err.code === err.PERMISSION_DENIED ? "Location permission denied. Select a locality or tap the map." : "Could not get your location. Tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Locality" htmlFor={`${idPrefix}-zone`} required className="flex-1">
          <Select
            id={`${idPrefix}-zone`}
            value={value.zoneId}
            onChange={(e) => {
              const z = zones.find((x) => x.id === e.target.value);
              if (z) {
                onChange({ zoneId: z.id, lat: z.lat, lng: z.lng });
                setFocus({ lat: z.lat, lng: z.lng, zoom: 14, key: Date.now() });
              }
            }}
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="outline" onClick={useGps} loading={locating}>
          <LocateFixed className="size-4" /> Use my location
        </Button>
      </div>
      <div className={`overflow-hidden rounded-lg border ${error ? "border-red-400" : "border-slate-300"}`}>
        <MapView
          className={mapHeight}
          center={[value.lat, value.lng]}
          zoom={14}
          circles={circles}
          markers={markers}
          focus={focus}
          scrollZoom={false}
          onMapClick={(lat, lng) => pick(lat, lng)}
          ariaLabel="Tap to choose the exact location"
        />
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <MapPin className="size-3.5" /> Tap the map to move the pin · {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
      </p>
      {gpsMsg && <p className="text-xs text-navy-700">{gpsMsg}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
