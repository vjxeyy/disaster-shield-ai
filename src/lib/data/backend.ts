/**
 * Data-layer contract shared by every module.
 * UI components never talk to localStorage or Supabase directly — only to a `Backend`.
 *  - DemoBackend:     simulated data, persisted in the browser (localStorage), cross-tab sync.
 *  - SupabaseBackend: PostgreSQL + Auth + Row Level Security + Realtime.
 */
import type {
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

export type DataMode = "demo" | "supabase";

export interface BackendSnapshot {
  status: "loading" | "ready" | "error";
  state: AppState | null;
  sessionUserId: string | null;
  error?: string;
}

export const LOADING_SNAPSHOT: BackendSnapshot = Object.freeze({
  status: "loading",
  state: null,
  sessionUserId: null,
}) as BackendSnapshot;

export interface Backend {
  readonly mode: DataMode;
  subscribe(listener: () => void): () => void;
  getSnapshot(): BackendSnapshot;
  getServerSnapshot(): BackendSnapshot;

  /* auth */
  signInDemo(userId: string): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUp(input: { name: string; email: string; phone: string; password: string }): Promise<void>;
  signOut(): Promise<void>;

  /* SOS + rescue */
  submitSOS(input: SOSInput): Promise<SOSRequest>;
  assignTeam(sosId: string, teamId: string, note?: string): Promise<void>;
  updateSOSStatus(sosId: string, status: SOSStatus, note?: string): Promise<void>;

  /* flood reports */
  submitFloodReport(input: FloodReportInput): Promise<FloodReport>;
  setFloodReportStatus(id: string, status: ReportStatus): Promise<void>;

  /* alerts */
  createAlert(input: AlertInput): Promise<DisasterAlert>;
  setAlertActive(id: string, active: boolean): Promise<void>;

  /* shelters */
  upsertShelter(input: ShelterInput): Promise<Shelter>;
  updateShelterOccupancy(id: string, occupied: number, status: ShelterStatus): Promise<void>;
  deleteShelter(id: string): Promise<void>;

  /* teams */
  upsertTeam(input: TeamInput): Promise<RescueTeam>;
  setTeamStatus(id: string, status: TeamStatus): Promise<void>;

  /* users */
  createUser(input: UserInput): Promise<UserProfile>;
  updateUser(id: string, patch: Partial<Pick<UserProfile, "role" | "active" | "teamId">>): Promise<void>;

  /* risk inputs / simulation */
  recordRainfall(readings: RainfallInput[], label: string): Promise<void>;

  /* demo only */
  resetDemoData(): Promise<void>;
  /** Track SOS by reference + phone (works without signing in). */
  trackSOS(reference: string, phone: string): Promise<SOSRequest | null>;
}

export function isSupabaseConfigured(): boolean {
  return (
    process.env.NEXT_PUBLIC_DATA_MODE !== "demo" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
