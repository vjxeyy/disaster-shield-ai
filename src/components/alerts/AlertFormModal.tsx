"use client";

import { Plus, Trash } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AlertLevelBadge } from "@/components/ui/badges";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { ALERT_LEVEL_LABELS, APP_NAME, DEFAULT_SAFETY_INSTRUCTIONS } from "@/lib/constants";
import { useReadyData } from "@/lib/data/AppDataProvider";
import { cn } from "@/lib/format";
import type { AlertInput, AlertLevel } from "@/lib/types";
import { type FieldErrors, hasErrors, validateAlert } from "@/lib/validation";

export function buildRiskAlertDraft(zoneNames: string[], zoneIds: string[]): AlertInput {
  const where = zoneNames.join(", ");
  return {
    title: `Flood warning: ${where}`,
    message: `The ${APP_NAME} risk engine rates ${where} as HIGH flood risk based on very heavy rainfall and ground reports (simulated scenario). Residents of low-lying streets should prepare to move to relief shelters.`,
    level: "red",
    zoneIds,
    instructions: [
      "Move to the nearest open relief shelter if water enters your home.",
      ...DEFAULT_SAFETY_INSTRUCTIONS.slice(1),
    ],
    source: "risk_engine",
  };
}

export function AlertFormModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: AlertInput | null;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Issue public alert" subtitle="Residents in the selected localities see this immediately in the resident portal." size="lg">
      {open && <AlertForm key={JSON.stringify(initial ?? {})} initial={initial ?? undefined} onDone={onClose} />}
    </Modal>
  );
}

function AlertForm({ initial, onDone }: { initial?: AlertInput; onDone: () => void }) {
  const { state, backend } = useReadyData();
  const toast = useToast();
  const [form, setForm] = useState<AlertInput>(
    initial ?? { title: "", message: "", level: "orange", zoneIds: [], instructions: [...DEFAULT_SAFETY_INSTRUCTIONS.slice(0, 3)] },
  );
  const [errors, setErrors] = useState<FieldErrors<AlertInput>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = validateAlert(form);
    setErrors(v);
    if (hasErrors(v)) return;
    setBusy(true);
    try {
      await backend.createAlert(form);
      toast.success("Alert issued", `${ALERT_LEVEL_LABELS[form.level].name} alert is now visible to residents.`);
      onDone();
    } catch (err) {
      toast.fromError(err, "Could not issue alert");
    } finally {
      setBusy(false);
    }
  }

  const toggleZone = (id: string) =>
    setForm((f) => ({ ...f, zoneIds: f.zoneIds.includes(id) ? f.zoneIds.filter((z) => z !== id) : [...f.zoneIds, id] }));

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Warning level" required>
        <div className="flex flex-wrap gap-2">
          {(["yellow", "orange", "red"] as AlertLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setForm({ ...form, level: lvl })}
              className={cn("rounded-lg border-2 p-1 transition-colors", form.level === lvl ? "border-navy-900" : "border-transparent opacity-60 hover:opacity-100")}
              aria-pressed={form.level === lvl}
            >
              <AlertLevelBadge level={lvl} />
            </button>
          ))}
        </div>
      </Field>
      <Field label="Title" htmlFor="al-title" error={errors.title} required>
        <Input id="al-title" value={form.title} invalid={!!errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
      </Field>
      <Field label="Message" htmlFor="al-msg" error={errors.message} required>
        <Textarea id="al-msg" value={form.message} invalid={!!errors.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={600} />
      </Field>
      <Field label="Affected localities" error={errors.zoneIds} required>
        <div className="flex flex-wrap gap-1.5">
          {state.zones.map((z) => {
            const on = form.zoneIds.includes(z.id);
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => toggleZone(z.id)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  on ? "border-navy-900 bg-navy-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                )}
              >
                {z.name}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Safety instructions" error={errors.instructions} required>
        <div className="space-y-2">
          {form.instructions.map((ins, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={ins}
                onChange={(e) => setForm({ ...form, instructions: form.instructions.map((x, j) => (j === i ? e.target.value : x)) })}
                aria-label={`Instruction ${i + 1}`}
              />
              <Button
                variant="ghost"
                size="md"
                onClick={() => setForm({ ...form, instructions: form.instructions.filter((_, j) => j !== i) })}
                aria-label="Remove instruction"
              >
                <Trash className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setForm({ ...form, instructions: [...form.instructions, ""] })}>
            <Plus className="size-3.5" /> Add instruction
          </Button>
        </div>
      </Field>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant={form.level === "red" ? "danger" : "primary"} loading={busy}>
          Issue alert
        </Button>
      </div>
    </form>
  );
}
