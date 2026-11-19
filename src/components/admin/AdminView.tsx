"use client";

import { Check, Database, Download, KeyRound, LifeBuoy, Pencil, Plus, RotateCcw, Server, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LocationPicker } from "@/components/common/LocationPicker";
import { TeamStatusBadge } from "@/components/ui/badges";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button, Card, CardHeader, SectionTitle, Segmented } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { ROLE_LABELS, TEAM_STATUS_LABELS, TEAM_TYPE_LABELS } from "@/lib/constants";
import { useReadyData } from "@/lib/data/AppDataProvider";
import { zoneName } from "@/lib/data/selectors";
import { formatDateTime } from "@/lib/format";
import type { RescueTeam, Role, TeamInput, TeamStatus, TeamType, UserInput } from "@/lib/types";
import { type FieldErrors, hasErrors, validateTeam, validateUser, ValidationError } from "@/lib/validation";

type Tab = "users" | "teams" | "system";
const ROLES: Role[] = ["resident", "official", "rescue", "admin"];

export function AdminView() {
  const [tab, setTab] = useState<Tab>("users");
  return (
    <div className="space-y-4">
      <SectionTitle title="Administration" subtitle="Manage users and roles, rescue teams and system data." />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "users", label: "Users & roles" },
          { value: "teams", label: "Rescue teams" },
          { value: "system", label: "Data & security" },
        ]}
      />
      {tab === "users" && <UsersPanel />}
      {tab === "teams" && <TeamsPanel />}
      {tab === "system" && <SystemPanel />}
    </div>
  );
}

/* ---------------- Users ---------------- */

