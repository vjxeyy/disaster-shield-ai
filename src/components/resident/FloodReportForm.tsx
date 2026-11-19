"use client";

import { CircleCheckBig, WavesHorizontal, Wand } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LocationPicker } from "@/components/common/LocationPicker";
import { RiskBadge } from "@/components/ui/badges";
import { ChoiceTiles, Field, Input, Textarea } from "@/components/ui/form";
import { Button, buttonClass, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { SEVERITY_LABELS, SEVERITY_SHORT } from "@/lib/constants";
import { useReadyData, useRiskAssessments } from "@/lib/data/AppDataProvider";
import { assessAllZones } from "@/lib/risk";
import type { FloodReportInput, ReportSeverity } from "@/lib/types";
import { type FieldErrors, hasErrors, validateFloodReport, ValidationError } from "@/lib/validation";

export function FloodReportForm() {
  const { state, user, backend, mode } = useReadyData();
  const assessments = useRiskAssessments(state);
  const toast = useToast();
  const home = state.zones.find((z) => z.id === (user?.zoneId ?? "velachery")) ?? state.zones[0];

  const blank = (): FloodReportInput => ({
    reporterName: user?.name ?? "",
    contact: user?.phone ?? "",
    zoneId: home.id,
    roadName: "",
    description: "",
    severity: "" as ReportSeverity,
    waterDepthCm: null,
    lat: home.lat,
    lng: home.lng,
  });
  const [form, setForm] = useState<FloodReportInput>(blank);
  const [errors, setErrors] = useState<FieldErrors<FloodReportInput>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ zoneId: string; before: number; after: number } | null>(null);

  const set = <K extends keyof FloodReportInput>(k: K, v: FloodReportInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = validateFloodReport(form);
    setErrors(v);
    if (hasErrors(v)) {
      toast.error("Please check the highlighted fields");
      return;
    }
    setBusy(true);
    const before = assessments[form.zoneId]?.score ?? 0;
    try {
      await backend.submitFloodReport(form);
      const after = backend.getSnapshot().state;
      const afterScore = after ? assessAllZones(after)[form.zoneId]?.score ?? before : before;
      setDone({ zoneId: form.zoneId, before, after: afterScore });
      toast.success("Flood report submitted", "It is now visible on the risk map and government dashboard.");
    } catch (err) {
      if (err instanceof ValidationError) setErrors(err.fields as FieldErrors<FloodReportInput>);
      toast.fromError(err, "Could not submit report");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const zone = state.zones.find((z) => z.id === done.zoneId);
    const a = assessments[done.zoneId];
    return (
      <Card className="mx-auto max-w-xl p-6 text-center">
        <CircleCheckBig className="mx-auto size-12 text-teal-600" />
        <h1 className="mt-3 text-xl font-bold text-navy-950">Thank you — report received</h1>
        <p className="mt-1 text-sm text-slate-600">Your report now appears on the flood-risk map and the control-room dashboard.</p>
        {zone && a && (
          <div className="mx-auto mt-4 inline-flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2 text-sm">
            <span className="text-slate-600">{zone.name} risk score</span>
            <span className="font-bold text-navy-950 tabular">
              {done.before} → {done.after}
            </span>
            <RiskBadge category={a.category} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/risk-map" className={buttonClass("primary")}>
            View on risk map
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setDone(null);
              setForm(blank());
            }}
          >
            Report another road
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4" noValidate>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy-950">
            <WavesHorizontal className="size-6 text-sky-700" /> Report a flooded road
          </h1>
          <p className="mt-1 text-sm text-slate-500">Reports feed the flood-risk score for your locality and help route rescue teams.</p>
        </div>
        {mode === "demo" && (
          <Button
            variant="soft"
            size="sm"
            onClick={() =>
              setForm({
                ...form,
                zoneId: "velachery",
                roadName: "100 Feet Bypass Road near Phoenix Mall",
                description: "Water flowing across all lanes, buses stopped. Depth increasing.",
                severity: "severe",
                waterDepthCm: 75,
                lat: 12.9905,
                lng: 80.2188,
              })
            }
          >
            <Wand className="size-3.5" /> Fill demo example
          </Button>
        )}
      </div>

      <Card className="space-y-5 p-4 sm:p-5">
        <Field label="How deep is the water?" error={errors.severity} required>
          <ChoiceTiles
            name="Severity"
            value={form.severity}
            onChange={(v) => set("severity", v)}
            invalid={!!errors.severity}
            options={(["low", "moderate", "severe"] as ReportSeverity[]).map((s) => ({
              value: s,
              label: SEVERITY_SHORT[s],
              description: SEVERITY_LABELS[s],
            }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Road / street name" htmlFor="fr-road" error={errors.roadName} required>
            <Input id="fr-road" value={form.roadName} invalid={!!errors.roadName} onChange={(e) => set("roadName", e.target.value)} maxLength={120} />
          </Field>
          <Field label="Approx. depth (cm)" htmlFor="fr-depth" error={errors.waterDepthCm}>
            <Input
              id="fr-depth"
              type="number"
              min={0}
              max={400}
              value={form.waterDepthCm ?? ""}
              invalid={!!errors.waterDepthCm}
              onChange={(e) => set("waterDepthCm", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
        </div>

        <LocationPicker
          idPrefix="fr"
          zones={state.zones}
          value={{ zoneId: form.zoneId, lat: form.lat, lng: form.lng }}
          onChange={(loc) => setForm((f) => ({ ...f, ...loc }))}
          error={errors.lat || errors.zoneId}
        />

        <Field label="What do you see?" htmlFor="fr-desc" error={errors.description} required>
          <Textarea id="fr-desc" value={form.description} invalid={!!errors.description} onChange={(e) => set("description", e.target.value)} maxLength={400} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="fr-name" error={errors.reporterName} required>
            <Input id="fr-name" value={form.reporterName} invalid={!!errors.reporterName} onChange={(e) => set("reporterName", e.target.value)} />
          </Field>
          <Field label="Mobile (optional)" htmlFor="fr-contact" error={errors.contact}>
            <Input id="fr-contact" type="tel" value={form.contact ?? ""} invalid={!!errors.contact} onChange={(e) => set("contact", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Submit flood report
      </Button>
    </form>
  );
}
