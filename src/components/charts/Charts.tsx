"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RISK_HEX, SOS_STATUS_LABELS, SOS_STATUS_ORDER } from "@/lib/constants";
import { shelterAvailable } from "@/lib/data/selectors";
import { formatTime } from "@/lib/format";
import type { RiskAssessment } from "@/lib/risk";
import type { AppState, Shelter } from "@/lib/types";

const AXIS = { fontSize: 11, fill: "#64748b" };
const TOOLTIP_STYLE = { borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 6px 18px rgb(15 23 42 / 0.1)" };

const SERIES_COLORS = ["#dc2626", "#1f2f52", "#0d9488", "#ea580c", "#7c3aed", "#0284c7", "#65a30d", "#db2777"];

/** 24-hour accumulated rainfall over the last readings, carried forward per zone. */
export function RainfallTrendChart({ state, zoneIds, height = 240 }: { state: AppState; zoneIds: string[]; height?: number }) {
  const times = Array.from(new Set(state.rainfall.map((r) => r.recordedAt))).sort().slice(-14);
  const byZone = new Map<string, { t: string; v: number }[]>();
  for (const r of [...state.rainfall].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    const list = byZone.get(r.zoneId) ?? [];
    list.push({ t: r.recordedAt, v: r.rainfall24hMm });
    byZone.set(r.zoneId, list);
  }
  const data = times.map((t) => {
    const row: Record<string, string | number> = { time: formatTime(t) };
    for (const id of zoneIds) {
      const list = byZone.get(id) ?? [];
      let v: number | undefined;
      for (const p of list) if (p.t <= t) v = p.v;
      if (v !== undefined) row[id] = v;
    }
    return row;
  });
  const names = Object.fromEntries(state.zones.map((z) => [z.id, z.name]));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {zoneIds.map((id, i) => (
            <linearGradient key={id} id={`rain-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.18} />
              <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="time" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} unit=" mm" width={64} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v} mm`, names[String(n)] ?? n]} />
        <Legend formatter={(v) => <span className="text-xs text-slate-600">{names[String(v)] ?? v}</span>} iconType="circle" iconSize={8} />
        {zoneIds.map((id, i) => (
          <Area
            key={id}
            type="monotone"
            dataKey={id}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            fill={`url(#rain-${id})`}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RiskByZoneChart({ state, assessments, height = 260 }: { state: AppState; assessments: Record<string, RiskAssessment>; height?: number }) {
  const data = state.zones
    .map((z) => ({ name: z.name, score: assessments[z.id]?.score ?? 0, category: assessments[z.id]?.category ?? "low" }))
    .sort((a, b) => b.score - a.score);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ ...AXIS, fill: "#334155" }} tickLine={false} axisLine={false} width={86} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f8fafc" }} formatter={(v) => [`${v} / 100`, "Risk score"]} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={RISK_HEX[d.category]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUS_COLORS = { submitted: "#dc2626", assigned: "#ea580c", in_progress: "#2563eb", resolved: "#16a34a" };

export function SOSStatusChart({ state, height = 220 }: { state: AppState; height?: number }) {
  const data = SOS_STATUS_ORDER.map((s) => ({ key: s, name: SOS_STATUS_LABELS[s], value: state.sos.filter((x) => x.status === s).length }));
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={STATUS_COLORS[d.key]} stroke="#fff" />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
        <p className="text-2xl font-bold text-navy-950 tabular">{total}</p>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">SOS total</p>
      </div>
    </div>
  );
}

export function ShelterOccupancyChart({ shelters, height = 260 }: { shelters: Shelter[]; height?: number }) {
  const data = shelters.map((s) => ({
    name: s.name.replace(/(Corporation |Government |Municipal |Community |Relief |Higher Secondary )/g, "").split(" ").slice(0, 2).join(" "),
    full: s.name,
    occupied: s.status === "closed" ? 0 : s.occupied,
    available: shelterAvailable(s),
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "#f8fafc" }}
          labelFormatter={(_, payload) => (payload?.[0]?.payload as { full?: string } | undefined)?.full ?? ""}
        />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize text-slate-600">{v}</span>} />
        <Bar dataKey="occupied" stackId="a" fill="#1f2f52" isAnimationActive={false} />
        <Bar dataKey="available" stackId="a" fill="#5eead4" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
