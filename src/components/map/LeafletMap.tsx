"use client";

/**
 * Thin imperative wrapper around Leaflet + OpenStreetMap tiles.
 * Written without react-leaflet so the map is cleanly destroyed/re-created when Next.js hides
 * and re-shows routes (React <Activity>), and so layers can be redrawn cheaply from props.
 * All tooltip HTML passed in must already be escaped (see lib/format.escapeHtml).
 */
import L from "leaflet";
import { useEffect, useRef } from "react";
import { CHENNAI_CENTER, CHENNAI_ZOOM } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { LatLng } from "@/lib/types";

export interface MapCircle {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  color: string;
  label?: string;
  tooltip?: string;
  selected?: boolean;
}

export type MarkerKind =
  | "sos"
  | "sos-assigned"
  | "sos-progress"
  | "sos-resolved"
  | "shelter"
  | "shelter-full"
  | "shelter-closed"
  | "team"
  | "team-deployed"
  | "report"
  | "user"
  | "pin";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: MarkerKind;
  tooltip?: string;
  pulse?: boolean;
  selected?: boolean;
  size?: number;
}

export interface MapLine {
  id: string;
  path: LatLng[];
  color: string;
  dashed?: boolean;
  tooltip?: string;
}

export interface MapFocus {
  lat: number;
  lng: number;
  zoom?: number;
  key?: string | number;
}

export interface LeafletMapProps {
  circles?: MapCircle[];
  markers?: MapMarker[];
  lines?: MapLine[];
  center?: [number, number];
  zoom?: number;
  focus?: MapFocus | null;
  scrollZoom?: boolean;
  showZoneLabels?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onSelect?: (kind: "zone" | "marker" | "line", id: string) => void;
  className?: string;
  ariaLabel?: string;
}

const GLYPHS: Record<string, string> = {
  sos: '<path d="M12 6v8"/><path d="M12 18h.01"/>',
  shelter: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  team: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 8v6M9 11h6"/>',
  report: '<path d="M2 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  user: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
  pin: '<circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/>',
};

function glyphFor(kind: MarkerKind): string {
  const key = kind.startsWith("sos") ? "sos" : kind.startsWith("shelter") ? "shelter" : kind.startsWith("team") ? "team" : kind;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[key] ?? GLYPHS.pin}</svg>`;
}

const Z_INDEX: Partial<Record<MarkerKind, number>> = { sos: 900, "sos-assigned": 800, "sos-progress": 700, pin: 1000, user: 950 };

export default function LeafletMap({
  circles,
  markers,
  lines,
  center,
  zoom,
  focus,
  scrollZoom = true,
  showZoneLabels = true,
  onMapClick,
  onSelect,
  className,
  ariaLabel = "Map of Chennai",
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupsRef = useRef<{ zones: L.LayerGroup; lines: L.LayerGroup; markers: L.LayerGroup } | null>(null);
  const initialView = useRef({ center: center ?? CHENNAI_CENTER, zoom: zoom ?? CHENNAI_ZOOM, scrollZoom });
  const handlers = useRef({ onMapClick, onSelect });

  useEffect(() => {
    handlers.current = { onMapClick, onSelect };
  });

  // 1. Create the map (re-created if the route is hidden and shown again)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { center: c, zoom: z, scrollZoom: sz } = initialView.current;
    const map = L.map(el, { center: c, zoom: z, scrollWheelZoom: sz, zoomControl: true, preferCanvas: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);
    const groups = {
      zones: L.layerGroup().addTo(map),
      lines: L.layerGroup().addTo(map),
      markers: L.layerGroup().addTo(map),
    };
    map.on("click", (e: L.LeafletMouseEvent) => handlers.current.onMapClick?.(e.latlng.lat, e.latlng.lng));
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    mapRef.current = map;
    groupsRef.current = groups;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      groupsRef.current = null;
    };
  }, []);

  // 2. Draw layers whenever data changes
  useEffect(() => {
    const groups = groupsRef.current;
    if (!groups) return;
    groups.zones.clearLayers();
    groups.lines.clearLayers();
    groups.markers.clearLayers();

    for (const c of circles ?? []) {
      const rings: [number, number][] = [
        [1, 0.1],
        [0.66, 0.12],
        [0.33, 0.16],
      ];
      rings.forEach(([scale, opacity], i) => {
        const circle = L.circle([c.lat, c.lng], {
          radius: c.radius * scale,
          color: c.color,
          weight: i === 0 ? (c.selected ? 3 : 1.5) : 0,
          opacity: i === 0 ? 0.9 : 0,
          fillColor: c.color,
          fillOpacity: c.selected ? opacity + 0.06 : opacity,
          dashArray: i === 0 && c.selected ? undefined : i === 0 ? "4 4" : undefined,
        });
        if (i === 0 && c.tooltip) circle.bindTooltip(c.tooltip, { className: "dsa-tooltip", sticky: true });
        circle.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          handlers.current.onSelect?.("zone", c.id);
          handlers.current.onMapClick?.(e.latlng.lat, e.latlng.lng);
        });
        circle.addTo(groups.zones);
      });
      if (showZoneLabels && c.label) {
        L.tooltip({ permanent: true, direction: "center", className: "dsa-zone-label", interactive: false })
          .setLatLng([c.lat + c.radius / 111_000 * 0.55, c.lng])
          .setContent(c.label)
          .addTo(groups.zones);
      }
    }

    for (const line of lines ?? []) {
      L.polyline(line.path, { color: "#ffffff", weight: 9, opacity: 0.9, lineCap: "round" }).addTo(groups.lines);
      const pl = L.polyline(line.path, {
        color: line.color,
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        dashArray: line.dashed ? "8 8" : undefined,
      });
      if (line.tooltip) pl.bindTooltip(line.tooltip, { className: "dsa-tooltip", sticky: true });
      pl.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        handlers.current.onSelect?.("line", line.id);
      });
      pl.addTo(groups.lines);
    }

    for (const m of markers ?? []) {
      const size = m.size ?? (m.kind === "pin" ? 30 : 26);
      const icon = L.divIcon({
        className: "",
        html: `<div class="dsa-marker dsa-marker--${m.kind}${m.pulse ? " dsa-pulse" : ""}${m.selected ? " dsa-marker--selected" : ""}" style="width:${size}px;height:${size}px">${glyphFor(m.kind)}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        tooltipAnchor: [0, -size / 2],
      });
      const marker = L.marker([m.lat, m.lng], { icon, zIndexOffset: (Z_INDEX[m.kind] ?? 0) + (m.selected ? 2000 : 0), keyboard: true });
      if (m.tooltip) marker.bindTooltip(m.tooltip, { className: "dsa-tooltip", direction: "top" });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        handlers.current.onSelect?.("marker", m.id);
      });
      marker.addTo(groups.markers);
    }
  }, [circles, markers, lines, showZoneLabels]);

  // 3. Fly to a focus point when requested
  const focusKey = focus ? `${focus.lat},${focus.lng},${focus.zoom ?? ""},${focus.key ?? ""}` : "";
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom ?? Math.max(map.getZoom(), 13), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return <div ref={containerRef} className={cn("dsa-map h-full w-full", className)} role="region" aria-label={ariaLabel} />;
}
