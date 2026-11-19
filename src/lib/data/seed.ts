/**
 * SIMULATED demonstration data for the Chennai region.
 * Names, phone numbers, shelters, teams, readings and incidents are fictional samples for a
 * hackathon demo. They are not live government data.
 */
import type {
  ActivityEvent,
  AppState,
  DisasterAlert,
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
import { DEFAULT_SAFETY_INSTRUCTIONS } from "../constants";

export const SCHEMA_VERSION = 3;

export const ZONES: RiskZone[] = [
  {
    id: "velachery",
    name: "Velachery",
    lat: 12.9815,
    lng: 80.218,
    radiusM: 1450,
    population: 245000,
    historicalSusceptibility: 0.9,
    elevationM: 6,
    drainageNote: "Low-lying area on former wetland that drains toward the Pallikaranai marsh.",
  },
  {
    id: "tambaram",
    name: "Tambaram",
    lat: 12.9249,
    lng: 80.117,
    radiusM: 1700,
    population: 230000,
    historicalSusceptibility: 0.7,
    elevationM: 28,
    drainageNote: "Surrounded by lakes whose surplus water can overflow into residential streets.",
  },
  {
    id: "adyar",
    name: "Adyar",
    lat: 13.0063,
    lng: 80.2574,
    radiusM: 1350,
    population: 190000,
    historicalSusceptibility: 0.6,
    elevationM: 8,
    drainageNote: "Adjoins the Adyar river; high river levels can cause backflow into drains.",
  },
  {
    id: "saidapet",
    name: "Saidapet",
    lat: 13.0213,
    lng: 80.2231,
    radiusM: 1200,
    population: 160000,
    historicalSusceptibility: 0.65,
    elevationM: 10,
    drainageNote: "Riverside settlements along the Adyar river are exposed when water levels rise.",
  },
  {
    id: "perungudi",
    name: "Perungudi",
    lat: 12.9654,
    lng: 80.2461,
    radiusM: 1350,
    population: 120000,
    historicalSusceptibility: 0.55,
    elevationM: 7,
    drainageNote: "IT-corridor area draining to the Buckingham Canal; service roads collect water.",
  },
  {
    id: "pallikaranai",
    name: "Pallikaranai",
    lat: 12.9349,
    lng: 80.2137,
    radiusM: 1550,
    population: 110000,
    historicalSusceptibility: 0.85,
    elevationM: 5,
    drainageNote: "Built around the Pallikaranai marshland catchment; slow to drain.",
  },
  {
    id: "madipakkam",
    name: "Madipakkam",
    lat: 12.9647,
    lng: 80.1961,
    radiusM: 1250,
    population: 135000,
    historicalSusceptibility: 0.75,
    elevationM: 9,
    drainageNote: "Residential low-lying pockets that receive lake surplus during heavy spells.",
  },
  {
    id: "tnagar",
    name: "T. Nagar",
    lat: 13.0418,
    lng: 80.2341,
    radiusM: 1100,
    population: 210000,
    historicalSusceptibility: 0.35,
    elevationM: 11,
    drainageNote: "Dense commercial area; subways and underpasses are prone to waterlogging.",
  },
];

/** Baseline "monsoon day" rainfall per zone: [24 h accumulation mm, intensity mm/hr]. */
export const BASELINE_RAINFALL: Record<string, [number, number]> = {
  velachery: [72, 12],
  tambaram: [88, 14],
  adyar: [54, 8],
  saidapet: [48, 7],
  perungudi: [66, 11],
  pallikaranai: [79, 13],
  madipakkam: [70, 11],
  tnagar: [41, 6],
};

export const DEMO_LOGIN_USERS = {
  resident: "u-res-1",
  official: "u-off-1",
  rescue: "u-resq-1",
  admin: "u-admin",
} as const;

export function createSeedState(now: Date = new Date()): AppState {
  const t = now.getTime();
  const ago = (minutes: number) => new Date(t - minutes * 60_000).toISOString();

  /* ---------------- Users ---------------- */
  const users: UserProfile[] = [
    { id: "u-admin", name: "Kavya Natarajan", email: "admin@demo.disastershield.in", phone: "+91 90000 10001", role: "admin", title: "System Administrator", active: true, createdAt: ago(60 * 24 * 30) },
    { id: "u-off-1", name: "Anitha Suresh", email: "anitha.s@demo.disastershield.in", phone: "+91 90000 10002", role: "official", title: "District Emergency Operations Officer", active: true, createdAt: ago(60 * 24 * 28) },
    { id: "u-off-2", name: "Rahul Venkatesh", email: "rahul.v@demo.disastershield.in", phone: "+91 90000 10003", role: "official", title: "Zonal Control Room Officer", active: true, createdAt: ago(60 * 24 * 20) },
    { id: "u-res-1", name: "Priya Raman", email: "priya.r@demo.disastershield.in", phone: "+91 90000 20001", role: "resident", zoneId: "velachery", active: true, createdAt: ago(60 * 24 * 12) },
    { id: "u-res-2", name: "Meena Krishnan", email: "meena.k@demo.disastershield.in", phone: "+91 90000 20002", role: "resident", zoneId: "velachery", active: true, createdAt: ago(60 * 24 * 9) },
    { id: "u-res-3", name: "Abdul Rahman", email: "abdul.r@demo.disastershield.in", phone: "+91 90000 20003", role: "resident", zoneId: "tambaram", active: true, createdAt: ago(60 * 24 * 7) },
    { id: "u-resq-1", name: "Arjun Menon", email: "arjun.m@demo.disastershield.in", phone: "+91 90000 30001", role: "rescue", title: "Team Lead", teamId: "team-1", active: true, createdAt: ago(60 * 24 * 25) },
    { id: "u-resq-2", name: "Deepa Raj", email: "deepa.r@demo.disastershield.in", phone: "+91 90000 30002", role: "rescue", title: "Team Lead", teamId: "team-2", active: true, createdAt: ago(60 * 24 * 25) },
    { id: "u-resq-3", name: "Senthil Kumar", email: "senthil.k@demo.disastershield.in", phone: "+91 90000 30003", role: "rescue", title: "Station Officer", teamId: "team-3", active: true, createdAt: ago(60 * 24 * 25) },
    { id: "u-resq-4", name: "Imran Basha", email: "imran.b@demo.disastershield.in", phone: "+91 90000 30004", role: "rescue", title: "Unit Supervisor", teamId: "team-4", active: true, createdAt: ago(60 * 24 * 25) },
    { id: "u-resq-5", name: "Dr. Fathima Begum", email: "fathima.b@demo.disastershield.in", phone: "+91 90000 30005", role: "rescue", title: "Medical Officer", teamId: "team-5", active: true, createdAt: ago(60 * 24 * 25) },
    { id: "u-resq-6", name: "Vikram Singh", email: "vikram.s@demo.disastershield.in", phone: "+91 90000 30006", role: "rescue", title: "Team Commander", teamId: "team-6", active: true, createdAt: ago(60 * 24 * 25) },
  ];

  /* ---------------- Rescue teams ---------------- */
  const teams: RescueTeam[] = [
    { id: "team-1", name: "SDRF Boat Team Alpha", agency: "State Disaster Response Force (sample)", type: "boat", baseZoneId: "velachery", lat: 12.9852, lng: 80.2142, members: 8, contact: "+91 90000 11001", status: "available", capabilities: ["Boat evacuation", "Swift-water rescue", "First aid"] },
    { id: "team-2", name: "SDRF Boat Team Bravo", agency: "State Disaster Response Force (sample)", type: "boat", baseZoneId: "saidapet", lat: 13.018, lng: 80.226, members: 8, contact: "+91 90000 11002", status: "available", capabilities: ["Boat evacuation", "Rope rescue"] },
    { id: "team-3", name: "Fire & Rescue Unit – Tambaram", agency: "Fire & Rescue Services (sample)", type: "fire", baseZoneId: "tambaram", lat: 12.926, lng: 80.119, members: 10, contact: "+91 90000 11003", status: "deployed", capabilities: ["Vehicle extrication", "Dewatering pumps", "Structural rescue"] },
    { id: "team-4", name: "Corporation Rescue Unit 3", agency: "Municipal Corporation (sample)", type: "general", baseZoneId: "adyar", lat: 13.004, lng: 80.252, members: 12, contact: "+91 90000 11004", status: "available", capabilities: ["Tree clearing", "Food & water distribution", "Dewatering pumps"] },
    { id: "team-5", name: "Medical Response Team 108-A", agency: "Emergency Medical Services (sample)", type: "medical", baseZoneId: "perungudi", lat: 12.962, lng: 80.242, members: 5, contact: "+91 90000 11005", status: "deployed", capabilities: ["Advanced life support", "Patient transport"] },
    { id: "team-6", name: "NDRF Detachment Team", agency: "National Disaster Response Force (sample)", type: "boat", baseZoneId: "tnagar", lat: 13.04, lng: 80.233, members: 15, contact: "+91 90000 11006", status: "off_duty", capabilities: ["Boat evacuation", "Collapsed structure search", "Mass evacuation"] },
  ];

  /* ---------------- Rainfall readings (12 hourly readings per zone) ---------------- */
  const rainfall: RainfallReading[] = [];
  for (const zone of ZONES) {
    const [rain24, intensity] = BASELINE_RAINFALL[zone.id];
    for (let k = 0; k < 12; k++) {
      const progress = k / 11;
      const wobble = Math.sin((k + zone.name.length) * 1.3) * 0.08;
      rainfall.push({
        id: `rf-${zone.id}-${k}`,
        zoneId: zone.id,
        recordedAt: ago((11 - k) * 60),
        rainfall24hMm: Math.round(rain24 * (0.5 + 0.5 * progress)),
        intensityMmHr: Math.max(1, Math.round(intensity * (0.7 + 0.3 * progress + wobble))),
        source: "simulated",
      });
    }
    // make sure the latest reading is exactly the baseline value
    const last = rainfall[rainfall.length - 1];
    last.rainfall24hMm = rain24;
    last.intensityMmHr = intensity;
  }

  /* ---------------- SOS requests ---------------- */
  const sos: SOSRequest[] = [
    { id: "sos-1041", reference: "SOS-1041", residentId: "u-res-2", name: "Meena Krishnan", phone: "+91 90000 20002", emergencyType: "evacuation", urgency: "medium", description: "Water entering ground floor. Two elderly parents need help moving to a relief centre.", peopleCount: 3, zoneId: "velachery", landmark: "Near Vijayanagar bus stand", lat: 12.9788, lng: 80.2208, status: "submitted", assignedTeamId: null, createdAt: ago(35), updatedAt: ago(35) },
    { id: "sos-1038", reference: "SOS-1038", residentId: "u-res-3", name: "Abdul Rahman", phone: "+91 90000 20003", emergencyType: "trapped", urgency: "high", description: "Car stalled inside the flooded subway, two people unable to get out safely.", peopleCount: 2, zoneId: "tambaram", landmark: "GST Road subway", lat: 12.9243, lng: 80.1162, status: "assigned", assignedTeamId: "team-3", createdAt: ago(70), updatedAt: ago(55) },
    { id: "sos-1036", reference: "SOS-1036", residentId: null, name: "Lakshmi Narayanan", phone: "+91 90000 20004", emergencyType: "medical", urgency: "critical", description: "Dialysis patient needs transport to hospital; street is under knee-deep water.", peopleCount: 1, zoneId: "pallikaranai", landmark: "Behind Pallikaranai panchayat office", lat: 12.9362, lng: 80.2112, status: "in_progress", assignedTeamId: "team-5", createdAt: ago(125), updatedAt: ago(80) },
    { id: "sos-1033", reference: "SOS-1033", residentId: null, name: "John Peter", phone: "+91 90000 20005", emergencyType: "food_water", urgency: "medium", description: "Apartment complex cut off; around 40 residents need drinking water and food packets.", peopleCount: 40, zoneId: "adyar", landmark: "Gandhi Nagar 2nd Main Road", lat: 13.0045, lng: 80.2598, status: "submitted", assignedTeamId: null, createdAt: ago(160), updatedAt: ago(160) },
    { id: "sos-1030", reference: "SOS-1030", residentId: null, name: "Ravi Shankar", phone: "+91 90000 20006", emergencyType: "evacuation", urgency: "high", description: "Riverside huts flooding, families with children need evacuation.", peopleCount: 18, zoneId: "saidapet", landmark: "Riverside, near Saidapet bridge", lat: 13.0197, lng: 80.2268, status: "resolved", assignedTeamId: "team-2", createdAt: ago(300), updatedAt: ago(190) },
    { id: "sos-1029", reference: "SOS-1029", residentId: null, name: "Sowmya Iyer", phone: "+91 90000 20007", emergencyType: "electrical", urgency: "high", description: "Electric line has fallen into a waterlogged street; risk of electrocution.", peopleCount: 6, zoneId: "perungudi", landmark: "Kandanchavadi, OMR service road", lat: 12.9662, lng: 80.2472, status: "resolved", assignedTeamId: "team-4", createdAt: ago(330), updatedAt: ago(240) },
  ];

  const sosEvents: SOSStatusEvent[] = [
    { id: "ev-1", sosId: "sos-1041", status: "submitted", note: "Request received via resident portal.", actorName: "Meena Krishnan", createdAt: ago(35) },
    { id: "ev-2", sosId: "sos-1038", status: "submitted", note: "Request received via resident portal.", actorName: "Abdul Rahman", createdAt: ago(70) },
    { id: "ev-3", sosId: "sos-1038", status: "assigned", note: "Assigned to Fire & Rescue Unit – Tambaram.", actorName: "Anitha Suresh", createdAt: ago(55) },
    { id: "ev-4", sosId: "sos-1036", status: "submitted", note: "Logged by control room from a phone call.", actorName: "Rahul Venkatesh", createdAt: ago(125) },
    { id: "ev-5", sosId: "sos-1036", status: "assigned", note: "Assigned to Medical Response Team 108-A.", actorName: "Rahul Venkatesh", createdAt: ago(110) },
    { id: "ev-6", sosId: "sos-1036", status: "in_progress", note: "Team en route with stretcher and boat support.", actorName: "Dr. Fathima Begum", createdAt: ago(80) },
    { id: "ev-7", sosId: "sos-1033", status: "submitted", note: "Request received via resident portal.", actorName: "John Peter", createdAt: ago(160) },
    { id: "ev-8", sosId: "sos-1030", status: "submitted", note: "Request received via resident portal.", actorName: "Ravi Shankar", createdAt: ago(300) },
    { id: "ev-9", sosId: "sos-1030", status: "assigned", note: "Assigned to SDRF Boat Team Bravo.", actorName: "Anitha Suresh", createdAt: ago(290) },
    { id: "ev-10", sosId: "sos-1030", status: "in_progress", note: "Boat team on site; evacuation started.", actorName: "Deepa Raj", createdAt: ago(260) },
    { id: "ev-11", sosId: "sos-1030", status: "resolved", note: "18 people moved to Guindy Community Relief Hall.", actorName: "Deepa Raj", createdAt: ago(190) },
    { id: "ev-12", sosId: "sos-1029", status: "submitted", note: "Request received via resident portal.", actorName: "Sowmya Iyer", createdAt: ago(330) },
    { id: "ev-13", sosId: "sos-1029", status: "assigned", note: "Assigned to Corporation Rescue Unit 3; electricity board informed.", actorName: "Rahul Venkatesh", createdAt: ago(320) },
    { id: "ev-14", sosId: "sos-1029", status: "in_progress", note: "Area cordoned off.", actorName: "Imran Basha", createdAt: ago(300) },
    { id: "ev-15", sosId: "sos-1029", status: "resolved", note: "Power isolated and line removed.", actorName: "Imran Basha", createdAt: ago(240) },
  ];

  const assignments: RescueAssignment[] = [
    { id: "as-1", sosId: "sos-1038", teamId: "team-3", assignedByName: "Anitha Suresh", assignedAt: ago(55), status: "active" },
    { id: "as-2", sosId: "sos-1036", teamId: "team-5", assignedByName: "Rahul Venkatesh", assignedAt: ago(110), status: "active" },
    { id: "as-3", sosId: "sos-1030", teamId: "team-2", assignedByName: "Anitha Suresh", assignedAt: ago(290), status: "completed", completedAt: ago(190) },
    { id: "as-4", sosId: "sos-1029", teamId: "team-4", assignedByName: "Rahul Venkatesh", assignedAt: ago(320), status: "completed", completedAt: ago(240) },
  ];

  /* ---------------- Flood / waterlogging reports ---------------- */
  const floodReports: FloodReport[] = [
    { id: "fr-1", reporterId: "u-res-2", reporterName: "Meena Krishnan", zoneId: "velachery", roadName: "Velachery Main Road (Vijayanagar junction)", description: "Knee-deep water across both lanes, two-wheelers stalling.", severity: "moderate", waterDepthCm: 45, lat: 12.9792, lng: 80.2196, path: [[12.9762, 80.2214], [12.9792, 80.2196], [12.9824, 80.2181]], status: "verified", createdAt: ago(50) },
    { id: "fr-2", reporterId: "u-res-3", reporterName: "Abdul Rahman", zoneId: "tambaram", roadName: "GST Road subway", description: "Subway fully submerged; traffic diverted.", severity: "severe", waterDepthCm: 95, lat: 12.9246, lng: 80.1168, path: [[12.9229, 80.1152], [12.9246, 80.1168], [12.9263, 80.1183]], status: "verified", createdAt: ago(85) },
    { id: "fr-3", reporterId: null, reporterName: "Field staff – Zone 14", zoneId: "pallikaranai", roadName: "Velachery–Tambaram Main Road (Pallikaranai stretch)", description: "Water flowing across the road from the marsh side.", severity: "moderate", waterDepthCm: 40, lat: 12.9352, lng: 80.2108, path: [[12.9398, 80.2122], [12.9352, 80.2108], [12.9303, 80.2093]], status: "reported", createdAt: ago(95) },
    { id: "fr-4", reporterId: null, reporterName: "Karthik S", zoneId: "perungudi", roadName: "OMR service road near Perungudi", description: "Service road waterlogged, main carriageway passable.", severity: "moderate", waterDepthCm: 35, lat: 12.9658, lng: 80.2478, path: [[12.9638, 80.2474], [12.9658, 80.2478], [12.9679, 80.2483]], status: "reported", createdAt: ago(120) },
    { id: "fr-5", reporterId: null, reporterName: "Nisha P", zoneId: "saidapet", roadName: "Jones Road, Saidapet", description: "Ankle-deep water near the market.", severity: "low", waterDepthCm: 20, lat: 13.0221, lng: 80.2219, path: null, status: "reported", createdAt: ago(140) },
    { id: "fr-6", reporterId: null, reporterName: "Traffic police (sample)", zoneId: "tnagar", roadName: "Usman Road subway approach", description: "Water collecting at the subway approach; pumps operating.", severity: "low", waterDepthCm: 25, lat: 13.0395, lng: 80.2329, path: null, status: "verified", createdAt: ago(150) },
    { id: "fr-7", reporterId: null, reporterName: "Ramesh K", zoneId: "madipakkam", roadName: "Ram Nagar Main Road", description: "Low-lying stretch with standing water.", severity: "low", waterDepthCm: 20, lat: 12.9655, lng: 80.1975, path: null, status: "reported", createdAt: ago(170) },
  ];

  /* ---------------- Alerts ---------------- */
  const alerts: DisasterAlert[] = [
    {
      id: "al-1",
      title: "Heavy rainfall alert for south Chennai",
      message:
        "Heavy to very heavy rainfall is expected over the next 24 hours (simulated forecast). Low-lying areas may experience waterlogging.",
      level: "orange",
      zoneIds: ["velachery", "pallikaranai", "madipakkam", "tambaram", "perungudi"],
      instructions: DEFAULT_SAFETY_INSTRUCTIONS,
      issuedAt: ago(180),
      issuedByName: "District Emergency Operations Centre (sample)",
      source: "official",
      active: true,
    },
    {
      id: "al-2",
      title: "Avoid subways and underpasses",
      message: "Waterlogging reported at several subways. Use alternate routes and avoid driving through standing water.",
      level: "yellow",
      zoneIds: ["tnagar", "saidapet", "tambaram"],
      instructions: [
        "Avoid subways and underpasses until water is pumped out.",
        "Do not drive through water deeper than 30 cm.",
        "Report waterlogged roads using the resident portal.",
      ],
      issuedAt: ago(140),
      issuedByName: "Traffic Control Room (sample)",
      source: "official",
      active: true,
    },
    {
      id: "al-3",
      title: "Moderate rain watch",
      message: "Moderate rain expected through the evening (simulated).",
      level: "yellow",
      zoneIds: ["adyar", "saidapet", "tnagar"],
      instructions: ["Stay updated through official channels."],
      issuedAt: ago(60 * 20),
      issuedByName: "District Emergency Operations Centre (sample)",
      source: "official",
      active: false,
    },
  ];

  /* ---------------- Shelters ---------------- */
  const shelters: Shelter[] = [
    { id: "sh-1", name: "Velachery Corporation Higher Secondary School", address: "Velachery Main Road, Velachery, Chennai 600042", zoneId: "velachery", lat: 12.9797, lng: 80.2152, capacity: 400, occupied: 180, status: "open", contact: "+91 90000 40001", facilities: ["water", "food", "medical", "first_aid", "electricity", "accessible", "sanitation"], updatedAt: ago(30) },
    { id: "sh-2", name: "Guindy Community Relief Hall", address: "Race Course Road, Guindy, Chennai 600032", zoneId: "saidapet", lat: 13.0098, lng: 80.2152, capacity: 250, occupied: 90, status: "open", contact: "+91 90000 40002", facilities: ["water", "food", "first_aid", "electricity", "sanitation"], updatedAt: ago(45) },
    { id: "sh-3", name: "Adyar Kalyana Mandapam Relief Centre", address: "LB Road, Adyar, Chennai 600020", zoneId: "adyar", lat: 13.0031, lng: 80.2556, capacity: 300, occupied: 262, status: "open", contact: "+91 90000 40003", facilities: ["water", "food", "medical", "first_aid", "electricity", "sanitation", "child_care"], updatedAt: ago(25) },
    { id: "sh-4", name: "Tambaram Municipal Community Centre", address: "Shanmugam Road, Tambaram West, Chennai 600045", zoneId: "tambaram", lat: 12.9272, lng: 80.1121, capacity: 500, occupied: 210, status: "open", contact: "+91 90000 40004", facilities: ["water", "food", "first_aid", "electricity", "accessible", "sanitation"], updatedAt: ago(60) },
    { id: "sh-5", name: "Perungudi Corporation School", address: "Kandanchavadi, Perungudi, Chennai 600096", zoneId: "perungudi", lat: 12.9681, lng: 80.2438, capacity: 200, occupied: 40, status: "open", contact: "+91 90000 40005", facilities: ["water", "food", "first_aid", "sanitation"], updatedAt: ago(90) },
    { id: "sh-6", name: "Madipakkam Panchayat Hall", address: "Medavakkam Main Road, Madipakkam, Chennai 600091", zoneId: "madipakkam", lat: 12.9619, lng: 80.1992, capacity: 150, occupied: 150, status: "full", contact: "+91 90000 40006", facilities: ["water", "food", "first_aid"], updatedAt: ago(20) },
    { id: "sh-7", name: "T. Nagar Corporation Marriage Hall", address: "Thanikachalam Road, T. Nagar, Chennai 600017", zoneId: "tnagar", lat: 13.0402, lng: 80.2378, capacity: 350, occupied: 70, status: "open", contact: "+91 90000 40007", facilities: ["water", "food", "medical", "electricity", "accessible", "sanitation"], updatedAt: ago(75) },
    { id: "sh-8", name: "Pallikaranai Government School", address: "Pallikaranai Main Road, Chennai 600100", zoneId: "pallikaranai", lat: 12.9371, lng: 80.2161, capacity: 220, occupied: 0, status: "closed", contact: "+91 90000 40008", facilities: ["water", "sanitation", "first_aid"], updatedAt: ago(200) },
  ];

  /* ---------------- Activity log ---------------- */
  const activity: ActivityEvent[] = [
    { id: "ac-1", type: "sos", message: "New SOS SOS-1041 (evacuation) from Velachery", zoneId: "velachery", severity: "warning", createdAt: ago(35) },
    { id: "ac-2", type: "report", message: "Flooded road verified: Velachery Main Road (knee-deep)", zoneId: "velachery", severity: "warning", createdAt: ago(48) },
    { id: "ac-3", type: "assignment", message: "Fire & Rescue Unit – Tambaram assigned to SOS-1038", zoneId: "tambaram", severity: "info", createdAt: ago(55) },
    { id: "ac-4", type: "status", message: "SOS-1036 is now In Progress (Medical Response Team 108-A)", zoneId: "pallikaranai", severity: "info", createdAt: ago(80) },
    { id: "ac-5", type: "report", message: "Severe waterlogging at GST Road subway, Tambaram", zoneId: "tambaram", severity: "critical", createdAt: ago(85) },
    { id: "ac-6", type: "alert", message: "Yellow alert issued: Avoid subways and underpasses", zoneId: null, severity: "warning", createdAt: ago(140) },
    { id: "ac-7", type: "sos", message: "New SOS SOS-1033 (food / water) from Adyar", zoneId: "adyar", severity: "warning", createdAt: ago(160) },
    { id: "ac-8", type: "alert", message: "Orange alert issued: Heavy rainfall alert for south Chennai", zoneId: null, severity: "warning", createdAt: ago(180) },
    { id: "ac-9", type: "status", message: "SOS-1030 resolved — 18 people moved to Guindy Community Relief Hall", zoneId: "saidapet", severity: "info", createdAt: ago(190) },
    { id: "ac-10", type: "status", message: "SOS-1029 resolved — fallen power line cleared in Perungudi", zoneId: "perungudi", severity: "info", createdAt: ago(240) },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    users,
    zones: ZONES.map((z) => ({ ...z })),
    rainfall,
    floodReports,
    alerts,
    teams,
    sos,
    sosEvents,
    assignments,
    shelters,
    activity,
    meta: { seededAt: now.toISOString(), lastUpdated: now.toISOString() },
  };
}

/** Rainfall presets used by the scenario simulator. */
export const SCENARIOS = {
  velacheryHeavyRain: {
    id: "velacheryHeavyRain",
    title: "Heavy rainfall over Velachery",
    description: "Simulates an extremely heavy cloudburst centred on Velachery, with spill-over into neighbouring localities.",
    readings: {
      velachery: [215, 48],
      madipakkam: [124, 24],
      pallikaranai: [142, 26],
      perungudi: [112, 21],
    } as Record<string, [number, number]>,
  },
  citywideCyclone: {
    id: "citywideCyclone",
    title: "Cyclone landfall — citywide",
    description: "Simulates very heavy rain across all localities during a cyclone landfall.",
    readings: {
      velachery: [230, 52],
      tambaram: [190, 40],
      adyar: [176, 38],
      saidapet: [168, 35],
      perungudi: [182, 39],
      pallikaranai: [205, 44],
      madipakkam: [188, 41],
      tnagar: [150, 32],
    } as Record<string, [number, number]>,
  },
  rainSubsides: {
    id: "rainSubsides",
    title: "Rain subsides",
    description: "Returns rainfall to the baseline monsoon-day values.",
    readings: BASELINE_RAINFALL,
  },
} as const;

export type ScenarioId = keyof typeof SCENARIOS;
