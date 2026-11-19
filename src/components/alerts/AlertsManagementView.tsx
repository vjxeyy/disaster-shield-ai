"use client";

import { Bot, Megaphone } from "lucide-react";
import { useState } from "react";
import { Button, EmptyState, SectionTitle, Segmented } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { ALERT_LEVEL_RANK } from "@/lib/constants";
import { useNow, useReadyData, useRiskAssessments } from "@/lib/data/AppDataProvider";
import { zoneName, zonesNeedingAlert } from "@/lib/data/selectors";
import type { AlertInput } from "@/lib/types";
import { AlertCard } from "./AlertCard";
import { AlertFormModal, buildRiskAlertDraft } from "./AlertFormModal";

export function AlertsManagementView() {
  const { state, backend } = useReadyData();
  const assessments = useRiskAssessments(state);
  const now = useNow();
  const toast = useToast();
  const [filter, setFilter] = useState<"active" | "withdrawn" | "all">("active");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AlertInput | null>(null);
  const need = zonesNeedingAlert(state, assessments);

  const list = state.alerts
    .filter((a) => (filter === "all" ? true : filter === "active" ? a.active : !a.active))
    .sort((a, b) => Number(b.active) - Number(a.active) || ALERT_LEVEL_RANK[b.level] - ALERT_LEVEL_RANK[a.level] || b.issuedAt.localeCompare(a.issuedAt));

  async function toggle(id: string, active: boolean) {
    try {
      await backend.setAlertActive(id, active);
      toast.success(active ? "Alert re-activated" : "Alert withdrawn");
    } catch (err) {
      toast.fromError(err, "Could not update alert");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionTitle
        title="Alerts & Warnings"
        subtitle="Public warnings are shown instantly in the resident portal for the selected localities."
        action={
          <Button
            onClick={() => {
              setDraft(null);
              setOpen(true);
            }}
          >
            <Megaphone className="size-4" /> Issue alert
          </Button>
        }
      />

      {need.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-navy-200 bg-navy-50 p-4 sm:flex-row sm:items-center">
          <Bot className="size-6 shrink-0 text-navy-700" />
          <p className="flex-1 text-sm text-navy-900">
            <strong>Risk engine recommendation:</strong> {need.map((id) => zoneName(state, id)).join(", ")} {need.length > 1 ? "are" : "is"} at HIGH risk
            with no red alert in force. Review and issue a warning.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setDraft(buildRiskAlertDraft(need.map((id) => zoneName(state, id)), need));
              setOpen(true);
            }}
          >
            Review draft red alert
          </Button>
        </div>
      )}

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "active", label: "Active", count: state.alerts.filter((a) => a.active).length },
          { value: "withdrawn", label: "Withdrawn", count: state.alerts.filter((a) => !a.active).length },
          { value: "all", label: "All", count: state.alerts.length },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-5" />} title="No alerts in this list" />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              state={state}
              now={now}
              actions={
                a.active ? (
                  <Button size="sm" variant="outline" onClick={() => toggle(a.id, false)}>
                    Withdraw alert
                  </Button>
                ) : (
                  <Button size="sm" variant="soft" onClick={() => toggle(a.id, true)}>
                    Re-activate
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}

      <AlertFormModal open={open} onClose={() => setOpen(false)} initial={draft} />
    </div>
  );
}
