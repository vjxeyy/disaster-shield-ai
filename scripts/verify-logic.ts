/**
 * Logic checks for the shared data layer, permissions and risk engine.
 * Run: npm run verify
 */
import assert from "node:assert/strict";
import { AuthorizationError } from "../src/lib/auth/permissions";
import * as M from "../src/lib/data/mutations";
import { createSeedState, SCENARIOS } from "../src/lib/data/seed";
import { recommendTeams } from "../src/lib/data/selectors";
import { assessAllZones } from "../src/lib/risk";
import type { AppState, SOSInput } from "../src/lib/types";
import { ValidationError } from "../src/lib/validation";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

const now = () => new Date().toISOString();
let s: AppState = createSeedState(new Date());
const user = (id: string) => s.users.find((u) => u.id === id)!;
const resident = () => user("u-res-1");
const official = () => user("u-off-1");
const rescueAlpha = () => user("u-resq-1");
const rescueBravo = () => user("u-resq-2");

const sosInput: SOSInput = {
  name: "Priya Raman",
  phone: "+91 90000 20001",
  emergencyType: "trapped",
  urgency: "critical",
  description: "Water rising quickly, family of four stuck on first floor.",
  peopleCount: 4,
  zoneId: "velachery",
  landmark: "Near MRTS",
  lat: 12.9798,
  lng: 80.2216,
};

console.log("Risk engine");
test("baseline: Velachery is moderate", () => {
  const a = assessAllZones(s).velachery;
  assert.equal(a.category, "moderate");
  assert.ok(a.score >= 40 && a.score < 70, `score ${a.score}`);
  assert.equal(a.factors.reduce((n, f) => n + f.maxPoints, 0), 100);
});
test("heavy-rain scenario makes Velachery high with rainfall as top factor", () => {
  const readings = Object.entries(SCENARIOS.velacheryHeavyRain.readings).map(([zoneId, [r, i]]) => ({ zoneId, rainfall24hMm: r, intensityMmHr: i }));
  s = M.recordRainfall(s, official(), readings, "test", now()).state;
  const a = assessAllZones(s).velachery;
  assert.equal(a.category, "high");
  const top = [...a.factors].sort((x, y) => y.points - x.points)[0];
  assert.equal(top.key, "rainfall");
});
test("residents cannot run simulations", () => {
  assert.throws(() => M.recordRainfall(s, resident(), [{ zoneId: "velachery", rainfall24hMm: 10, intensityMmHr: 1 }], "x", now()), AuthorizationError);
});

console.log("SOS workflow");
let sosId = "";
test("validation rejects an invalid phone number", () => {
  assert.throws(() => M.submitSOS(s, resident(), { ...sosInput, phone: "12345" }, now()), ValidationError);
});
test("resident submits SOS → Submitted, linked to resident, increases risk", () => {
  const before = assessAllZones(s).velachery.score;
  const r = M.submitSOS(s, resident(), sosInput, now());
  s = r.state;
  sosId = r.result.id;
  assert.equal(r.result.status, "submitted");
  assert.equal(r.result.residentId, "u-res-1");
  assert.match(r.result.reference, /^SOS-\d+$/);
  assert.ok(assessAllZones(s).velachery.score > before);
});
test("resident cannot assign a team", () => {
  assert.throws(() => M.assignTeam(s, resident(), sosId, "team-1", "", now()), AuthorizationError);
});
test("nearest available capable team is recommended first", () => {
  const sos = s.sos.find((x) => x.id === sosId)!;
  assert.equal(recommendTeams(s, sos)[0].team.id, "team-1");
});
test("official assigns team-1 → Assigned, team deployed", () => {
  s = M.assignTeam(s, official(), sosId, "team-1", "Boat required", now()).state;
  assert.equal(s.sos.find((x) => x.id === sosId)!.status, "assigned");
  assert.equal(s.teams.find((t) => t.id === "team-1")!.status, "deployed");
  assert.equal(s.assignments.filter((a) => a.sosId === sosId && a.status === "active").length, 1);
});
test("deployed team cannot be double-assigned", () => {
  const other = s.sos.find((x) => x.reference === "SOS-1041")!;
  assert.throws(() => M.assignTeam(s, official(), other.id, "team-1", "", now()), ValidationError);
});
test("another rescue team cannot update this SOS", () => {
  assert.throws(() => M.updateSOSStatus(s, rescueBravo(), sosId, "in_progress", "", now()), AuthorizationError);
});
test("assigned team marks In Progress", () => {
  s = M.updateSOSStatus(s, rescueAlpha(), sosId, "in_progress", "On the way", now()).state;
  assert.equal(s.sos.find((x) => x.id === sosId)!.status, "in_progress");
});
test("status cannot move backwards", () => {
  assert.throws(() => M.updateSOSStatus(s, rescueAlpha(), sosId, "in_progress", "", now()), ValidationError);
});
test("resolving frees the team and completes the assignment", () => {
  s = M.updateSOSStatus(s, rescueAlpha(), sosId, "resolved", "Done", now()).state;
  assert.equal(s.teams.find((t) => t.id === "team-1")!.status, "available");
  assert.equal(s.assignments.find((a) => a.sosId === sosId && a.teamId === "team-1")!.status, "completed");
  assert.deepEqual(
    s.sosEvents.filter((e) => e.sosId === sosId).map((e) => e.status),
    ["submitted", "assigned", "in_progress", "resolved"],
  );
});

console.log("Shelters, alerts, users");
test("occupancy cannot exceed capacity", () => {
  assert.throws(() => M.updateShelterOccupancy(s, official(), "sh-1", 401, "open", now()), ValidationError);
});
test("occupancy at capacity auto-marks shelter full", () => {
  s = M.updateShelterOccupancy(s, official(), "sh-5", 200, "open", now()).state;
  assert.equal(s.shelters.find((x) => x.id === "sh-5")!.status, "full");
});
test("officials cannot add shelters (admin only)", () => {
  const sh = s.shelters[0];
  assert.throws(() => M.upsertShelter(s, official(), { ...sh, id: undefined, name: "New" }, now()), AuthorizationError);
});
test("residents cannot issue alerts", () => {
  assert.throws(
    () => M.createAlert(s, resident(), { title: "Fake alert", message: "Not allowed here", level: "red", zoneIds: ["velachery"], instructions: ["x"] }, now()),
    AuthorizationError,
  );
});
test("deactivated users lose all permissions", () => {
  s = M.updateUser(s, user("u-admin"), "u-off-2", { active: false }, now()).state;
  assert.throws(() => M.assignTeam(s, user("u-off-2"), s.sos[0].id, "team-2", "", now()), AuthorizationError);
});
test("admin cannot remove their own admin access", () => {
  assert.throws(() => M.updateUser(s, user("u-admin"), "u-admin", { role: "resident" }, now()), ValidationError);
});

console.log(`\n${passed} checks passed${process.exitCode ? " — SOME FAILED" : ""}`);
