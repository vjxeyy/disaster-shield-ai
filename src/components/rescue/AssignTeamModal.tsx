"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { TeamStatusBadge } from "@/components/ui/badges";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { TEAM_TYPE_LABELS } from "@/lib/constants";
import { useReadyData } from "@/lib/data/AppDataProvider";
import { recommendTeams } from "@/lib/data/selectors";
import { cn } from "@/lib/format";
import type { SOSRequest } from "@/lib/types";

export function AssignTeamModal({ sos, open, onClose }: { sos: SOSRequest | null; open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open && !!sos}
      onClose={onClose}
      title={sos ? `Assign a rescue team to ${sos.reference}` : "Assign team"}
      subtitle="Teams are ranked by availability, capability match and distance to the emergency."
      size="lg"
    >
      {sos && <AssignTeamBody key={sos.id} sos={sos} onDone={onClose} />}
    </Modal>
  );
}

function AssignTeamBody({ sos, onDone }: { sos: SOSRequest; onDone: () => void }) {
  const { state, backend } = useReadyData();
  const toast = useToast();
  const recs = recommendTeams(state, sos);
  const best = recs.find((r) => r.team.status === "available");
  const [teamId, setTeamId] = useState<string | null>(best?.team.id ?? null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function assign() {
    if (!teamId) return;
    setBusy(true);
    try {
      await backend.assignTeam(sos.id, teamId, note);
      const t = state.teams.find((x) => x.id === teamId);
      toast.success(`${t?.name ?? "Team"} assigned`, `${sos.reference} is now Assigned. The resident can see this immediately.`);
      onDone();
    } catch (err) {
      toast.fromError(err, "Assignment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2" role="radiogroup" aria-label="Rescue teams">
        {recs.map((r) => {
          const disabled = r.team.status !== "available";
          const selected = teamId === r.team.id;
          return (
            <li key={r.team.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => setTeamId(r.team.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  selected ? "border-teal-600 bg-teal-50 ring-2 ring-teal-100" : "border-slate-200 hover:border-slate-300",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-teal-600" : "border-slate-300")}>
                  {selected && <span className="size-2.5 rounded-full bg-teal-600" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-navy-950">{r.team.name}</span>
                    {r === best && (
                      <Badge tone="teal">
                        <Sparkles className="size-3" /> Recommended
                      </Badge>
                    )}
                    {r.match && <Badge tone="navy">Capability match</Badge>}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {TEAM_TYPE_LABELS[r.team.type]} · {r.team.members} members · {r.team.capabilities.slice(0, 2).join(", ")}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-navy-950 tabular">{r.km.toFixed(1)} km</span>
                  <TeamStatusBadge status={r.team.status} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Field label="Instruction for the team (optional)" htmlFor="assign-note">
        <Input id="assign-note" value={note} maxLength={200} placeholder="e.g. Approach via 100 Feet Road; boat required" onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="teal" onClick={assign} loading={busy} disabled={!teamId}>
          Assign team
        </Button>
      </div>
    </div>
  );
}
