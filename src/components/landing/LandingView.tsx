"use client";

import {
  ArrowRight,
  CirclePlay,
  FlaskConical,
  House,
  LayoutDashboard,
  LifeBuoy,
  Map,
  ShieldCheck,
  Tent,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandMark } from "@/components/layout/Sidebar";
import { useToast } from "@/components/ui/Toast";
import { Field, Input } from "@/components/ui/form";
import { Button, Skeleton } from "@/components/ui/primitives";
import { ROLE_HOME } from "@/lib/auth/permissions";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import { useAppData } from "@/lib/data/AppDataProvider";
import { DEMO_LOGIN_USERS } from "@/lib/data/seed";
import { cn } from "@/lib/format";
import type { Role } from "@/lib/types";

const ROLE_CARDS: { role: Role; icon: LucideIcon; blurb: string; tone: string }[] = [
  { role: "official", icon: LayoutDashboard, blurb: "Monitor the city, read the risk heatmap, assign rescue teams, issue alerts.", tone: "text-navy-700 bg-navy-50" },
  { role: "resident", icon: House, blurb: "Send an SOS, report flooded roads, view alerts, find shelters, track help.", tone: "text-red-700 bg-red-50" },
  { role: "rescue", icon: LifeBuoy, blurb: "See assigned emergencies on the map and update rescue progress.", tone: "text-orange-700 bg-orange-50" },
  { role: "admin", icon: UserCog, blurb: "Manage users and roles, shelters, rescue teams and system data.", tone: "text-teal-700 bg-teal-50" },
];

const MODULES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: LayoutDashboard, title: "Government Dashboard", text: "Live operational picture across localities" },
  { icon: Map, title: "AI Risk Heatmap", text: "Explainable 0–100 flood-risk score per zone" },
  { icon: House, title: "Resident Portal", text: "SOS, flood reports, alerts, shelters, tracking" },
  { icon: LifeBuoy, title: "Rescue Management", text: "Triage, nearest-team assignment, status updates" },
  { icon: Tent, title: "Shelter Management", text: "Capacity, occupancy and facilities" },
];

function nextParam(): string | null {
  if (typeof window === "undefined") return null;
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
}

export function LandingView() {
  const { status, mode, user, backend, state } = useAppData();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  async function enterAs(role: Role, goTo?: string, key: string = role) {
    setPending(key);
    try {
      await backend.signInDemo(DEMO_LOGIN_USERS[role]);
      router.push(goTo ?? nextParam() ?? ROLE_HOME[role]);
    } catch (err) {
      toast.fromError(err, "Could not sign in");
      setPending(null);
    }
  }

  return (
    <div className="min-h-dvh bg-navy-950 text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <BrandMark />
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <section>
            <p className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300 ring-1 ring-teal-400/30">
              <ShieldCheck className="size-3.5" /> Urban flood preparedness &amp; response · Chennai pilot
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Predict. Warn. Rescue. <span className="text-teal-300">Recover.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-navy-200">
              {APP_NAME} connects government control rooms, residents, rescue teams and relief centres on one
              platform — from an explainable flood-risk heatmap to SOS triage and shelter capacity, all driven by the
              same shared data.
            </p>

            <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
              {MODULES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-teal-300" />
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-navy-300">{text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-navy-300">
              <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-violet-300" />
              Prototype. Rainfall, incidents, teams and shelters shown are simulated sample data for Chennai. Risk scores
              come from a transparent rule-based engine, not a validated forecast, and no live government feed is connected.
            </p>
          </section>

          <section className="rounded-2xl bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
            {status === "loading" ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : mode === "demo" ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-navy-950">Choose a demo role</h2>
                    <p className="mt-0.5 text-sm text-slate-500">No password needed — every role shares the same live data.</p>
                  </div>
                  <span className="rounded-md border border-dashed border-violet-300 bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                    Demo mode
                  </span>
                </div>

                <Button
                  variant="teal"
                  size="lg"
                  className="mt-4 w-full"
                  loading={pending === "guided"}
                  disabled={!!pending}
                  onClick={() => void enterAs("official", "/demo", "guided")}
                >
                  <CirclePlay className="size-5" /> Start guided demo<span className="hidden sm:inline">(Velachery flood scenario)</span>
                </Button>

                <div className="mt-4 grid gap-2.5">
                  {ROLE_CARDS.map(({ role, icon: Icon, blurb, tone }) => {
                    const u = state?.users.find((x) => x.id === DEMO_LOGIN_USERS[role]);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => enterAs(role)}
                        disabled={!!pending}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-navy-300 hover:bg-navy-50/40 disabled:opacity-60"
                      >
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", tone)}>
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-navy-950">{ROLE_LABELS[role]}</span>
                          <span className="block text-xs text-slate-500">{blurb}</span>
                          {u && <span className="mt-0.5 block text-[11px] text-slate-400">Signs in as {u.name}</span>}
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>

                {user && (
                  <p className="mt-4 text-center text-xs text-slate-500">
                    Currently signed in as <strong>{user.name}</strong> ({ROLE_LABELS[user.role]}).{" "}
                    <button className="font-semibold text-teal-700 hover:underline" onClick={() => router.push(ROLE_HOME[user.role])}>
                      Continue
                    </button>
                  </p>
                )}
              </>
            ) : (
              <SupabaseAuthForm />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SupabaseAuthForm() {
  const { backend, user } = useAppData();
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        await backend.signInWithPassword(form.email, form.password);
        router.push(nextParam() ?? "/demo");
      } else {
        await backend.signUp(form);
        toast.success("Account created", "Check your email to confirm, then sign in. New accounts start as Residents.");
        setMode("signin");
      }
    } catch (err) {
      toast.fromError(err, mode === "signin" ? "Sign-in failed" : "Sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-bold text-navy-950">Welcome back, {user.name}</h2>
        <p className="mt-1 text-sm text-slate-500">Signed in as {ROLE_LABELS[user.role]}.</p>
        <Button className="mt-4" onClick={() => router.push(ROLE_HOME[user.role])}>
          Open my workspace <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-lg font-bold text-navy-950">{mode === "signin" ? "Sign in" : "Create a resident account"}</h2>
      {mode === "signup" && (
        <>
          <Field label="Full name" htmlFor="name" required>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Mobile number" htmlFor="phone">
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </>
      )}
      <Field label="Email" htmlFor="email" required>
        <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </Field>
      <Button type="submit" className="w-full" loading={busy}>
        {mode === "signin" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-xs text-slate-500">
        {mode === "signin" ? "New resident?" : "Already registered?"}{" "}
        <button type="button" className="font-semibold text-teal-700 hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
      <p className="text-center text-[11px] text-slate-400">Official, rescue and admin roles are granted by an administrator.</p>
    </form>
  );
}
