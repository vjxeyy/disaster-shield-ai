/**
 * SUPABASE backend — used automatically when NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 *
 * Security model: the browser uses the signed-in user's JWT, so every query is filtered by the
 * Row Level Security policies in supabase/migrations/0001_init.sql. Multi-step operations
 * (assigning teams, progressing SOS status) run inside SECURITY DEFINER RPC functions that
 * re-check the caller's role on the server. Creating staff accounts goes through the
 * /api/admin/users route, which verifies the caller is an admin before using the service key.
 *
 * NOTE: implemented against the schema in this repository, but not exercised against a live
 * Supabase project during the hackathon build (no credentials were available).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authorize } from "../auth/permissions";
import type {
  ActivityEvent,
  AppState,
  DisasterAlert,
  FacilityKey,
  FloodReport,
  RainfallReading,
  RescueAssignment,
  RescueTeam,
  RiskZone,
  SOSRequest,
  SOSStatusEvent,
  Shelter,
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
import { type Backend, type BackendSnapshot, LOADING_SNAPSHOT } from "./backend";
import { SCHEMA_VERSION } from "./seed";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const mapProfile = (r: Row): UserProfile => ({
  id: r.id,
  name: r.full_name || r.email,
  email: r.email,
  phone: r.phone ?? "",
  role: r.role,
  title: r.title ?? undefined,
  zoneId: r.zone_id,
  teamId: r.team_id,
  active: r.active,
  createdAt: r.created_at,
});
const mapZone = (r: Row): RiskZone => ({
  id: r.id,
  name: r.name,
  lat: r.lat,
  lng: r.lng,
  radiusM: r.radius_m,
  population: r.population,
  historicalSusceptibility: Number(r.historical_susceptibility),
  elevationM: Number(r.elevation_m),
  drainageNote: r.drainage_note,
});
const mapRain = (r: Row): RainfallReading => ({
  id: r.id,
  zoneId: r.zone_id,
  recordedAt: r.recorded_at,
  rainfall24hMm: Number(r.rainfall_24h_mm),
  intensityMmHr: Number(r.intensity_mm_hr),
  source: r.source,
});
const mapReport = (r: Row): FloodReport => ({
  id: r.id,
  reporterId: r.reporter_id,
  reporterName: r.reporter_name,
  contact: r.contact ?? undefined,
  zoneId: r.zone_id,
  roadName: r.road_name,
  description: r.description,
  severity: r.severity,
  waterDepthCm: r.water_depth_cm,
  lat: r.lat,
  lng: r.lng,
  path: r.path,
  status: r.status,
  createdAt: r.created_at,
});
const mapAlert = (r: Row): DisasterAlert => ({
  id: r.id,
  title: r.title,
  message: r.message,
  level: r.level,
  zoneIds: r.zone_ids ?? [],
  instructions: r.instructions ?? [],
  issuedAt: r.issued_at,
  issuedByName: r.issued_by_name,
  source: r.source,
  active: r.active,
});
const mapTeam = (r: Row): RescueTeam => ({
  id: r.id,
  name: r.name,
  agency: r.agency,
  type: r.team_type,
  baseZoneId: r.base_zone_id,
  lat: r.lat,
  lng: r.lng,
  members: r.members,
  contact: r.contact,
  status: r.status,
  capabilities: r.capabilities ?? [],
});
const mapSOS = (r: Row): SOSRequest => ({
  id: r.id,
  reference: r.reference,
  residentId: r.resident_id,
  name: r.name ?? "",
  phone: r.phone ?? "",
  emergencyType: r.emergency_type,
  urgency: r.urgency,
  description: r.description ?? "",
  peopleCount: r.people_count ?? 1,
  zoneId: r.zone_id,
  landmark: r.landmark ?? "",
  lat: r.lat ?? 0,
  lng: r.lng ?? 0,
  status: r.status,
  assignedTeamId: r.assigned_team_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const mapEvent = (r: Row): SOSStatusEvent => ({
  id: r.id,
  sosId: r.sos_id,
  status: r.status,
  note: r.note,
  actorName: r.actor_name,
  createdAt: r.created_at,
});
const mapAssignment = (r: Row): RescueAssignment => ({
  id: r.id,
  sosId: r.sos_id,
  teamId: r.team_id,
  assignedByName: r.assigned_by_name,
  assignedAt: r.assigned_at,
  status: r.status,
  completedAt: r.completed_at,
});
const mapActivity = (r: Row): ActivityEvent => ({
  id: r.id,
  type: r.type,
  message: r.message,
  zoneId: r.zone_id,
  severity: r.severity,
  createdAt: r.created_at,
});

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export class SupabaseBackend implements Backend {
  readonly mode = "supabase" as const;
  readonly client: SupabaseClient;
  private snapshot: BackendSnapshot = LOADING_SNAPSHOT;
  private listeners = new Set<() => void>();
  private started = false;
  private userId: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  }

  private start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.client.auth.getSession().then(({ data }) => {
      this.userId = data.session?.user.id ?? null;
      void this.refresh();
    });
    this.client.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (next !== this.userId) {
        this.userId = next;
        void this.refresh();
      }
    });
    this.client
      .channel("dsa-realtime")
      .on("postgres_changes", { event: "*", schema: "public" }, () => this.scheduleRefresh())
      .subscribe();
  }

  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => void this.refresh(), 250);
  }

  private set(next: BackendSnapshot) {
    this.snapshot = next;
    for (const l of this.listeners) l();
  }

  async refresh() {
    try {
      const c = this.client;
      const [zones, rainfall, alerts, shelters, facilities] = await Promise.all([
        c.from("risk_zones").select("*").order("name"),
        c.from("rainfall_readings").select("*").order("recorded_at", { ascending: true }).limit(600),
        c.from("disaster_alerts").select("*").order("issued_at", { ascending: false }),
        c.from("shelters").select("*").order("name"),
        c.from("shelter_facilities").select("*"),
      ]);
      const authed = !!this.userId;
      const [profiles, teams, sos, events, assignments, reports, activity] = authed
        ? await Promise.all([
            c.from("profiles").select("*").order("created_at"),
            c.from("rescue_teams").select("*").order("name"),
            c.from("sos_requests").select("*").order("created_at", { ascending: false }),
            c.from("sos_status_events").select("*").order("created_at"),
            c.from("rescue_assignments").select("*").order("assigned_at", { ascending: false }),
            c.from("flood_reports").select("*").order("created_at", { ascending: false }),
            c.from("activity_log").select("*").order("created_at", { ascending: false }).limit(200),
          ])
        : [];

      const facilityMap = new Map<string, FacilityKey[]>();
      for (const f of check<Row[]>(facilities)) {
        facilityMap.set(f.shelter_id, [...(facilityMap.get(f.shelter_id) ?? []), f.facility]);
      }
      const now = new Date().toISOString();
      const state: AppState = {
        schemaVersion: SCHEMA_VERSION,
        zones: check<Row[]>(zones).map(mapZone),
        rainfall: check<Row[]>(rainfall).map(mapRain),
        alerts: check<Row[]>(alerts).map(mapAlert),
        shelters: check<Row[]>(shelters).map(
          (r): Shelter => ({
            id: r.id,
            name: r.name,
            address: r.address,
            zoneId: r.zone_id,
            lat: r.lat,
            lng: r.lng,
            capacity: r.capacity,
            occupied: r.occupied,
            status: r.status,
            contact: r.contact,
            facilities: facilityMap.get(r.id) ?? [],
            updatedAt: r.updated_at,
          }),
        ),
        users: profiles ? check<Row[]>(profiles).map(mapProfile) : [],
        teams: teams ? check<Row[]>(teams).map(mapTeam) : [],
        sos: sos ? check<Row[]>(sos).map(mapSOS) : [],
        sosEvents: events ? check<Row[]>(events).map(mapEvent) : [],
        assignments: assignments ? check<Row[]>(assignments).map(mapAssignment) : [],
        floodReports: reports ? check<Row[]>(reports).map(mapReport) : [],
        activity: activity ? check<Row[]>(activity).map(mapActivity) : [],
        meta: { seededAt: now, lastUpdated: now },
      };
      this.set({ status: "ready", state, sessionUserId: this.userId });
    } catch (err) {
      this.set({
        status: "error",
        state: this.snapshot.state,
        sessionUserId: this.userId,
        error: err instanceof Error ? err.message : "Failed to load data from Supabase",
      });
    }
  }

  subscribe = (listener: () => void) => {
    this.start();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => {
    this.start();
    return this.snapshot;
  };
  getServerSnapshot = () => LOADING_SNAPSHOT;

  private actor(): UserProfile | null {
    return this.snapshot.state?.users.find((u) => u.id === this.userId) ?? null;
  }

  private async log(type: ActivityEvent["type"], message: string, zoneId: string | null = null, severity: ActivityEvent["severity"] = "info") {
    if (!this.userId) return;
    await this.client.from("activity_log").insert({ type, message, zone_id: zoneId, severity, actor_id: this.userId });
  }

  private async after<T>(value: T): Promise<T> {
    await this.refresh();
    return value;
  }

  /* ---------- auth ---------- */
  signInDemo() {
    return Promise.reject(new Error("Demo roles are disabled when Supabase is connected. Sign in with email."));
  }
  async signInWithPassword(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }
  async signUp(input: { name: string; email: string; phone: string; password: string }) {
    const { error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.name, phone: input.phone } },
    });
    if (error) throw new Error(error.message);
  }
  async signOut() {
    await this.client.auth.signOut();
  }

  /* ---------- SOS ---------- */
  submitSOS: Backend["submitSOS"] = async (input) => {
    const actor = this.actor();
    authorize(actor, "sos:create");
    const errors = validateSOS(input);
    if (hasErrors(errors)) throw new ValidationError(errors);
    const row = check<Row>(
      await this.client
        .from("sos_requests")
        .insert({
          resident_id: actor.role === "resident" ? actor.id : null,
          name: input.name.trim(),
          phone: input.phone.trim(),
          emergency_type: input.emergencyType,
          urgency: input.urgency,
          description: input.description.trim(),
          people_count: input.peopleCount,
          zone_id: input.zoneId,
          landmark: input.landmark.trim(),
          lat: input.lat,
          lng: input.lng,
        })
        .select()
        .single(),
    );
    return this.after(mapSOS(row));
  };
  assignTeam: Backend["assignTeam"] = async (sosId, teamId, note = "") => {
    check(await this.client.rpc("assign_team", { p_sos_id: sosId, p_team_id: teamId, p_note: note }));
    await this.after(undefined);
  };
  updateSOSStatus: Backend["updateSOSStatus"] = async (sosId, status, note = "") => {
    check(await this.client.rpc("update_sos_status", { p_sos_id: sosId, p_status: status, p_note: note }));
    await this.after(undefined);
  };

  /* ---------- flood reports ---------- */
  submitFloodReport: Backend["submitFloodReport"] = async (input) => {
    const actor = this.actor();
    authorize(actor, "report:create");
    const errors = validateFloodReport(input);
    if (hasErrors(errors)) throw new ValidationError(errors);
    const staff = actor.role === "official" || actor.role === "admin";
    const row = check<Row>(
      await this.client
        .from("flood_reports")
        .insert({
          reporter_id: actor.id,
          reporter_name: input.reporterName.trim(),
          contact: input.contact?.trim() || null,
          zone_id: input.zoneId,
          road_name: input.roadName.trim(),
          description: input.description.trim(),
          severity: input.severity,
          water_depth_cm: input.waterDepthCm ?? null,
          lat: input.lat,
          lng: input.lng,
          status: staff ? "verified" : "reported",
        })
        .select()
        .single(),
    );
    await this.log("report", `Flooded road reported: ${input.roadName}`, input.zoneId, input.severity === "severe" ? "critical" : "warning");
    return this.after(mapReport(row));
  };
  setFloodReportStatus: Backend["setFloodReportStatus"] = async (id, status) => {
    check(await this.client.from("flood_reports").update({ status }).eq("id", id));
    await this.log("report", `Flood report marked ${status}`);
    await this.after(undefined);
  };

  /* ---------- alerts ---------- */
  createAlert: Backend["createAlert"] = async (input) => {
    const actor = this.actor();
    authorize(actor, "alert:manage");
    const errors = validateAlert(input);
    if (hasErrors(errors)) throw new ValidationError(errors);
    const row = check<Row>(
      await this.client
        .from("disaster_alerts")
        .insert({
          title: input.title.trim(),
          message: input.message.trim(),
          level: input.level,
          zone_ids: input.zoneIds,
          instructions: input.instructions.map((i) => i.trim()).filter(Boolean),
          issued_by: actor.id,
          issued_by_name: actor.name,
          source: input.source ?? "official",
        })
        .select()
        .single(),
    );
    await this.log("alert", `${input.level} alert issued: ${input.title}`, null, input.level === "red" ? "critical" : "warning");
    return this.after(mapAlert(row));
  };
  setAlertActive: Backend["setAlertActive"] = async (id, active) => {
    check(await this.client.from("disaster_alerts").update({ active }).eq("id", id));
    await this.after(undefined);
  };

  /* ---------- shelters ---------- */
  upsertShelter: Backend["upsertShelter"] = async (input) => {
    authorize(this.actor(), "shelter:manage");
    const errors = validateShelter(input);
    if (hasErrors(errors)) throw new ValidationError(errors);
    const payload = {
      name: input.name.trim(),
      address: input.address.trim(),
      zone_id: input.zoneId,
      lat: input.lat,
      lng: input.lng,
      capacity: input.capacity,
      occupied: input.occupied,
      status: input.occupied >= input.capacity && input.status === "open" ? "full" : input.status,
      contact: input.contact.trim(),
      updated_at: new Date().toISOString(),
    };
    const row = check<Row>(
      input.id
        ? await this.client.from("shelters").update(payload).eq("id", input.id).select().single()
        : await this.client.from("shelters").insert(payload).select().single(),
    );
    check(await this.client.from("shelter_facilities").delete().eq("shelter_id", row.id));
    if (input.facilities.length) {
      check(await this.client.from("shelter_facilities").insert(input.facilities.map((f) => ({ shelter_id: row.id, facility: f }))));
    }
    await this.log("shelter", `${input.id ? "Shelter updated" : "New shelter registered"}: ${input.name}`, input.zoneId);
    await this.refresh();
    return this.snapshot.state?.shelters.find((s) => s.id === row.id) as Shelter;
  };
  updateShelterOccupancy: Backend["updateShelterOccupancy"] = async (id, occupied, status) => {
    authorize(this.actor(), "shelter:update_occupancy");
    const shelter = this.snapshot.state?.shelters.find((s) => s.id === id);
    if (shelter && occupied > shelter.capacity) throw new ValidationError({ occupied: "Occupied cannot exceed capacity." });
    const finalStatus = shelter && status === "open" && occupied >= shelter.capacity ? "full" : status;
    check(await this.client.from("shelters").update({ occupied, status: finalStatus, updated_at: new Date().toISOString() }).eq("id", id));
    await this.log("shelter", `${shelter?.name ?? "Shelter"}: ${occupied} occupied (${finalStatus})`, shelter?.zoneId ?? null);
    await this.after(undefined);
  };
  deleteShelter: Backend["deleteShelter"] = async (id) => {
    check(await this.client.from("shelters").delete().eq("id", id));
    await this.after(undefined);
  };

  /* ---------- teams ---------- */
  upsertTeam: Backend["upsertTeam"] = async (input) => {
    authorize(this.actor(), "team:manage");
    const errors = validateTeam(input);
    if (hasErrors(errors)) throw new ValidationError(errors);
    const payload = {
      name: input.name.trim(),
      agency: input.agency.trim(),
      team_type: input.type,
      base_zone_id: input.baseZoneId,
      lat: input.lat,
      lng: input.lng,
      members: input.members,
      contact: input.contact.trim(),
      status: input.status,
      capabilities: input.capabilities,
    };
    const row = check<Row>(
      input.id
        ? await this.client.from("rescue_teams").update(payload).eq("id", input.id).select().single()
        : await this.client.from("rescue_teams").insert(payload).select().single(),
    );
    return this.after(mapTeam(row));
  };
  setTeamStatus: Backend["setTeamStatus"] = async (id, status) => {
    check(await this.client.from("rescue_teams").update({ status }).eq("id", id));
    await this.after(undefined);
  };

  /* ---------- users ---------- */
  createUser: Backend["createUser"] = async (input) => {
    authorize(this.actor(), "users:manage");
    const errors = validateUser(input);
    if (hasErrors(errors)) throw new ValidationError(errors);
    const { data } = await this.client.auth.getSession();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify(input),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Could not create user");
    return this.after(body.user as UserProfile);
  };
  updateUser: Backend["updateUser"] = async (id, patch) => {
    authorize(this.actor(), "users:manage");
    const payload: Row = {};
    if (patch.role) payload.role = patch.role;
    if (patch.active !== undefined) payload.active = patch.active;
    if (patch.teamId !== undefined) payload.team_id = patch.teamId;
    check(await this.client.from("profiles").update(payload).eq("id", id));
    await this.after(undefined);
  };

  /* ---------- simulation ---------- */
  recordRainfall: Backend["recordRainfall"] = async (readings, label) => {
    authorize(this.actor(), "risk:simulate");
    check(
      await this.client.from("rainfall_readings").insert(
        readings.map((r) => ({
          zone_id: r.zoneId,
          rainfall_24h_mm: Math.round(r.rainfall24hMm),
          intensity_mm_hr: Math.round(r.intensityMmHr),
          source: "simulated",
        })),
      ),
    );
    await this.log("risk", `Simulation: ${label}`, readings.length === 1 ? readings[0].zoneId : null, "warning");
    await this.after(undefined);
  };

  resetDemoData() {
    return Promise.reject(new Error("Reset is only available in demo mode. Re-run supabase/seed.sql instead."));
  }

  async trackSOS(reference: string, phone: string): Promise<SOSRequest | null> {
    const ref = reference.trim().toUpperCase().replace(/^(SOS)?-?/, "SOS-");
    const rows = check<Row[]>(await this.client.rpc("track_sos", { p_reference: ref, p_phone: phone }));
    return rows?.[0] ? mapSOS(rows[0]) : null;
  }
}
