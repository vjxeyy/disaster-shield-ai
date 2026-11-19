/**
 * Pure state transitions for the demo data layer.
 * Every mutation: (1) authorises the actor, (2) validates input, (3) returns a new AppState.
 * The Supabase backend performs the equivalent operations in Postgres (RLS + RPC functions).
 */
import { authorize, AuthorizationError, canUpdateSOS } from "../auth/permissions";
import { EMERGENCY_TYPE_LABELS, SOS_STATUS_LABELS, SOS_STATUS_ORDER } from "../constants";
import { uid } from "../format";
import type {
  ActivityEvent,
  AlertInput,
  AppState,
  DisasterAlert,
  FloodReport,
  FloodReportInput,
  RainfallInput,
  ReportStatus,
  RescueTeam,
  SOSInput,
  SOSRequest,
  SOSStatus,
  Shelter,
  ShelterInput,
  ShelterStatus,
  TeamInput,
  TeamStatus,
  UserInput,
  UserProfile,
} from "../types";
import {
  hasErrors,
  validateAlert,
  validateFloodReport,
  validateSOS,
  validateShelter,
  validateTeam,
  validateUser,
  ValidationError,
} from "../validation";

type Result<T> = { state: AppState; result: T };

const zoneName = (s: AppState, id?: string | null) => s.zones.find((z) => z.id === id)?.name ?? "Chennai";

function log(
  state: AppState,
  now: string,
  type: ActivityEvent["type"],
  message: string,
  severity: ActivityEvent["severity"] = "info",
  zoneId: string | null = null,
): ActivityEvent[] {
  return [{ id: uid("ac"), type, message, severity, zoneId, createdAt: now }, ...state.activity].slice(0, 200);
}

function touch(state: AppState, now: string): AppState {
  return { ...state, meta: { ...state.meta, lastUpdated: now } };
}

/* ---------------- SOS ---------------- */

export function submitSOS(state: AppState, actor: UserProfile | null, input: SOSInput, now: string): Result<SOSRequest> {
  authorize(actor, "sos:create");
  const errors = validateSOS(input);
  if (hasErrors(errors)) throw new ValidationError(errors);

  const maxRef = state.sos.reduce((m, s) => Math.max(m, Number(s.reference.replace(/\D/g, "")) || 0), 1040);
  const reference = `SOS-${maxRef + 1}`;
  const sos: SOSRequest = {
    id: uid("sos"),
    reference,
    residentId: actor.role === "resident" ? actor.id : null,
    name: input.name.trim(),
    phone: input.phone.trim(),
    emergencyType: input.emergencyType,
    urgency: input.urgency,
    description: input.description.trim(),
    peopleCount: input.peopleCount,
    zoneId: input.zoneId,
    landmark: input.landmark.trim(),
    lat: input.lat,
    lng: input.lng,
    status: "submitted",
    assignedTeamId: null,
    createdAt: now,
    updatedAt: now,
  };
  const via = actor.role === "resident" ? "Request received via resident portal." : `Logged by ${actor.name} (control room).`;
  const next: AppState = {
    ...state,
    sos: [sos, ...state.sos],
    sosEvents: [...state.sosEvents, { id: uid("ev"), sosId: sos.id, status: "submitted", note: via, actorName: actor.name, createdAt: now }],
    activity: log(
      state,
      now,
      "sos",
      `New SOS ${reference} (${EMERGENCY_TYPE_LABELS[sos.emergencyType].toLowerCase()}) from ${zoneName(state, sos.zoneId)}`,
      sos.urgency === "critical" || sos.urgency === "high" ? "critical" : "warning",
      sos.zoneId,
    ),
  };
  return { state: touch(next, now), result: sos };
}