function UsersPanel() {
  const { state, user: me, backend } = useReadyData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const users = state.users.filter((u) => roleFilter === "all" || u.role === roleFilter);

  async function patch(id: string, p: Parameters<typeof backend.updateUser>[1], msg: string) {
    try {
      await backend.updateUser(id, p);
      toast.success(msg);
    } catch (err) {
      toast.fromError(err, "Could not update user");
    }
  }

  return (
    <Card>
      <CardHeader
        title={`Users (${state.users.length})`}
        subtitle="Role changes take effect immediately — they control both navigation and data permissions."
        icon={<Users className="size-4" />}
        action={
          <div className="flex gap-2">
            <Select className="h-8 w-36 text-xs" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")} aria-label="Filter by role">
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={() => setOpen(true)}>
              <UserPlus className="size-3.5" /> Add user
            </Button>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Name</th>
              <th className="px-4 py-2 font-semibold">Contact</th>
              <th className="px-4 py-2 font-semibold">Role</th>
              <th className="px-4 py-2 font-semibold">Team</th>
              <th className="px-4 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-navy-950">
                    {u.name} {u.id === me?.id && <Badge tone="teal">You</Badge>}
                  </p>
                  <p className="text-[11px] text-slate-500">{u.title ?? (u.zoneId ? zoneName(state, u.zoneId) : "")}</p>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-600">
                  <p>{u.email}</p>
                  <p>{u.phone}</p>
                </td>
                <td className="px-4 py-2.5">
                  <Select
                    className="h-8 w-44 text-xs"
                    value={u.role}
                    disabled={u.id === me?.id}
                    aria-label={`Role of ${u.name}`}
                    onChange={(e) => patch(u.id, { role: e.target.value as Role }, `${u.name} is now ${ROLE_LABELS[e.target.value as Role]}`)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-2.5">
                  {u.role === "rescue" ? (
                    <Select
                      className="h-8 w-48 text-xs"
                      value={u.teamId ?? ""}
                      aria-label={`Team of ${u.name}`}
                      onChange={(e) => patch(u.id, { teamId: e.target.value }, "Team updated")}
                    >
                      {state.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <Button
                    size="sm"
                    variant={u.active ? "outline" : "soft"}
                    disabled={u.id === me?.id}
                    onClick={() => patch(u.id, { active: !u.active }, u.active ? `${u.name} deactivated` : `${u.name} re-activated`)}
                  >
                    {u.active ? (
                      <>
                        <Check className="size-3.5 text-teal-600" /> Active
                      </>
                    ) : (
                      <>
                        <X className="size-3.5" /> Inactive
                      </>
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add user">
        {open && <UserForm onDone={() => setOpen(false)} />}
      </Modal>
    </Card>
  );
}

function UserForm({ onDone }: { onDone: () => void }) {
  const { state, backend, mode } = useReadyData();
  const toast = useToast();
  const [form, setForm] = useState<UserInput>({ name: "", email: "", phone: "", role: "official", zoneId: null, teamId: null });
  const [errors, setErrors] = useState<FieldErrors<UserInput>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = validateUser(form);
    setErrors(v);
    if (hasErrors(v)) return;
    setBusy(true);
    try {
      await backend.createUser(form);
      toast.success("User added", mode === "supabase" ? "An invitation email has been sent." : `${form.name} can now be selected in the role switcher.`);
      onDone();
    } catch (err) {
      if (err instanceof ValidationError) setErrors(err.fields as FieldErrors<UserInput>);
      toast.fromError(err, "Could not add user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="Full name" htmlFor="u-name" error={errors.name} required>
        <Input id="u-name" value={form.name} invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Email" htmlFor="u-email" error={errors.email} required>
        <Input id="u-email" type="email" value={form.email} invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Mobile" htmlFor="u-phone" error={errors.phone}>
        <Input id="u-phone" type="tel" value={form.phone} invalid={!!errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role" htmlFor="u-role">
          <Select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role, teamId: e.target.value === "rescue" ? state.teams[0]?.id ?? null : null })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        {form.role === "rescue" ? (
          <Field label="Rescue team" htmlFor="u-team" error={errors.teamId} required>
            <Select id="u-team" value={form.teamId ?? ""} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              {state.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Home locality" htmlFor="u-zone">
            <Select id="u-zone" value={form.zoneId ?? ""} onChange={(e) => setForm({ ...form, zoneId: e.target.value || null })}>
              <option value="">—</option>
              {state.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Add user
        </Button>
      </div>
    </form>
  );
}

/* ---------------- Teams ---------------- */

function TeamsPanel() {
  const { state } = useReadyData();
  const [editing, setEditing] = useState<RescueTeam | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader
        title={`Rescue teams (${state.teams.length})`}
        icon={<LifeBuoy className="size-4" />}
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Add team
          </Button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Team</th>
              <th className="px-4 py-2 font-semibold">Type</th>
              <th className="px-4 py-2 font-semibold">Base</th>
              <th className="px-4 py-2 font-semibold">Members</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.teams.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-navy-950">{t.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {t.agency} · {t.contact}
                  </p>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-700">{TEAM_TYPE_LABELS[t.type]}</td>
                <td className="px-4 py-2.5 text-xs text-slate-700">{zoneName(state, t.baseZoneId)}</td>
                <td className="px-4 py-2.5 tabular">{t.members}</td>
                <td className="px-4 py-2.5">
                  <TeamStatusBadge status={t.status} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(t);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.name}` : "Register rescue team"} size="xl">
        {open && <TeamForm key={editing?.id ?? "new"} team={editing} onDone={() => setOpen(false)} />}
      </Modal>
    </Card>
  );
}

function TeamForm({ team, onDone }: { team: RescueTeam | null; onDone: () => void }) {
  const { state, backend } = useReadyData();
  const toast = useToast();
  const z0 = state.zones[0];
  const [form, setForm] = useState<TeamInput>(
    team ? { ...team } : { name: "", agency: "", type: "general", baseZoneId: z0.id, lat: z0.lat, lng: z0.lng, members: 6, contact: "", status: "available", capabilities: [] },
  );
  const [caps, setCaps] = useState(form.capabilities.join(", "));
  const [errors, setErrors] = useState<FieldErrors<TeamInput>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const input = { ...form, capabilities: caps.split(",").map((c) => c.trim()).filter(Boolean) };
    const v = validateTeam(input);
    setErrors(v);
    if (hasErrors(v)) return;
    setBusy(true);
    try {
      await backend.upsertTeam(input);
      toast.success(team ? "Team updated" : "Team registered", input.name);
      onDone();
    } catch (err) {
      toast.fromError(err, "Could not save team");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2" noValidate>
      <div className="space-y-3">
        <Field label="Team name" htmlFor="t-name" error={errors.name} required>
          <Input id="t-name" value={form.name} invalid={!!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Agency" htmlFor="t-agency" error={errors.agency} required>
          <Input id="t-agency" value={form.agency} invalid={!!errors.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="t-type">
            <Select id="t-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TeamType })}>
              {(Object.keys(TEAM_TYPE_LABELS) as TeamType[]).map((t) => (
                <option key={t} value={t}>
                  {TEAM_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Members" htmlFor="t-members" error={errors.members} required>
            <Input id="t-members" type="number" min={1} value={Number.isNaN(form.members) ? "" : form.members} invalid={!!errors.members} onChange={(e) => setForm({ ...form, members: e.target.value === "" ? NaN : Math.floor(Number(e.target.value)) })} />
          </Field>
          <Field label="Contact" htmlFor="t-contact" error={errors.contact} required>
            <Input id="t-contact" type="tel" value={form.contact} invalid={!!errors.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </Field>
          <Field label="Status" htmlFor="t-status" hint={team?.status === "deployed" ? "Deployed teams stay deployed until their operation is resolved." : undefined}>
            <Select id="t-status" value={form.status} disabled={team?.status === "deployed"} onChange={(e) => setForm({ ...form, status: e.target.value as TeamStatus })}>
              {(Object.keys(TEAM_STATUS_LABELS) as TeamStatus[]).filter((s) => s !== "deployed" || team?.status === "deployed").map((s) => (
                <option key={s} value={s}>
                  {TEAM_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Capabilities" htmlFor="t-caps" hint="Comma separated, e.g. Boat evacuation, First aid">
          <Input id="t-caps" value={caps} onChange={(e) => setCaps(e.target.value)} />
        </Field>
      </div>
      <div className="space-y-3">
        <LocationPicker
          idPrefix="t"
          zones={state.zones}
          value={{ zoneId: form.baseZoneId, lat: form.lat, lng: form.lng }}
          onChange={(loc) => setForm({ ...form, baseZoneId: loc.zoneId, lat: loc.lat, lng: loc.lng })}
          mapHeight="h-64"
        />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {team ? "Save changes" : "Register team"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ---------------- System ---------------- */

function SystemPanel() {
  const { state, backend, mode } = useReadyData();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [health, setHealth] = useState<string | null>(null);

  const counts: [string, number][] = [
    ["Users", state.users.length],
    ["Risk zones", state.zones.length],
    ["Rainfall readings", state.rainfall.length],
    ["SOS requests", state.sos.length],
    ["SOS status events", state.sosEvents.length],
    ["Rescue teams", state.teams.length],
    ["Rescue assignments", state.assignments.length],
    ["Flood reports", state.floodReports.length],
    ["Disaster alerts", state.alerts.length],
    ["Shelters", state.shelters.length],
    ["Shelter facilities", state.shelters.reduce((n, s) => n + s.facilities.length, 0)],
    ["Activity log", state.activity.length],
  ];

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `disaster-shield-data-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function checkHealth() {
    try {
      const res = await fetch("/api/health");
      const body = await res.json();
      setHealth(`API ${body.status} · server data mode: ${body.dataMode} · risk model ${body.riskModel}`);
    } catch {
      setHealth("API unreachable");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Data store" subtitle={mode === "demo" ? "Demo mode — simulated data persisted in this browser" : "Supabase PostgreSQL"} icon={<Database className="size-4" />} />
        <div className="space-y-4 p-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {counts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-dashed border-slate-200 py-1">
                <dt className="text-slate-600">{k}</dt>
                <dd className="font-semibold text-navy-950 tabular">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500">Seeded {formatDateTime(state.meta.seededAt)} · last change {formatDateTime(state.meta.lastUpdated)}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportJson}>
              <Download className="size-3.5" /> Export data (JSON)
            </Button>
            {mode === "demo" && (
              <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
                <RotateCcw className="size-3.5" /> Reset demo data
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={checkHealth}>
              <Server className="size-3.5" /> Check API health
            </Button>
          </div>
          {health && <p className="text-xs font-medium text-teal-700">{health}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Security model" subtitle="How permissions are enforced" icon={<ShieldCheck className="size-4" />} />
        <div className="space-y-2 p-4 text-sm text-slate-700">
          <p className="flex gap-2">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-navy-600" />
            <span>
              <strong>Supabase mode:</strong> Supabase Auth sessions, Row Level Security on every table, and SECURITY DEFINER functions
              (<code className="text-xs">assign_team</code>, <code className="text-xs">update_sos_status</code>) that re-check the caller&apos;s role in
              Postgres. Staff accounts are created through a server route that verifies the caller is an admin.
            </span>
          </p>
          <p className="flex gap-2">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-violet-600" />
            <span>
              <strong>Demo mode:</strong> the same permission matrix is checked on every write in the data layer, but it runs in the browser, so it
              is for demonstration only — not a security boundary.
            </span>
          </p>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-2 text-center font-semibold">
                    {ROLE_LABELS[r].split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(PERMISSIONS) as Permission[]).map((p) => (
                <tr key={p}>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-slate-700">{p}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-2 py-1.5 text-center">
                      {(PERMISSIONS[p] as readonly Role[]).includes(r) ? <Check className="mx-auto size-3.5 text-teal-600" /> : <span className="text-slate-300">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await backend.resetDemoData();
                setConfirm(false);
                toast.success("Demo data reset", "All modules are back to the starting scenario.");
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          All SOS requests, reports, alerts, shelter changes and simulations made in this browser will be replaced with the original sample data.
          This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
