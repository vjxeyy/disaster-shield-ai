/**
 * Shared form validation. Used by the forms (instant feedback) AND by the data layer before
 * any write, so invalid data can never be saved even if the UI is bypassed. The Supabase
 * schema enforces the same rules with CHECK constraints.
 */
import type { AlertInput, FloodReportInput, SOSInput, ShelterInput, TeamInput, UserInput } from "./types";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const PHONE_RE = /^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.trim());
}

function inChennaiBounds(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat > 12.5 && lat < 13.5 && lng > 79.7 && lng < 80.6;
}

export function validateSOS(input: SOSInput): FieldErrors<SOSInput> {
  const e: FieldErrors<SOSInput> = {};
  if (input.name.trim().length < 2) e.name = "Enter your name (at least 2 characters).";
  if (!isValidPhone(input.phone)) e.phone = "Enter a valid 10-digit Indian mobile number.";
  if (!input.emergencyType) e.emergencyType = "Select the type of emergency.";
  if (!input.urgency) e.urgency = "Select how urgent this is.";
  if (!input.zoneId) e.zoneId = "Select your locality.";
  if (input.description.trim().length < 10) e.description = "Describe the situation in at least 10 characters.";
  if (input.description.length > 600) e.description = "Keep the description under 600 characters.";
  if (!Number.isInteger(input.peopleCount) || input.peopleCount < 1 || input.peopleCount > 500)
    e.peopleCount = "Number of people must be between 1 and 500.";
  if (!inChennaiBounds(input.lat, input.lng)) e.lat = "Set a location within the Chennai demonstration region.";
  return e;
}

export function validateFloodReport(input: FloodReportInput): FieldErrors<FloodReportInput> {
  const e: FieldErrors<FloodReportInput> = {};
  if (input.reporterName.trim().length < 2) e.reporterName = "Enter your name.";
  if (input.contact && input.contact.trim() && !isValidPhone(input.contact))
    e.contact = "Enter a valid 10-digit mobile number or leave it blank.";
  if (!input.zoneId) e.zoneId = "Select the locality.";
  if (input.roadName.trim().length < 3) e.roadName = "Enter the road or street name.";
  if (input.description.trim().length < 5) e.description = "Add a short description.";
  if (!input.severity) e.severity = "Select how deep the water is.";
  if (input.waterDepthCm != null && (input.waterDepthCm < 0 || input.waterDepthCm > 400))
    e.waterDepthCm = "Water depth must be between 0 and 400 cm.";
  if (!inChennaiBounds(input.lat, input.lng)) e.lat = "Set a location within the Chennai demonstration region.";
  return e;
}

export function validateAlert(input: AlertInput): FieldErrors<AlertInput> {
  const e: FieldErrors<AlertInput> = {};
  if (input.title.trim().length < 5) e.title = "Title must be at least 5 characters.";
  if (input.message.trim().length < 10) e.message = "Message must be at least 10 characters.";
  if (input.zoneIds.length === 0) e.zoneIds = "Select at least one affected locality.";
  if (input.instructions.filter((i) => i.trim()).length === 0) e.instructions = "Add at least one safety instruction.";
  return e;
}

export function validateShelter(input: ShelterInput): FieldErrors<ShelterInput> {
  const e: FieldErrors<ShelterInput> = {};
  if (input.name.trim().length < 3) e.name = "Enter the shelter name.";
  if (input.address.trim().length < 5) e.address = "Enter the address.";
  if (!input.zoneId) e.zoneId = "Select the locality.";
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 20000)
    e.capacity = "Capacity must be a whole number between 1 and 20,000.";
  if (!Number.isInteger(input.occupied) || input.occupied < 0) e.occupied = "Occupied must be 0 or more.";
  else if (input.occupied > input.capacity) e.occupied = "Occupied cannot exceed total capacity.";
  if (input.contact.trim() && !isValidPhone(input.contact)) e.contact = "Enter a valid 10-digit contact number.";
  if (!inChennaiBounds(input.lat, input.lng)) e.lat = "Location must be within the Chennai region.";
  return e;
}

export function validateTeam(input: TeamInput): FieldErrors<TeamInput> {
  const e: FieldErrors<TeamInput> = {};
  if (input.name.trim().length < 3) e.name = "Enter the team name.";
  if (input.agency.trim().length < 2) e.agency = "Enter the agency.";
  if (!input.baseZoneId) e.baseZoneId = "Select a base locality.";
  if (!Number.isInteger(input.members) || input.members < 1 || input.members > 200)
    e.members = "Members must be between 1 and 200.";
  if (!isValidPhone(input.contact)) e.contact = "Enter a valid 10-digit contact number.";
  return e;
}

export function validateUser(input: UserInput): FieldErrors<UserInput> {
  const e: FieldErrors<UserInput> = {};
  if (input.name.trim().length < 2) e.name = "Enter the full name.";
  if (!EMAIL_RE.test(input.email.trim())) e.email = "Enter a valid email address.";
  if (input.phone.trim() && !isValidPhone(input.phone)) e.phone = "Enter a valid 10-digit mobile number.";
  if (input.role === "rescue" && !input.teamId) e.teamId = "Rescue team members must be linked to a team.";
  return e;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}

export class ValidationError extends Error {
  constructor(public fields: Record<string, string | undefined>) {
    super(Object.values(fields).filter(Boolean)[0] ?? "Invalid input");
    this.name = "ValidationError";
  }
}