export function assignTeam(state: AppState, actor: UserProfile | null, sosId: string, teamId: string, note: string, now: string): Result<void> {
  authorize(actor, "sos:assign");
  const sos = state.sos.find((s) => s.id === sosId);
  const team = state.teams.find((t) => t.id === teamId);
  if (!sos) throw new ValidationError({ sos: "SOS request not found." });
  if (!team) throw new ValidationError({ team: "Rescue team not found." });
  if (sos.status === "resolved") throw new ValidationError({ sos: "This request is already resolved." });
  if (team.status !== "available") throw new ValidationError({ team: `${team.name} is not available (${team.status}).` });

  const previousTeamId = sos.assignedTeamId;
  const updatedSOS: SOSRequest = { ...sos, status: "assigned", assignedTeamId: teamId, updatedAt: now };
  const next: AppState = {
    ...state,
    sos: state.sos.map((s) => (s.id === sosId ? updatedSOS : s)),
    teams: state.teams.map((t) => {
      if (t.id === teamId) return { ...t, status: "deployed" as TeamStatus };
      if (previousTeamId && t.id === previousTeamId) return { ...t, status: "available" as TeamStatus };
      return t;
    }),
    assignments: [
      { id: uid("as"), sosId, teamId, assignedByName: actor.name, assignedAt: now, status: "active" as const },
      ...state.assignments.map((a) => (a.sosId === sosId && a.status === "active" ? { ...a, status: "cancelled" as const, completedAt: now } : a)),
    ],
    sosEvents: [
      ...state.sosEvents,
      { id: uid("ev"), sosId, status: "assigned", note: note.trim() || `Assigned to ${team.name}.`, actorName: actor.name, createdAt: now },
    ],
    activity: log(state, now, "assignment", `${team.name} assigned to ${sos.reference}`, "info", sos.zoneId),
  };
  return { state: touch(next, now), result: undefined };
}

export function updateSOSStatus(state: AppState, actor: UserProfile | null, sosId: string, status: SOSStatus, note: string, now: string): Result<void> {
  authorize(actor, "sos:update_status");
  const sos = state.sos.find((s) => s.id === sosId);
  if (!sos) throw new ValidationError({ sos: "SOS request not found." });
  if (!canUpdateSOS(actor, sos)) throw new AuthorizationError("Rescue teams can only update requests assigned to their own team.");
  if (status === "assigned" || status === "submitted") throw new ValidationError({ status: "Use team assignment to change this status." });
  if (!sos.assignedTeamId) throw new ValidationError({ status: "Assign a rescue team before updating progress." });
  if (SOS_STATUS_ORDER.indexOf(status) <= SOS_STATUS_ORDER.indexOf(sos.status))
    throw new ValidationError({ status: `Request is already ${SOS_STATUS_LABELS[sos.status]}.` });

  const team = state.teams.find((t) => t.id === sos.assignedTeamId);
  const next: AppState = {
    ...state,
    sos: state.sos.map((s) => (s.id === sosId ? { ...s, status, updatedAt: now } : s)),
    teams:
      status === "resolved"
        ? state.teams.map((t) => (t.id === sos.assignedTeamId ? { ...t, status: "available" as TeamStatus } : t))
        : state.teams,
    assignments:
      status === "resolved"
        ? state.assignments.map((a) => (a.sosId === sosId && a.status === "active" ? { ...a, status: "completed" as const, completedAt: now } : a))
        : state.assignments,
    sosEvents: [
      ...state.sosEvents,
      {
        id: uid("ev"),
        sosId,
        status,
        note: note.trim() || (status === "in_progress" ? `${team?.name ?? "Rescue team"} is on the way / on site.` : "Operation completed."),
        actorName: actor.name,
        createdAt: now,
      },
    ],
    activity: log(
      state,
      now,
      "status",
      `${sos.reference} is now ${SOS_STATUS_LABELS[status]}${team ? ` (${team.name})` : ""}`,
      "info",
      sos.zoneId,
    ),
  };
  return { state: touch(next, now), result: undefined };
}

/* ---------------- Flood reports ---------------- */

