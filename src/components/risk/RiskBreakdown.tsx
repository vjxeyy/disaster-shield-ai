import { Clock as History, CloudRain, Droplets, Siren, WavesHorizontal } from "lucide-react";
import { RiskBadge } from "@/components/ui/badges";
import { RISK_HEX } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { RiskAssessment, RiskFactor } from "@/lib/risk";
import type { RiskCategory, RiskZone } from "@/lib/types";

export function RiskScoreRing({ score, category, size = 88 }: { score: number; category: RiskCategory; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={RISK_HEX[category]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-bold leading-none text-navy-950 tabular">{score}</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">/ 100</p>
        </div>
      </div>
    </div>
  );
}

const FACTOR_ICON: Record<RiskFactor["key"], typeof CloudRain> = {
  rainfall: CloudRain,
  intensity: Droplets,
  reports: WavesHorizontal,
  incidents: Siren,
  history: History,
};

export function RiskBreakdown({ assessment, zone }: { assessment: RiskAssessment; zone: RiskZone }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <RiskScoreRing score={assessment.score} category={assessment.category} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-navy-950">{zone.name}</h3>
            <RiskBadge category={assessment.category} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{assessment.summary}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Population ~{formatNumber(zone.population)} (sample) · elevation ~{zone.elevationM} m
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Why this score?</p>
        <ul className="space-y-3">
          {assessment.factors.map((f) => {
            const Icon = FACTOR_ICON[f.key];
            const pctValue = (f.points / f.maxPoints) * 100;
            return (
              <li key={f.key}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-800">
                    <Icon className="size-3.5 shrink-0 text-navy-500" />
                    <span className="truncate">{f.label}</span>
                  </span>
                  <span className="shrink-0 text-slate-500 tabular">
                    <span className="font-bold text-navy-900">+{f.points}</span> / {f.maxPoints}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pctValue}%`,
                      background: pctValue >= 66 ? "#dc2626" : pctValue >= 33 ? "#ea580c" : "#0d9488",
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  <span className="font-medium text-slate-700">{f.input}.</span> {f.explanation}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-500">
        Score = rainfall (35) + intensity (10) + waterlogging reports (20) + active SOS (15) + historical susceptibility (20).
        Low &lt; 40 ≤ Moderate &lt; 70 ≤ High. Model {assessment.modelId} v{assessment.modelVersion} on simulated inputs.
      </p>
    </div>
  );
}
