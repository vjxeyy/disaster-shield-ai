"use client";

import { Minus, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LocationPicker } from "@/components/common/LocationPicker";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { Button, ProgressBar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { ALL_FACILITIES, FACILITY_LABELS, SHELTER_STATUS_LABELS } from "@/lib/constants";
import { useReadyData } from "@/lib/data/AppDataProvider";
import { cn } from "@/lib/format";
import type { Shelter, ShelterInput, ShelterStatus } from "@/lib/types";
import { type FieldErrors, hasErrors, validateShelter, ValidationError } from "@/lib/validation";
import { FACILITY_ICONS } from "./FacilityIcons";

/* ---------------- Occupancy update (officials + admins) ---------------- */

export function OccupancyModal({ shelter, onClose }: { shelter: Shelter | null; onClose: () => void }) {
  return (
    <Modal open={!!shelter} onClose={onClose} title={shelter ? `Update occupancy — ${shelter.name}` : ""} subtitle="Residents and the dashboard see the new capacity immediately.">
      {shelter && <OccupancyBody key={shelter.id} shelter={shelter} onDone={onClose} />}
    </Modal>
  );
}

function OccupancyBody({ shelter, onDone }: { shelter: Shelter; onDone: () => void }) {
  const { backend } = useReadyData();
  const toast = useToast();
  const [occupied, setOccupied] = useState(shelter.occupied);
  const [status, setStatus] = useState<ShelterStatus>(shelter.status);
  const [busy, setBusy] = useState(false);
  const error = !Number.isInteger(occupied) || occupied < 0 ? "Enter 0 or more." : occupied > shelter.capacity ? `Cannot exceed capacity (${shelter.capacity}).` : null;

  async function save() {
    if (error) return;
    setBusy(true);
    try {
      await backend.updateShelterOccupancy(shelter.id, occupied, status);
      toast.success("Shelter updated", `${shelter.capacity - occupied} places now available.`);
      onDone();
    } catch (err) {
      toast.fromError(err, "Could not update shelter");
    } finally {
      setBusy(false);
    }
  }

  const step = (d: number) => setOccupied((o) => Math.max(0, Math.min(shelter.capacity, (Number.isFinite(o) ? o : 0) + d)));

  return (
    <div className="space-y-4">
      <Field label={`People currently sheltered (capacity ${shelter.capacity})`} htmlFor="occ" error={error ?? undefined}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => step(-10)} aria-label="Decrease by 10">
            <Minus className="size-4" />
            10
          </Button>
          <Input
            id="occ"
            type="number"
            min={0}
            max={shelter.capacity}
            className="text-center text-lg font-bold"
            value={Number.isNaN(occupied) ? "" : occupied}
            invalid={!!error}
            onChange={(e) => setOccupied(e.target.value === "" ? NaN : Math.floor(Number(e.target.value)))}
          />
          <Button variant="outline" onClick={() => step(10)} aria-label="Increase by 10">
            <Plus className="size-4" />
            10
          </Button>
        </div>
      </Field>
      <ProgressBar value={Number.isFinite(occupied) ? occupied : 0} max={shelter.capacity} tone={occupied >= shelter.capacity ? "red" : "teal"} />
      <p className="text-sm text-slate-600">
        Available: <strong className="text-navy-950">{Number.isFinite(occupied) ? Math.max(0, shelter.capacity - occupied) : "—"}</strong> places
      </p>
      <Field label="Availability" htmlFor="occ-status" hint="Full is set automatically when occupancy reaches capacity.">
        <Select id="occ-status" value={status} onChange={(e) => setStatus(e.target.value as ShelterStatus)}>
          {(Object.keys(SHELTER_STATUS_LABELS) as ShelterStatus[]).map((s) => (
            <option key={s} value={s}>
              {SHELTER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="teal" onClick={save} loading={busy} disabled={!!error}>
          Save
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Add / edit shelter (admins) ---------------- */

export function ShelterFormModal({ open, shelter, onClose }: { open: boolean; shelter: Shelter | null; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={shelter ? `Edit shelter — ${shelter.name}` : "Register a new relief shelter"} size="xl">
      {open && <ShelterForm key={shelter?.id ?? "new"} shelter={shelter} onDone={onClose} />}
    </Modal>
  );
}

function ShelterForm({ shelter, onDone }: { shelter: Shelter | null; onDone: () => void }) {
  const { state, backend } = useReadyData();
  const toast = useToast();
  const z0 = state.zones[0];
  const [form, setForm] = useState<ShelterInput>(
    shelter
      ? { ...shelter }
      : { name: "", address: "", zoneId: z0.id, lat: z0.lat, lng: z0.lng, capacity: 200, occupied: 0, status: "open", contact: "", facilities: ["water", "food", "first_aid"] },
  );
  const [errors, setErrors] = useState<FieldErrors<ShelterInput>>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ShelterInput>(k: K, v: ShelterInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = validateShelter(form);
    setErrors(v);
    if (hasErrors(v)) return;
    setBusy(true);
    try {
      await backend.upsertShelter(form);
      toast.success(shelter ? "Shelter updated" : "Shelter registered", form.name);
      onDone();
    } catch (err) {
      if (err instanceof ValidationError) setErrors(err.fields as FieldErrors<ShelterInput>);
      toast.fromError(err, "Could not save shelter");
    } finally {
      setBusy(false);
    }
  }

  const num = (v: string) => (v === "" ? NaN : Math.floor(Number(v)));

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2" noValidate>
      <div className="space-y-4">
        <Field label="Shelter name" htmlFor="sh-name" error={errors.name} required>
          <Input id="sh-name" value={form.name} invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Address" htmlFor="sh-addr" error={errors.address} required>
          <Input id="sh-addr" value={form.address} invalid={!!errors.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total capacity" htmlFor="sh-cap" error={errors.capacity} required>
            <Input id="sh-cap" type="number" min={1} value={Number.isNaN(form.capacity) ? "" : form.capacity} invalid={!!errors.capacity} onChange={(e) => set("capacity", num(e.target.value))} />
          </Field>
          <Field label="Currently occupied" htmlFor="sh-occ" error={errors.occupied} required>
            <Input id="sh-occ" type="number" min={0} value={Number.isNaN(form.occupied) ? "" : form.occupied} invalid={!!errors.occupied} onChange={(e) => set("occupied", num(e.target.value))} />
          </Field>
          <Field label="Availability" htmlFor="sh-status">
            <Select id="sh-status" value={form.status} onChange={(e) => set("status", e.target.value as ShelterStatus)}>
              {(Object.keys(SHELTER_STATUS_LABELS) as ShelterStatus[]).map((s) => (
                <option key={s} value={s}>
                  {SHELTER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Contact number" htmlFor="sh-contact" error={errors.contact}>
            <Input id="sh-contact" type="tel" value={form.contact} invalid={!!errors.contact} onChange={(e) => set("contact", e.target.value)} />
          </Field>
        </div>
        <Field label="Available facilities">
          <div className="grid grid-cols-2 gap-2">
            {ALL_FACILITIES.map((f) => {
              const Icon = FACILITY_ICONS[f];
              const on = form.facilities.includes(f);
              return (
                <label
                  key={f}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors",
                    on ? "border-teal-600 bg-teal-50 text-teal-900" : "border-slate-200 text-slate-700 hover:border-slate-300",
                  )}
                >
                  <input
                    type="checkbox"
                    className="accent-teal-600"
                    checked={on}
                    onChange={() => set("facilities", on ? form.facilities.filter((x) => x !== f) : [...form.facilities, f])}
                  />
                  <Icon className="size-3.5" />
                  {FACILITY_LABELS[f]}
                </label>
              );
            })}
          </div>
        </Field>
      </div>
      <div className="space-y-4">
        <LocationPicker
          idPrefix="sh"
          zones={state.zones}
          value={{ zoneId: form.zoneId, lat: form.lat, lng: form.lng }}
          onChange={(loc) => setForm((f) => ({ ...f, ...loc }))}
          error={errors.lat}
          mapHeight="h-72"
        />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {shelter ? "Save changes" : "Register shelter"}
          </Button>
        </div>
      </div>
    </form>
  );
}
