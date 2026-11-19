/**
 * DEMO MODE backend — used when Supabase credentials are not configured.
 *
 * - All five modules read and write this single store.
 * - Data is persisted to localStorage so it survives reloads, and is synchronised across
 *   browser tabs via the `storage` event (open the resident portal and rescue console in two tabs).
 * - Each tab keeps its own signed-in demo role (sessionStorage), so two roles can run side by side.
 * - Every write goes through `mutations.ts`, which checks role permissions and validates input.
 *   NOTE: in demo mode this enforcement runs in the browser; real server-side enforcement is
 *   provided by Supabase RLS when Supabase is configured.
 */
import type { AppState, SOSRequest, UserProfile } from "../types";
import { isValidPhone } from "../validation";
import { type Backend, type BackendSnapshot, LOADING_SNAPSHOT } from "./backend";
import * as M from "./mutations";
import { createSeedState, SCHEMA_VERSION } from "./seed";

const STATE_KEY = "dsa:state:v1";
const SESSION_KEY = "dsa:session:v1";
const LAST_SESSION_KEY = "dsa:last-session:v1";

function safeGet(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function safeSet(storage: Storage | undefined, key: string, value: string | null) {
  try {
    if (!storage) return;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / quota) — keep working in memory */
  }
}

function parseState(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.zones)) return null;
    return parsed;
  } catch {
    return null;
  }
}

const digits = (p: string) => p.replace(/\D/g, "").slice(-10);

export class DemoBackend implements Backend {
  readonly mode = "demo" as const;
  private snapshot: BackendSnapshot = LOADING_SNAPSHOT;
  private listeners = new Set<() => void>();
  private initialized = false;

  private init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    let state = parseState(safeGet(window.localStorage, STATE_KEY));
    if (!state) {
      state = createSeedState(new Date());
      safeSet(window.localStorage, STATE_KEY, JSON.stringify(state));
    }
    const sessionUserId =
      safeGet(window.sessionStorage, SESSION_KEY) ?? safeGet(window.localStorage, LAST_SESSION_KEY);
    const validSession = sessionUserId && state.users.some((u) => u.id === sessionUserId && u.active) ? sessionUserId : null;
    this.snapshot = { status: "ready", state, sessionUserId: validSession };
    window.addEventListener("storage", this.onStorage);
  }

  private onStorage = (e: StorageEvent) => {
    if (e.key === STATE_KEY) {
      const state = parseState(e.newValue);
      if (state) {
        this.snapshot = { ...this.snapshot, state };
        this.emit();
      }
    }
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  subscribe = (listener: () => void) => {
    this.init();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => {
    this.init();
    return this.snapshot;
  };

  getServerSnapshot = () => LOADING_SNAPSHOT;

  private actor(): UserProfile | null {
    const s = this.snapshot;
    return s.state?.users.find((u) => u.id === s.sessionUserId && u.active) ?? null;
  }

  private commit<T>(fn: (state: AppState, actor: UserProfile | null, now: string) => { state: AppState; result: T }): Promise<T> {
    this.init();
    try {
      const current = this.snapshot.state;
      if (!current) throw new Error("Data is still loading.");
      const { state, result } = fn(current, this.actor(), new Date().toISOString());
      this.snapshot = { ...this.snapshot, state };
      safeSet(window.localStorage, STATE_KEY, JSON.stringify(state));
      this.emit();
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /* ---------- auth ---------- */
  signInDemo(userId: string) {
    this.init();
    const user = this.snapshot.state?.users.find((u) => u.id === userId);
    if (!user) return Promise.reject(new Error("Demo user not found."));
    if (!user.active) return Promise.reject(new Error("This account has been deactivated by an administrator."));
    safeSet(window.sessionStorage, SESSION_KEY, userId);
    safeSet(window.localStorage, LAST_SESSION_KEY, userId);
    this.snapshot = { ...this.snapshot, sessionUserId: userId };
    this.emit();
    return Promise.resolve();
  }
  signInWithPassword() {
    return Promise.reject(new Error("Email sign-in requires Supabase. Use a demo role in demo mode."));
  }
  signUp() {
    return Promise.reject(new Error("Sign-up requires Supabase. Use a demo role in demo mode."));
  }
  signOut() {
    safeSet(window.sessionStorage, SESSION_KEY, null);
    safeSet(window.localStorage, LAST_SESSION_KEY, null);
    this.snapshot = { ...this.snapshot, sessionUserId: null };
    this.emit();
    return Promise.resolve();
  }

  /* ---------- mutations ---------- */
  submitSOS: Backend["submitSOS"] = (input) => this.commit((s, a, now) => M.submitSOS(s, a, input, now));
  assignTeam: Backend["assignTeam"] = (sosId, teamId, note = "") =>
    this.commit((s, a, now) => M.assignTeam(s, a, sosId, teamId, note, now));
  updateSOSStatus: Backend["updateSOSStatus"] = (sosId, status, note = "") =>
    this.commit((s, a, now) => M.updateSOSStatus(s, a, sosId, status, note, now));
  submitFloodReport: Backend["submitFloodReport"] = (input) => this.commit((s, a, now) => M.submitFloodReport(s, a, input, now));
  setFloodReportStatus: Backend["setFloodReportStatus"] = (id, status) =>
    this.commit((s, a, now) => M.setFloodReportStatus(s, a, id, status, now));
  createAlert: Backend["createAlert"] = (input) => this.commit((s, a, now) => M.createAlert(s, a, input, now));
  setAlertActive: Backend["setAlertActive"] = (id, active) => this.commit((s, a, now) => M.setAlertActive(s, a, id, active, now));
  upsertShelter: Backend["upsertShelter"] = (input) => this.commit((s, a, now) => M.upsertShelter(s, a, input, now));
  updateShelterOccupancy: Backend["updateShelterOccupancy"] = (id, occupied, status) =>
    this.commit((s, a, now) => M.updateShelterOccupancy(s, a, id, occupied, status, now));
  deleteShelter: Backend["deleteShelter"] = (id) => this.commit((s, a, now) => M.deleteShelter(s, a, id, now));
  upsertTeam: Backend["upsertTeam"] = (input) => this.commit((s, a, now) => M.upsertTeam(s, a, input, now));
  setTeamStatus: Backend["setTeamStatus"] = (id, status) => this.commit((s, a, now) => M.setTeamStatus(s, a, id, status, now));
  createUser: Backend["createUser"] = (input) => this.commit((s, a, now) => M.createUser(s, a, input, now));
  updateUser: Backend["updateUser"] = (id, patch) => this.commit((s, a, now) => M.updateUser(s, a, id, patch, now));
  recordRainfall: Backend["recordRainfall"] = (readings, label) =>
    this.commit((s, a, now) => M.recordRainfall(s, a, readings, label, now));

  resetDemoData() {
    this.init();
    const state = createSeedState(new Date());
    safeSet(window.localStorage, STATE_KEY, JSON.stringify(state));
    const keep = state.users.some((u) => u.id === this.snapshot.sessionUserId) ? this.snapshot.sessionUserId : null;
    this.snapshot = { status: "ready", state, sessionUserId: keep };
    this.emit();
    return Promise.resolve();
  }

  trackSOS(reference: string, phone: string): Promise<SOSRequest | null> {
    this.init();
    if (!isValidPhone(phone)) return Promise.reject(new Error("Enter the mobile number used for the request."));
    const ref = reference.trim().toUpperCase().replace(/^(SOS)?-?/, "SOS-");
    const match = this.snapshot.state?.sos.find((s) => s.reference === ref && digits(s.phone) === digits(phone)) ?? null;
    return Promise.resolve(match);
  }
}
