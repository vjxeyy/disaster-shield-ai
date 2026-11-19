"use client";

import {
  Building,
  CircleCheckBig,
  ClipboardList,
  Flame,
  HeartPulse,
  LifeBuoy,
  MapPin,
  Siren,
  Users,
  Utensils,
  WavesHorizontal,
  Wand,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LocationPicker } from "@/components/common/LocationPicker";
import { SOSStepper } from "@/components/sos/SOSTimeline";
import { SimulatedTag } from "@/components/ui/badges";
import { ChoiceTiles, Field, Input, Textarea } from "@/components/ui/form";
import { Button, buttonClass, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { EMERGENCY_TYPE_LABELS, URGENCY_LABELS } from "@/lib/constants";
import { useReadyData } from "@/lib/data/AppDataProvider";
import { zoneName } from "@/lib/data/selectors";
import type { EmergencyType, SOSInput, SOSRequest, Urgency } from "@/lib/types";
import { type FieldErrors, hasErrors, validateSOS, ValidationError } from "@/lib/validation";

const TYPE_ICONS: Record<EmergencyType, React.ReactNode> = {
  trapped: <WavesHorizontal className="size-5" />,
  medical: <HeartPulse className="size-5" />,
  evacuation: <LifeBuoy className="size-5" />,
  food_water: <Utensils className="size-5" />,
  electrical: <Zap className="size-5" />,
  structural: <Building className="size-5" />,
  other: <Flame className="size-5" />,
};

const URGENCY_DESC: Record<Urgency, string> = {
  critical: "Life in danger now",
  high: "Need help within the hour",
  medium: "Need help today",
  low: "Not immediately dangerous",
};

const URGENCY_SELECTED: Record<Urgency, string> = {
  critical: "!bg-red-600 !border-red-600",
  high: "!bg-orange-600 !border-orange-600",
  medium: "!bg-yellow-500 !border-yellow-500 !text-yellow-950",
  low: "!bg-slate-600 !border-slate-600",
};

export function SOSForm() {
  const { state, user, backend, mode } = useReadyData();
  const toast = useToast();
  const home = state.zones.find((z) => z.id === (user?.zoneId ?? "velachery")) ?? state.zones[0];

  const blank = (): SOSInput => ({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    emergencyType: "" as EmergencyType,
    urgency: "" as Urgency,
    description: "",
    peopleCount: 1,
    zoneId: home.id,
    landmark: "",
    lat: home.lat,
    lng: home.lng,
  });

  const [form, setForm] = useState<SOSInput>(blank);
  const [errors, setErrors] = useState<FieldErrors<SOSInput>>({});
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<SOSRequest | null>(null);

  const set = <K extends keyof SOSInput>(k: K, v: SOSInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function prefillDemo() {
    const v = state.zones.find((z) => z.id === "velachery")!;
    setForm({
      name: user?.name ?? "Priya Raman",
      phone: user?.phone ?? "+91 90000 20001",
      emergencyType: "trapped",
      urgency: "critical",
      description: "Water is chest-deep on our street and rising. Family of four with an elderly grandmother stuck on the first floor, ground floor flooded.",
      peopleCount: 4,
      zoneId: v.id,
      landmark: "3rd Cross Street, near Velachery MRTS station",
      lat: 12.9798,
      lng: 80.2216,
    });
    setErrors({});
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = validateSOS(form);
    setErrors(v);
    if (hasErrors(v)) {
      toast.error("Please check the highlighted fields");
      return;
    }
    setBusy(true);
    try {
      const sos = await backend.submitSOS(form);
      setSubmitted(sos);
      toast.success(`Request ${sos.reference} sent`, "The control room has received your SOS.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ValidationError) setErrors(err.fields as FieldErrors<SOSInput>);
      toast.fromError(err, "Could not send SOS");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    const live = state.sos.find((s) => s.id === submitted.id) ?? submitted;
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6 text-center">
          <CircleCheckBig className="mx-auto size-14 text-teal-600" />
          <h1 className="mt-3 text-2xl font-bold text-navy-950">Help request sent</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your reference number is <span className="font-mono text-base font-bold text-navy-950">{live.reference}</span>. Keep your phone
            switched on — a rescue coordinator may call {live.phone}.
          </p>
          <div className="mx-auto mt-6 max-w-lg">
            <SOSStepper status={live.status} />
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link href="/resident/track" className={buttonClass("primary", "lg")}>
              <ClipboardList className="size-4" /> Track my request
            </Link>
            <Link href="/resident/shelters" className={buttonClass("outline", "lg")}>
              <MapPin className="size-4" /> Find nearest shelter
            </Link>
          </div>
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-600">
            <p className="font-semibold text-slate-800">While you wait</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Move to the highest floor or a safe raised place.</li>
              <li>Switch off the main power supply if water is near switches.</li>
              <li>Do not try to wade through fast-flowing water.</li>
            </ul>
          </div>
          <button
            className="mt-4 text-xs font-semibold text-teal-700 hover:underline"
            onClick={() => {
              setSubmitted(null);
              setForm(blank());
            }}
          >
            Send another request
          </button>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4" noValidate>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy-950">
            <Siren className="size-6 text-red-600" /> Emergency SOS
          </h1>
          <p className="mt-1 text-sm text-slate-500">Fill in what you can — only the starred fields are required.</p>
        </div>
        {mode === "demo" && (
          <Button variant="soft" size="sm" onClick={prefillDemo}>
            <Wand className="size-3.5" /> Fill Velachery demo example
          </Button>
        )}
      </div>

      <Card className="space-y-5 p-4 sm:p-5">
        <Field label="What is the emergency?" error={errors.emergencyType} required>
          <ChoiceTiles
            name="Emergency type"
            value={form.emergencyType}
            onChange={(v) => set("emergencyType", v)}
            invalid={!!errors.emergencyType}
            options={(Object.keys(EMERGENCY_TYPE_LABELS) as EmergencyType[]).map((t) => ({ value: t, label: EMERGENCY_TYPE_LABELS[t], icon: TYPE_ICONS[t] }))}
          />
        </Field>

        <Field label="How urgent is it?" error={errors.urgency} required>
          <ChoiceTiles
            name="Urgency"
            value={form.urgency}
            onChange={(v) => set("urgency", v)}
            invalid={!!errors.urgency}
            columns="grid-cols-2 sm:grid-cols-4"
            options={(["critical", "high", "medium", "low"] as Urgency[]).map((u) => ({
              value: u,
              label: URGENCY_LABELS[u],
              description: URGENCY_DESC[u],
              tone: URGENCY_SELECTED[u],
            }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Your name" htmlFor="sos-name" error={errors.name} required>
            <Input id="sos-name" autoComplete="name" value={form.name} invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Mobile number" htmlFor="sos-phone" error={errors.phone} required>
            <Input
              id="sos-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98400 12345"
              value={form.phone}
              invalid={!!errors.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="People needing help" htmlFor="sos-people" error={errors.peopleCount} required>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="sos-people"
                type="number"
                min={1}
                max={500}
                className="pl-9"
                value={Number.isNaN(form.peopleCount) ? "" : form.peopleCount}
                invalid={!!errors.peopleCount}
                onChange={(e) => set("peopleCount", e.target.value === "" ? NaN : Math.floor(Number(e.target.value)))}
              />
            </div>
          </Field>
        </div>

        <LocationPicker
          idPrefix="sos"
          zones={state.zones}
          value={{ zoneId: form.zoneId, lat: form.lat, lng: form.lng }}
          onChange={(loc) => {
            setForm((f) => ({ ...f, ...loc }));
            setErrors((e) => ({ ...e, lat: undefined, zoneId: undefined }));
          }}
          error={errors.lat || errors.zoneId}
        />

        <Field label="Street / landmark" htmlFor="sos-landmark" hint="e.g. house number, street, nearby temple or bus stop">
          <Input id="sos-landmark" value={form.landmark} onChange={(e) => set("landmark", e.target.value)} maxLength={140} />
        </Field>

        <Field
          label="Describe the situation"
          htmlFor="sos-desc"
          error={errors.description}
          required
          hint={`${form.description.length}/600 · water level, injuries, elderly/children, medical needs`}
        >
          <Textarea id="sos-desc" value={form.description} invalid={!!errors.description} onChange={(e) => set("description", e.target.value)} maxLength={600} />
        </Field>
      </Card>

      <div className="sticky bottom-3 z-[400]">
        <Button type="submit" variant="danger" size="xl" className="w-full shadow-xl shadow-red-600/25" loading={busy}>
          <Siren className="size-6" /> Send SOS to control room
        </Button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Sending to: {zoneName(state, form.zoneId)} control room <SimulatedTag label="Demo routing" className="ml-1" />
        </p>
      </div>
    </form>
  );
}