export function submitFloodReport(state: AppState, actor: UserProfile | null, input: FloodReportInput, now: string): Result<FloodReport> {
  authorize(actor, "report:create");
  const errors = validateFloodReport(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  const report: FloodReport = {
    id: uid("fr"),
    reporterId: actor.id,
    reporterName: input.reporterName.trim(),
    contact: input.contact?.trim() || undefined,
    zoneId: input.zoneId,
    roadName: input.roadName.trim(),
    description: input.description.trim(),
    severity: input.severity,
    waterDepthCm: input.waterDepthCm ?? null,
    lat: input.lat,
    lng: input.lng,
    path: null,
    status: actor.role === "official" || actor.role === "admin" ? "verified" : "reported",
    createdAt: now,
  };
  const next: AppState = {
    ...state,
    floodReports: [report, ...state.floodReports],
    activity: log(
      state,
      now,
      "report",
      `Flooded road reported: ${report.roadName}, ${zoneName(state, report.zoneId)} (${report.severity})`,
      report.severity === "severe" ? "critical" : "warning",
      report.zoneId,
    ),
  };
  return { state: touch(next, now), result: report };
}

export function setFloodReportStatus(state: AppState, actor: UserProfile | null, id: string, status: ReportStatus, now: string): Result<void> {
  authorize(actor, "report:verify");
  const report = state.floodReports.find((r) => r.id === id);
  if (!report) throw new ValidationError({ report: "Report not found." });
  const next: AppState = {
    ...state,
    floodReports: state.floodReports.map((r) => (r.id === id ? { ...r, status } : r)),
    activity: log(state, now, "report", `Report "${report.roadName}" marked ${status}`, "info", report.zoneId),
  };
  return { state: touch(next, now), result: undefined };
}

/* ---------------- Alerts ---------------- */

export function createAlert(state: AppState, actor: UserProfile | null, input: AlertInput, now: string): Result<DisasterAlert> {
  authorize(actor, "alert:manage");
  const errors = validateAlert(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  const alert: DisasterAlert = {
    id: uid("al"),
    title: input.title.trim(),
    message: input.message.trim(),
    level: input.level,
    zoneIds: input.zoneIds,
    instructions: input.instructions.map((i) => i.trim()).filter(Boolean),
    issuedAt: now,
    issuedByName: actor.name,
    source: input.source ?? "official",
    active: true,
  };
  const next: AppState = {
    ...state,
    alerts: [alert, ...state.alerts],
    activity: log(
      state,
      now,
      "alert",
      `${input.level[0].toUpperCase()}${input.level.slice(1)} alert issued: ${alert.title}`,
      input.level === "red" ? "critical" : "warning",
      input.zoneIds.length === 1 ? input.zoneIds[0] : null,
    ),
  };
  return { state: touch(next, now), result: alert };
}

export function setAlertActive(state: AppState, actor: UserProfile | null, id: string, active: boolean, now: string): Result<void> {
  authorize(actor, "alert:manage");
  const alert = state.alerts.find((a) => a.id === id);
  if (!alert) throw new ValidationError({ alert: "Alert not found." });
  const next: AppState = {
    ...state,
    alerts: state.alerts.map((a) => (a.id === id ? { ...a, active } : a)),
    activity: log(state, now, "alert", `Alert "${alert.title}" ${active ? "re-activated" : "withdrawn"}`, "info"),
  };
  return { state: touch(next, now), result: undefined };
}

/* ---------------- Shelters ---------------- */

export function upsertShelter(state: AppState, actor: UserProfile | null, input: ShelterInput, now: string): Result<Shelter> {
  authorize(actor, "shelter:manage");
  const errors = validateShelter(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  const existing = input.id ? state.shelters.find((s) => s.id === input.id) : undefined;
  const shelter: Shelter = {
    id: existing?.id ?? uid("sh"),
    name: input.name.trim(),
    address: input.address.trim(),
    zoneId: input.zoneId,
    lat: input.lat,
    lng: input.lng,
    capacity: input.capacity,
    occupied: input.occupied,
    status: input.occupied >= input.capacity && input.status === "open" ? "full" : input.status,
    contact: input.contact.trim(),
    facilities: input.facilities,
    updatedAt: now,
  };
  const next: AppState = {
    ...state,
    shelters: existing ? state.shelters.map((s) => (s.id === shelter.id ? shelter : s)) : [...state.shelters, shelter],
    activity: log(state, now, "shelter", `${existing ? "Shelter updated" : "New shelter registered"}: ${shelter.name}`, "info", shelter.zoneId),
  };
  return { state: touch(next, now), result: shelter };
}

export function updateShelterOccupancy(
  state: AppState,
  actor: UserProfile | null,
  id: string,
  occupied: number,
  status: ShelterStatus,
  now: string,
): Result<void> {
  authorize(actor, "shelter:update_occupancy");
  const shelter = state.shelters.find((s) => s.id === id);
  if (!shelter) throw new ValidationError({ shelter: "Shelter not found." });
  if (!Number.isInteger(occupied) || occupied < 0) throw new ValidationError({ occupied: "Occupied must be 0 or more." });
  if (occupied > shelter.capacity) throw new ValidationError({ occupied: `Occupied cannot exceed capacity (${shelter.capacity}).` });
  const finalStatus: ShelterStatus = status === "open" && occupied >= shelter.capacity ? "full" : status === "full" && occupied < shelter.capacity ? "open" : status;
  const next: AppState = {
    ...state,
    shelters: state.shelters.map((s) => (s.id === id ? { ...s, occupied, status: finalStatus, updatedAt: now } : s)),
    activity: log(
      state,
      now,
      "shelter",
      `${shelter.name}: ${occupied}/${shelter.capacity} occupied (${finalStatus})`,
      finalStatus === "full" ? "warning" : "info",
      shelter.zoneId,
    ),
  };
  return { state: touch(next, now), result: undefined };
}

export function deleteShelter(state: AppState, actor: UserProfile | null, id: string, now: string): Result<void> {
  authorize(actor, "shelter:manage");
  const shelter = state.shelters.find((s) => s.id === id);
  if (!shelter) throw new ValidationError({ shelter: "Shelter not found." });
  const next: AppState = {
    ...state,
    shelters: state.shelters.filter((s) => s.id !== id),
    activity: log(state, now, "shelter", `Shelter removed: ${shelter.name}`, "info", shelter.zoneId),
  };
  return { state: touch(next, now), result: undefined };
}

/* ---------------- Rescue teams ---------------- */

export function upsertTeam(state: AppState, actor: UserProfile | null, input: TeamInput, now: string): Result<RescueTeam> {
  authorize(actor, "team:manage");
  const errors = validateTeam(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  const existing = input.id ? state.teams.find((t) => t.id === input.id) : undefined;
  const team: RescueTeam = {
    id: existing?.id ?? uid("team"),
    name: input.name.trim(),
    agency: input.agency.trim(),
    type: input.type,
    baseZoneId: input.baseZoneId,
    lat: input.lat,
    lng: input.lng,
    members: input.members,
    contact: input.contact.trim(),
    status: existing?.status === "deployed" ? "deployed" : input.status,
    capabilities: input.capabilities.map((c) => c.trim()).filter(Boolean),
  };
  const next: AppState = {
    ...state,
    teams: existing ? state.teams.map((t) => (t.id === team.id ? team : t)) : [...state.teams, team],
    activity: log(state, now, "team", `${existing ? "Rescue team updated" : "Rescue team registered"}: ${team.name}`, "info", team.baseZoneId),
  };
  return { state: touch(next, now), result: team };
}

export function setTeamStatus(state: AppState, actor: UserProfile | null, id: string, status: TeamStatus, now: string): Result<void> {
  authorize(actor, "team:update_status");
  const team = state.teams.find((t) => t.id === id);
  if (!team) throw new ValidationError({ team: "Team not found." });
  const hasActive = state.assignments.some((a) => a.teamId === id && a.status === "active");
  if (hasActive && status !== "deployed") throw new ValidationError({ team: "Team has an active assignment; resolve it first." });
  const next: AppState = {
    ...state,
    teams: state.teams.map((t) => (t.id === id ? { ...t, status } : t)),
    activity: log(state, now, "team", `${team.name} marked ${status.replace("_", " ")}`, "info", team.baseZoneId),
  };
  return { state: touch(next, now), result: undefined };
}

/* ---------------- Users ---------------- */

export function createUser(state: AppState, actor: UserProfile | null, input: UserInput, now: string): Result<UserProfile> {
  authorize(actor, "users:manage");
  const errors = validateUser(input);
  if (hasErrors(errors)) throw new ValidationError(errors);
  if (state.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase()))
    throw new ValidationError({ email: "A user with this email already exists." });
  const user: UserProfile = {
    id: uid("u"),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    role: input.role,
    zoneId: input.zoneId ?? null,
    teamId: input.role === "rescue" ? (input.teamId ?? null) : null,
    active: true,
    createdAt: now,
  };
  const next: AppState = {
    ...state,
    users: [...state.users, user],
    activity: log(state, now, "system", `User added: ${user.name} (${user.role})`, "info"),
  };
  return { state: touch(next, now), result: user };
}

export function updateUser(
  state: AppState,
  actor: UserProfile | null,
  id: string,
  patch: Partial<Pick<UserProfile, "role" | "active" | "teamId">>,
  now: string,
): Result<void> {
  authorize(actor, "users:manage");
  const user = state.users.find((u) => u.id === id);
  if (!user) throw new ValidationError({ user: "User not found." });
  if (id === actor.id && ((patch.role && patch.role !== "admin") || patch.active === false))
    throw new ValidationError({ user: "You cannot remove your own administrator access." });
  const role = patch.role ?? user.role;
  const teamId = role === "rescue" ? (patch.teamId !== undefined ? patch.teamId : user.teamId) ?? state.teams[0]?.id ?? null : null;
  const next: AppState = {
    ...state,
    users: state.users.map((u) => (u.id === id ? { ...u, ...patch, role, teamId } : u)),
    activity: log(state, now, "system", `User updated: ${user.name}`, "info"),
  };
  return { state: touch(next, now), result: undefined };
}

/* ---------------- Rainfall / simulation ---------------- */

export function recordRainfall(state: AppState, actor: UserProfile | null, readings: RainfallInput[], label: string, now: string): Result<void> {
  authorize(actor, "risk:simulate");
  if (readings.length === 0) return { state, result: undefined };
  for (const r of readings) {
    if (!state.zones.some((z) => z.id === r.zoneId)) throw new ValidationError({ zoneId: "Unknown zone." });
    if (r.rainfall24hMm < 0 || r.rainfall24hMm > 1000 || r.intensityMmHr < 0 || r.intensityMmHr > 200)
      throw new ValidationError({ rainfall: "Rainfall values out of range." });
  }
  const next: AppState = {
    ...state,
    rainfall: [
      ...state.rainfall,
      ...readings.map((r) => ({
        id: uid("rf"),
        zoneId: r.zoneId,
        recordedAt: now,
        rainfall24hMm: Math.round(r.rainfall24hMm),
        intensityMmHr: Math.round(r.intensityMmHr),
        source: "simulated" as const,
      })),
    ].slice(-600),
    activity: log(
      state,
      now,
      "risk",
      `Simulation: ${label} (${readings.map((r) => `${zoneName(state, r.zoneId)} ${Math.round(r.rainfall24hMm)} mm`).join(", ")})`,
      "warning",
      readings.length === 1 ? readings[0].zoneId : null,
    ),
  };
  return { state: touch(next, now), result: undefined };
}
