import type {
  AlertLevel,
  EmergencyType,
  FacilityKey,
  ReportSeverity,
  ReportStatus,
  RiskCategory,
  Role,
  SOSStatus,
  ShelterStatus,
  TeamStatus,
  TeamType,
  Urgency,
} from "./types";

export const APP_NAME = "Disaster-Shield AI";

/** Map centre for the Chennai demonstration region. */
export const CHENNAI_CENTER: [number, number] = [12.982, 80.2];
export const CHENNAI_ZOOM = 12;

export const ROLE_LABELS: Record<Role, string> = {
  resident: "Resident",
  official: "Government Official",
  rescue: "Rescue Team",
  admin: "Administrator",
};

export const RISK_LABELS: Record<RiskCategory, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

/** Hex colours used by the map (Leaflet needs raw colours, not Tailwind classes). */
export const RISK_HEX: Record<RiskCategory, string> = {
  low: "#16a34a",
  moderate: "#ea580c",
  high: "#dc2626",
};

export const SOS_STATUS_ORDER: SOSStatus[] = ["submitted", "assigned", "in_progress", "resolved"];

export const SOS_STATUS_LABELS: Record<SOSStatus, string> = {
  submitted: "Submitted",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const URGENCY_RANK: Record<Urgency, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const EMERGENCY_TYPE_LABELS: Record<EmergencyType, string> = {
  trapped: "Trapped by floodwater",
  medical: "Medical emergency",
  evacuation: "Evacuation needed",
  food_water: "Food / drinking water",
  electrical: "Electrical hazard",
  structural: "Building / wall collapse",
  other: "Other emergency",
};

export const SEVERITY_LABELS: Record<ReportSeverity, string> = {
  low: "Ankle-deep (< 30 cm)",
  moderate: "Knee-deep (30–60 cm)",
  severe: "Waist-deep or more (> 60 cm)",
};

export const SEVERITY_SHORT: Record<ReportSeverity, string> = {
  low: "Low",
  moderate: "Moderate",
  severe: "Severe",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  reported: "Reported",
  verified: "Verified",
  cleared: "Cleared",
};

export const ALERT_LEVEL_LABELS: Record<AlertLevel, { name: string; meaning: string }> = {
  yellow: { name: "Yellow", meaning: "Be aware" },
  orange: { name: "Orange", meaning: "Be prepared" },
  red: { name: "Red", meaning: "Take action" },
};

export const ALERT_LEVEL_RANK: Record<AlertLevel, number> = { red: 3, orange: 2, yellow: 1 };

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  available: "Available",
  deployed: "Deployed",
  off_duty: "Off duty",
};

export const TEAM_TYPE_LABELS: Record<TeamType, string> = {
  boat: "Boat / water rescue",
  medical: "Medical response",
  fire: "Fire & rescue",
  general: "General rescue",
};

export const SHELTER_STATUS_LABELS: Record<ShelterStatus, string> = {
  open: "Open",
  full: "Full",
  closed: "Closed / standby",
};

export const FACILITY_LABELS: Record<FacilityKey, string> = {
  water: "Drinking water",
  food: "Food",
  medical: "Medical assistance",
  first_aid: "First aid",
  electricity: "Electricity",
  accessible: "Accessible facilities",
  sanitation: "Toilets & sanitation",
  child_care: "Child & mother care",
};

export const ALL_FACILITIES = Object.keys(FACILITY_LABELS) as FacilityKey[];

export const DEFAULT_SAFETY_INSTRUCTIONS = [
  "Move to higher floors or higher ground if water enters your home.",
  "Switch off the main electricity supply if water reaches switchboards.",
  "Do not walk or drive through floodwater deeper than 30 cm.",
  "Keep phones charged and an emergency kit (water, medicines, torch, documents) ready.",
  "Follow instructions from officials and use the SOS button only for emergencies.",
];
