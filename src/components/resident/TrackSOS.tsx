"use client";

import { ClipboardList, Search, Siren } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { SOSStepper, SOSTimeline } from "@/components/sos/SOSTimeline";
import { SOSStatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { Field, Input } from "@/components/ui/form";
import { Button, buttonClass, Card, EmptyState } from "@/components/ui/primitives";
import { EMERGENCY_TYPE_LABELS } from "@/lib/constants";
import { useNow, useReadyData } from "@/lib/data/AppDataProvider";
import { zoneName } from "@/lib/data/selectors";
import { timeAgo } from "@/lib/format";
import type { AppState, SOSRequest } from "@/lib/types";

export function TrackSOS() {
  const { state, user, backend } = useReadyData();
  const now = useNow();
  const mine = state.sos.filter((s) => s.residentId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [lookup, setLookup] = useState({ reference: "", phone: "" });
  const [lookupResult, setLookupResult] = useState<SOSRequest | null | "none">(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    setLookupError(null);
    if (!lookup.reference.trim()) return setLookupError("Enter the reference number, e.g. SOS-1042.");
    setBusy(true);
    try {
      const r = await backend.trackSOS(lookup.reference, lookup.phone);
      setLookupResult(r ?? "none");
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  // live version of the looked-up request (updates as rescuers change status)
  const found = lookupResult && lookupResult !== "none" ? state.sos.find((s) => s.id === lookupResult.id) ?? lookupResult : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Track my SOS</h1>
        <p className="mt-1 text-sm text-slate-500">Status updates appear here automatically as the rescue team progresses.</p>
      </div>

      {mine.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title="You have not sent any SOS requests"
            description="If you or someone near you needs urgent help, send an SOS. You can track it here."
            action={
              <Link href="/resident/sos" className={buttonClass("danger")}>
                <Siren className="size-4" /> Send SOS
              </Link>
            }
          />
        </Card>
      ) : (
        mine.map((s) => <RequestCard key={s.id} sos={s} now={now} state={state} />)
      )}

      <Card className="p-4">
        <form onSubmit={search} className="space-y-3">
          <p className="text-sm font-semibold text-navy-950">Track a request by reference number</p>
          <p className="text-xs text-slate-500">For requests made by phone or on behalf of someone else.</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Reference" htmlFor="tr-ref">
              <Input id="tr-ref" placeholder="SOS-1041" value={lookup.reference} onChange={(e) => setLookup({ ...lookup, reference: e.target.value })} />
            </Field>
            <Field label="Mobile number used" htmlFor="tr-phone">
              <Input id="tr-phone" type="tel" placeholder="90000 20002" value={lookup.phone} onChange={(e) => setLookup({ ...lookup, phone: e.target.value })} />
            </Field>
            <Button type="submit" loading={busy}>
              <Search className="size-4" /> Track
            </Button>
          </div>
          {lookupError && <p className="text-xs font-medium text-red-600">{lookupError}</p>}
          {lookupResult === "none" && <p className="text-xs text-slate-600">No request matches that reference and mobile number.</p>}
        </form>
        {found && (
          <div className="mt-4">
            <RequestCard sos={found} now={now} state={state} />
          </div>
        )}
      </Card>
    </div>
  );
}

function RequestCard({ sos, now, state }: { sos: SOSRequest; now: number; state: AppState }) {
  return (
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="font-mono text-base font-bold text-navy-950">{sos.reference}</p>
            <p className="text-xs text-slate-500">
              {EMERGENCY_TYPE_LABELS[sos.emergencyType]} · {zoneName(state, sos.zoneId)} · sent {timeAgo(sos.createdAt, now)}
            </p>
          </div>
          <div className="flex gap-1.5">
            <UrgencyBadge urgency={sos.urgency} />
            <SOSStatusBadge status={sos.status} />
          </div>
        </div>
        <div className="space-y-5 p-4">
          <SOSStepper status={sos.status} />
          <SOSTimeline state={state} sos={sos} />
        </div>
      </Card>
  );
}
