"use client";

import {
  ArrowRight,
  CircleCheckBig,
  CloudRain,
  LayoutDashboard,
  LifeBuoy,
  MonitorSmartphone,
  RotateCcw,
  Siren,
  Tent,
  ClipboardList,
  CirclePlay,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSwitchRole } from "@/components/layout/useSwitchRole";
import { useRunScenario } from "@/components/risk/ScenarioPanel";
import { RiskBadge, SimulatedTag, SOSStatusBadge } from "@/components/ui/badges";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button, Card, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { ROLE_LABELS } from "@/lib/constants";
import { useReadyData, useRiskAssessments } from "@/lib/data/AppDataProvider";
import { teamById } from "@/lib/data/selectors";
import { DEMO_LOGIN_USERS, SCENARIOS } from "@/lib/data/seed";
import { cn } from "@/lib/format";
import type { Role } from "@/lib/types";

interface Step {
  n: number;
  title: string;
  role: Role;
  icon: ReactNode;
  body: ReactNode;
  lookFor: string;
  done: boolean;
  actions: ReactNode;
}

export function DemoGuideView() {
  const { state, user, backend, mode } = useReadyData();
  const assessments = useRiskAssessments(state);
  const switchRole = useSwitchRole();
  const runScenario = useRunScenario();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const vel = assessments["velachery"];
  const residentId = DEMO_LOGIN_USERS.resident;
  const demoSOS = state.sos
    .filter((s) => s.zoneId === "velachery" && s.residentId === residentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const assignedTeam = demoSOS ? teamById(state, demoSOS.assignedTeamId) : null;
  const teamLead = assignedTeam ? state.users.find((u) => u.role === "rescue" && u.teamId === assignedTeam.id && u.active) : null;
  const statusIdx = demoSOS ? ["submitted", "assigned", "in_progress", "resolved"].indexOf(demoSOS.status) : -1;
  const redAlert = state.alerts.some((a) => a.active && a.level === "red" && a.zoneIds.includes("velachery"));
  const shelterTouched = !!demoSOS && state.shelters.some((s) => s.updatedAt > demoSOS.createdAt);

  async function runStep1() {
    setBusy(true);
    try {
      if (user?.role !== "official" && user?.role !== "admin") await backend.signInDemo(DEMO_LOGIN_USERS.official);
      const s = SCENARIOS.velacheryHeavyRain;
      await runScenario(s.readings, s.title, "velachery");
    } finally {
      setBusy(false);
    }
  }

  const steps: Step[] = [
    {
      n: 1,
      title: "AI Risk Heatmap — simulate heavy rainfall in Velachery",
      role: "official",
      icon: <CloudRain className="size-5" />,
      body: (
        <>
          A simulated cloudburst pushes Velachery&apos;s 24-hour rainfall above 200 mm. The rule-based engine recalculates the score and the zone turns
          red. Current score: {vel ? <RiskBadge category={vel.category} score={vel.score} /> : "—"}
        </>
      ),
      lookFor: "Velachery turns red; the explanation panel shows rainfall and intensity as the main drivers.",
      done: vel?.category === "high",
      actions: (
        <>
          <Button variant="danger" size="sm" onClick={runStep1} loading={busy} disabled={mode !== "demo" && user?.role !== "official" && user?.role !== "admin"}>
            <CloudRain className="size-3.5" /> Run simulation
          </Button>
          <Button variant="outline" size="sm" onClick={() => switchRole(DEMO_LOGIN_USERS.official, "/risk-map")}>
            Open heatmap <ArrowRight className="size-3.5" />
          </Button>
        </>
      ),
    },
    {
      n: 2,
      title: "Government Dashboard — high-risk area and red alert",
      role: "official",
      icon: <LayoutDashboard className="size-5" />,
      body: "The dashboard's risk level, affected-area count and risk chart update. A banner recommends a red alert for Velachery — issue it from the banner.",
      lookFor: "“Current risk level: High” card, red banner, and the new alert in the Active alerts list.",
      done: redAlert,
      actions: (
        <Button variant="primary" size="sm" onClick={() => switchRole(DEMO_LOGIN_USERS.official, "/dashboard")}>
          Open dashboard as Official <ArrowRight className="size-3.5" />
        </Button>
      ),
    },
    {
      n: 3,
      title: "Resident Portal — send an SOS from Velachery",
      role: "resident",
      icon: <Siren className="size-5" />,
      body: (
        <>
          Sign in as resident Priya Raman, open Emergency SOS, tap <em>Fill Velachery demo example</em> (or fill it yourself) and send.
          {demoSOS && (
            <span className="mt-1 flex items-center gap-2">
              Latest demo request: <strong className="font-mono">{demoSOS.reference}</strong> <SOSStatusBadge status={demoSOS.status} />
            </span>
          )}
        </>
      ),
      lookFor: "A reference number (e.g. SOS-1042) and the Submitted step. The Red alert also appears on the resident home screen.",
      done: !!demoSOS,
      actions: (
        <Button variant="danger" size="sm" onClick={() => switchRole(DEMO_LOGIN_USERS.resident, "/resident/sos")}>
          Open SOS form as Resident <ArrowRight className="size-3.5" />
        </Button>
      ),
    },
    {
      n: 4,
      title: "Rescue Management — official assigns the nearest team",
      role: "official",
      icon: <LifeBuoy className="size-5" />,
      body: "The new SOS is at the top of the Pending queue. Click “Assign rescue team” — the system recommends the nearest available team with a matching capability.",
      lookFor: "SDRF Boat Team Alpha recommended (about 1 km away, boat capability); status changes to Assigned and the team to Deployed.",
      done: statusIdx >= 1,
      actions: (
        <Button
          variant="primary"
          size="sm"
          disabled={!demoSOS}
          onClick={() => switchRole(DEMO_LOGIN_USERS.official, demoSOS ? `/rescue?sos=${demoSOS.id}` : "/rescue")}
        >
          Open rescue console as Official <ArrowRight className="size-3.5" />
        </Button>
      ),
    },
    {
      n: 5,
      title: "Rescue team updates the operation to In Progress",
      role: "rescue",
      icon: <CirclePlay className="size-5" />,
      body: (
        <>
          Switch to the lead of the assigned team{teamLead ? ` (${teamLead.name}, ${assignedTeam?.name})` : ""}. Their console only shows requests
          assigned to their team. Add a note and press <em>Mark In Progress</em>.
        </>
      ),
      lookFor: "Status moves to In Progress with the team's note on the timeline.",
      done: statusIdx >= 2,
      actions: (
        <Button
          variant="primary"
          size="sm"
          disabled={!teamLead || !demoSOS}
          onClick={() => teamLead && demoSOS && switchRole(teamLead.id, `/rescue?sos=${demoSOS.id}`)}
        >
          Open as assigned team <ArrowRight className="size-3.5" />
        </Button>
      ),
    },
    {
      n: 6,
      title: "Resident tracking — status updates automatically",
      role: "resident",
      icon: <ClipboardList className="size-5" />,
      body: "Back as the resident, Track My SOS shows the progress stepper, the assigned team with its contact number, and every update note.",
      lookFor: "Submitted → Assigned → In Progress, with the rescue team card.",
      done: statusIdx >= 2,
      actions: (
        <Button variant="primary" size="sm" onClick={() => switchRole(DEMO_LOGIN_USERS.resident, "/resident/track")}>
          Open tracking as Resident <ArrowRight className="size-3.5" />
        </Button>
      ),
    },
    {
      n: 7,
      title: "Shelter Management — capacity and facilities",
      role: "official",
      icon: <Tent className="size-5" />,
      body: "The official sorts shelters by distance from Velachery and records evacuees arriving (Update occupancy). Residents see the new free capacity in Nearby Shelters.",
      lookFor: "Velachery Corporation HSS listed first; available places drop after the update; dashboard capacity card changes.",
      done: shelterTouched,
      actions: (
        <>
          <Button variant="primary" size="sm" onClick={() => switchRole(DEMO_LOGIN_USERS.official, "/shelters")}>
            Shelters as Official <ArrowRight className="size-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => switchRole(DEMO_LOGIN_USERS.resident, "/resident/shelters")}>
            Nearby shelters as Resident
          </Button>
        </>
      ),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done)?.n ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SectionTitle
        title="Guided demo: heavy rainfall in Velachery"
        subtitle="Walk through all five modules working on the same live data. Progress is detected automatically."
        action={
          mode === "demo" ? (
            <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-3.5" /> Reset demo data
            </Button>
          ) : null
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-navy-950">
            {doneCount} of {steps.length} steps complete
          </span>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            Signed in as <Badge tone="navy">{user ? `${user.name} · ${ROLE_LABELS[user.role]}` : "—"}</Badge>
          </span>
        </div>
        <ProgressBar className="mt-2" value={doneCount} max={steps.length} />
        <p className="mt-3 flex items-start gap-2 text-xs text-slate-600">
          <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-teal-700" />
          Tip: open the app in a second browser tab (or a phone on the same network) as the Resident. Each tab keeps its own role, and changes made
          in one tab appear in the other instantly.
        </p>
        <div className="mt-2">
          <SimulatedTag label="All data in this scenario is simulated" />
        </div>
      </Card>

      <ol className="space-y-3">
        {steps.map((s) => {
          const isCurrent = s.n === current;
          return (
            <li key={s.n}>
              <Card className={cn("p-4 transition-colors", isCurrent && "border-teal-400 ring-2 ring-teal-100", s.done && "bg-slate-50/60")}>
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                      s.done ? "bg-teal-600 text-white" : isCurrent ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {s.done ? <CircleCheckBig className="size-5" /> : s.n}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-navy-600">{s.icon}</span>
                      <h2 className="text-sm font-bold text-navy-950">{s.title}</h2>
                      <Badge tone={s.role === "resident" ? "red" : s.role === "rescue" ? "orange" : "navy"}>{ROLE_LABELS[s.role]}</Badge>
                      {s.done && <Badge tone="teal">Done</Badge>}
                      {isCurrent && <Badge tone="violet">Next</Badge>}
                    </div>
                    <div className="mt-1.5 text-sm text-slate-700">{s.body}</div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      <strong className="text-slate-600">Look for:</strong> {s.lookFor}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">{s.actions}</div>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await backend.resetDemoData();
                setConfirmReset(false);
                toast.success("Demo reset", "Velachery is back to moderate risk. Start again from step 1.");
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">This restores the original sample data in this browser so the scenario can be presented again from step 1.</p>
      </Modal>
    </div>
  );
}
