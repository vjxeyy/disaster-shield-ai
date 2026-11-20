/**
 * Core domain types for RESCURA.
 * These mirror the Supabase schema in /supabase/migrations (snake_case there, camelCase here).
 */

export type Role = "resident" | "official" | "rescue" | "admin";

export type RiskCategory = "low" | "moderate" | "high";

export type SOSStatus = "submitted" | "assigned" | "in_progress" | "resolved";

export type Urgency = "low" | "medium" | "high" | "critical";

export type EmergencyType =
  | "trapped"
  | "medical"
  | "evacuation"
  | "food_water"
  | "electrical"
  | "structural"
  | "other";

export type ReportSeverity = "low" | "moderate" | "severe";

export type ReportStatus = "reported" | "verified" | "cleared";

/** IMD-style colour-coded warning levels. */
export type AlertLevel = "yellow" | "orange" | "red";

export type TeamStatus = "available" | "deployed" | "off_duty";

export type TeamType = "boat" | "medical" | "fire" | "general";

export type ShelterStatus = "open" | "full" | "closed";

export type FacilityKey =
  | "water"
  | "food"
  | "medical"
  | "first_aid"
  | "electricity"
  | "accessible"
  | "sanitation"
  | "child_care";

export type LatLng = [number, number];

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  title?: string;
  zoneId?: string | null;
  teamId?: string | null;
  active: boolean;
  createdAt: string;
}

export interface RiskZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  population: number;
  /** 0..1 sample index of how often the area has flooded historically. */
  historicalSusceptibility: number;
  elevationM: number;
  drainageNote: string;
}

export interface RainfallReading {
  id: string;
  zoneId: string;
  recordedAt: string;
  rainfall24hMm: number;
  intensityMmHr: number;
  source: "simulated" | "sensor" | "imd";
}

export interface FloodReport {
  id: string;
  reporterId?: string | null;
  reporterName: string;
  contact?: string;
  zoneId: string;
  roadName: string;
  description: string;
  severity: ReportSeverity;
  waterDepthCm?: number | null;
  lat: number;
  lng: number;
  path?: LatLng[] | null;
  status: ReportStatus;
  createdAt: string;
}

export interface DisasterAlert {
  id: string;
  title: string;
  message: string;
  level: AlertLevel;
  zoneIds: string[];
  instructions: string[];
  issuedAt: string;
  issuedByName: string;
  source: "official" | "risk_engine";
  active: boolean;
}

export interface RescueTeam {
  id: string;
  name: string;
  agency: string;
  type: TeamType;
  baseZoneId: string;
  lat: number;
  lng: number;
  members: number;
  contact: string;
  status: TeamStatus;
  capabilities: string[];
}

export interface SOSRequest {
  id: string;
  reference: string;
  residentId?: string | null;
  name: string;
  phone: string;
  emergencyType: EmergencyType;
  urgency: Urgency;
  description: string;
  peopleCount: number;
  zoneId: string;
  landmark: string;
  lat: number;
  lng: number;
  status: SOSStatus;
  assignedTeamId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SOSStatusEvent {
  id: string;
  sosId: string;
  status: SOSStatus;
  note: string;
  actorName: string;
  createdAt: string;
}

export interface RescueAssignment {
  id: string;
  sosId: string;
  teamId: string;
  assignedByName: string;
  assignedAt: string;
  status: "active" | "completed" | "cancelled";
  completedAt?: string | null;
}

export interface Shelter {
  id: string;
  name: string;
  address: string;
  zoneId: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  status: ShelterStatus;
  contact: string;
  facilities: FacilityKey[];
  updatedAt: string;
}

export type ActivityType =
  | "sos"
  | "assignment"
  | "status"
  | "alert"
  | "report"
  | "shelter"
  | "risk"
  | "team"
  | "system";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  message: string;
  zoneId?: string | null;
  severity: "info" | "warning" | "critical";
  createdAt: string;
}

export interface AppState {
  schemaVersion: number;
  users: UserProfile[];
  zones: RiskZone[];
  rainfall: RainfallReading[];
  floodReports: FloodReport[];
  alerts: DisasterAlert[];
  teams: RescueTeam[];
  sos: SOSRequest[];
  sosEvents: SOSStatusEvent[];
  assignments: RescueAssignment[];
  shelters: Shelter[];
  activity: ActivityEvent[];
  meta: {
    seededAt: string;
    lastUpdated: string;
  };
}

/* ---------- Mutation inputs ---------- */

export interface SOSInput {
  name: string;
  phone: string;
  emergencyType: EmergencyType;
  urgency: Urgency;
  description: string;
  peopleCount: number;
  zoneId: string;
  landmark: string;
  lat: number;
  lng: number;
}

export interface FloodReportInput {
  reporterName: string;
  contact?: string;
  zoneId: string;
  roadName: string;
  description: string;
  severity: ReportSeverity;
  waterDepthCm?: number | null;
  lat: number;
  lng: number;
}

export interface AlertInput {
  title: string;
  message: string;
  level: AlertLevel;
  zoneIds: string[];
  instructions: string[];
  source?: "official" | "risk_engine";
}

export interface ShelterInput {
  id?: string;
  name: string;
  address: string;
  zoneId: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  status: ShelterStatus;
  contact: string;
  facilities: FacilityKey[];
}

export interface TeamInput {
  id?: string;
  name: string;
  agency: string;
  type: TeamType;
  baseZoneId: string;
  lat: number;
  lng: number;
  members: number;
  contact: string;
  status: TeamStatus;
  capabilities: string[];
}

export interface UserInput {
  name: string;
  email: string;
  phone: string;
  role: Role;
  zoneId?: string | null;
  teamId?: string | null;
}

export interface RainfallInput {
  zoneId: string;
  rainfall24hMm: number;
  intensityMmHr: number;
}
