# Disaster-Shield AI

**Smart India Hackathon 2026 · Team Debug Decoders**

AI-assisted flood risk monitoring, early warning, rescue coordination and relief-shelter management for Indian cities. Pilot region: **Chennai, Tamil Nadu** (Velachery, Tambaram, Adyar, Saidapet, Perungudi, Pallikaranai, Madipakkam, T. Nagar).

> **Prototype disclaimer.** All rainfall readings, incidents, people, phone numbers, rescue teams and shelters are **simulated sample data**. Flood-risk scores come from a **transparent rule-based engine**, not a trained or scientifically validated model. No live government feed (IMD, GCC, TNSDMA) is connected, and SOS requests are not sent to real emergency services.

---

## 1. Features implemented

All five modules read and write **one shared data store**, so every action is reflected everywhere immediately (and across browser tabs).

| Module | What works |
| --- | --- |
| **Government Dashboard** (`/dashboard`) | KPI cards (city risk level, affected areas, active SOS, available teams, shelters, free capacity) · Leaflet/OSM monitoring map (risk zones, SOS, flooded roads, shelters, teams) · risk-by-locality chart · rainfall trend · SOS status chart · shelter occupancy chart · recent SOS table · active alerts · flood-report verification · team availability · live activity feed · **risk-engine banner that drafts a red alert** for high-risk zones |
| **AI Risk Heatmap** (`/risk-map`) | Red/orange/green heat zones on OpenStreetMap · click a zone for score, category, rainfall, intensity and a **factor-by-factor explanation** · layer toggles (SOS, flooded roads, shelters, teams) · legend · locality ranking · rainfall trend · **scenario simulator** (Velachery cloudburst, citywide cyclone, rain subsides, custom sliders) · "re-run on server API" check |
| **Resident Portal** (`/resident/*`) | One-tap SOS (type, urgency, people, GPS / tap-on-map location, description, validation) · report flooded road (severity, depth, location) · active alerts with safety instructions (my area / all) · nearby shelters sorted by distance with capacity, facilities, call and OSM directions · **SOS tracking** (Submitted → Assigned → In Progress → Resolved timeline, team contact) and lookup by reference + phone · Tamil sub-labels · helpline numbers |
| **Rescue Management** (`/rescue`) | Triage queue sorted by urgency and waiting time · map of SOS and teams · **nearest-capable-team recommendation** · assign / reassign · progress notes · In Progress / Resolved updates · team availability table · rescue-team role sees **only its own team's assignments** |
| **Shelter Management** (`/shelters`) | All shelters with occupancy bars, facilities, distance from any locality · update occupancy (+/-10, auto-"Full") · add / edit / remove shelter (admin) with map location picker · map of shelters near risk zones and SOS |
| **Alerts** (`/alerts`) | Issue Yellow / Orange / Red (IMD-style) alerts to selected localities with safety instructions · withdraw / re-activate · risk-engine recommendation |
| **Administration** (`/admin`) | Users & roles (change role, team, activate/deactivate, add user) · rescue teams (add/edit) · data counts, JSON export, demo reset, API health check · **permission matrix** |
| **Demo Guide** (`/demo`) | 7-step guided Velachery scenario with automatic progress detection and one-click role switching |

**Roles:** Resident · Government Official · Rescue Team · Administrator — each with its own navigation, landing page and permissions.

## 2. Demo walkthrough (for judges)

1. Open the app → **Start guided demo** (signs in as a Government Official and opens `/demo`).
2. **Run simulation** → Velachery rainfall jumps to 215 mm / 24 h; its score goes from ~43 (Moderate) to ~73 (**High**) and the zone turns red on the heatmap with an explanation.
3. **Dashboard** → risk level becomes High; click **Issue red alert** (pre-drafted by the risk engine).
4. **Resident** → Emergency SOS → *Fill Velachery demo example* → send. A reference such as `SOS-1042` is issued.
5. **Official** → Rescue Management → *Assign rescue team* → SDRF Boat Team Alpha is recommended (≈1 km, boat capability).
6. **Rescue team lead** → *Mark In Progress* with a note.
7. **Resident** → Track My SOS shows Submitted → Assigned → In Progress with the team's contact.
8. **Official** → Shelter Management → update occupancy at Velachery Corporation HSS; the resident's *Nearby Shelters* and the dashboard update.

Tip: open a second tab as the Resident — each tab keeps its own role and changes sync instantly. Use **Reset demo data** on `/demo` to present again.

## 3. Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Lucide icons · Leaflet + OpenStreetMap tiles · Recharts · Supabase (Postgres, Auth, RLS, Realtime) via `@supabase/supabase-js` · Next.js route handlers · Vercel.

No separate Python backend, no React Native, no Firebase.

## 4. Project structure

```
disaster-shield-ai/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 # Landing + demo role selection / Supabase sign-in
│  │  ├─ (app)/                   # Authenticated shell (sidebar + top bar)
│  │  │  ├─ dashboard/  risk-map/  rescue/  shelters/  alerts/  admin/  demo/
│  │  │  └─ resident/  (home, sos, report, alerts, shelters, track)
│  │  └─ api/
│  │     ├─ risk/assess/route.ts  # Server-side risk scoring endpoint
│  │     ├─ admin/users/route.ts  # Admin-only account creation (Supabase service key)
│  │     └─ health/route.ts
│  ├─ components/                 # UI by module (dashboard, risk, resident, rescue, shelters, alerts, admin, demo, map, charts, ui, layout)
│  └─ lib/
│     ├─ types.ts                 # Domain model (mirrors the SQL schema)
│     ├─ risk/engine.ts           # Rule-based model behind a RiskModel interface
│     ├─ risk/index.ts            # Model registry (plug ML models in here)
│     ├─ auth/permissions.ts      # Role → permission matrix, authorize(), canUpdateSOS()
│     ├─ validation.ts            # Shared form + write validation
│     └─ data/
│        ├─ backend.ts            # Backend interface used by every module
│        ├─ demo-backend.ts       # Demo mode: localStorage + cross-tab sync
│        ├─ supabase-backend.ts   # Supabase mode: RLS, RPCs, realtime
│        ├─ mutations.ts          # Authorised, validated state transitions
│        ├─ selectors.ts          # Stats, triage order, team recommendation
│        └─ seed.ts               # Simulated Chennai data + scenarios
├─ supabase/
│  ├─ migrations/0001_init.sql    # Schema, RLS policies, RPC functions, realtime
│  └─ seed.sql                    # Generated from seed.ts (npm run db:seed-sql)
├─ scripts/
│  ├─ verify-logic.ts             # 19 checks: permissions, workflow, validation, risk
│  └─ generate-seed-sql.ts
└─ .env.example
```

## 5. Run locally

Requirements: Node.js 20+ (built with Node 24) and npm.

```bash
npm install
npm run dev            # http://localhost:3000
```

Other scripts:

```bash
npm run build && npm start   # production build / server
npm run lint                 # ESLint
npm run typecheck            # TypeScript
npm run verify               # logic checks (permissions, SOS workflow, risk engine)
npm run db:seed-sql          # regenerate supabase/seed.sql from src/lib/data/seed.ts
```

Without any environment variables the app runs in **demo mode** — nothing else to configure.

## 6. Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL. Setting this **and** the anon key switches to Supabase mode. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon (public) key. Safe in the browser because RLS protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Used only by `/api/admin/users` after verifying the caller is an admin. Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_DATA_MODE` | optional | Set to `demo` to force demo mode even if Supabase variables exist. |

Copy `.env.example` to `.env.local` for local development.

## 7. Supabase setup (optional)

1. Create a project at [supabase.com](https://supabase.com) → copy the **Project URL**, **anon key** and **service_role key** (Project Settings → API).
2. SQL Editor → run `supabase/migrations/0001_init.sql` (enums, 12 tables, RLS, `assign_team` / `update_sos_status` / `track_sos` functions, realtime publication).
3. SQL Editor → run `supabase/seed.sql` (Chennai sample data).
4. Authentication → Providers → keep **Email** enabled (disable "Confirm email" for a quicker demo if you prefer).
5. Add the variables to `.env.local` and restart `npm run dev`.
6. Sign up through the app (new accounts are Residents), then promote staff in the SQL editor:
   ```sql
   update public.profiles set role = 'admin'    where email = 'admin@yourmail.com';
   update public.profiles set role = 'official' where email = 'official@yourmail.com';
   update public.profiles set role = 'rescue', team_id = 'team-1' where email = 'rescue@yourmail.com';
   ```
   After that, admins can manage roles from `/admin`.

**Security model in Supabase mode:** every table has Row Level Security (residents see only their own SOS, rescue teams only their team's assignments, staff see all). Team assignment and status changes run in `SECURITY DEFINER` functions that re-check the caller's role and the allowed status transition in Postgres. A trigger blocks non-admins from changing `role`, `team_id` or `active`. Staff invitations go through a server route that verifies the caller's admin role before using the service key.

## 8. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repository (framework preset: Next.js; build command `next build`; no other settings needed).
3. Optional: add the environment variables from section 6 (Production + Preview). Leave them empty to deploy in demo mode.
4. Deploy, then open `https://<your-app>.vercel.app/api/health` — it reports `dataMode: "demo"` or `"supabase"`.

Or from the CLI: `npm i -g vercel` → `vercel` → `vercel --prod`.

## 9. Deploy to Render

The repository includes a `render.yaml` blueprint (free plan, Singapore region, Node 22).

1. On [render.com](https://render.com) → **New → Blueprint** → connect this repository → **Apply**. Or create a **Web Service** manually with:
   - Runtime: **Node** · Branch: `main`
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `npm start` (Next.js reads Render's `PORT` automatically)
   - Environment: `NODE_VERSION=22`
2. Optional: add the Supabase variables from section 6. `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.
3. Pushing to `main` redeploys automatically. Check `https://<service>.onrender.com/api/health`.

Free Render instances sleep after about 15 minutes without traffic; the first visit after that can take up to a minute while the service wakes. Open the site a few minutes before a live demo.

## 10. How the risk engine works

`score = rainfall (max 35) + intensity (10) + waterlogging reports (20) + active SOS (15) + historical susceptibility (20)`

- **Rainfall:** 24-hour accumulation scaled to the IMD "extremely heavy" threshold (204.5 mm).
- **Intensity:** current mm/hr, saturating at 40 mm/hr (a prototype assumption).
- **Reports:** active flood reports in the locality (low 4, moderate 7, severe 10 points).
- **Incidents:** unresolved SOS in the locality (high/critical 5, others 3 points).
- **History:** a *sample* susceptibility index (0–1) per locality — replace with surveyed data.
- **Category:** Low < 40 ≤ Moderate < 70 ≤ High.

Every factor's input, points and plain-language reason is shown in the UI. To add a trained model, implement the `RiskModel` interface in `src/lib/risk/engine.ts` (or wrap a remote inference API) and register it in `src/lib/risk/index.ts`; the UI and `/api/risk/assess` use whichever model is active.

## 11. Limitations and incomplete items

- **Simulated data only.** No IMD/rain-gauge, GIS drainage or government feeds are integrated; the scenario simulator stands in for live rainfall.
- **Not a validated model.** Weights and thresholds are illustrative and need calibration with historical flood records.
- **Demo-mode security is not real security.** In demo mode, permissions are checked in the data layer but it runs in the browser and data lives in that browser's localStorage (shared only between tabs of the same browser, not between devices).
- **Supabase mode is implemented but untested against a live project.** The SQL was checked with the PostgreSQL parser, but no Supabase credentials were available during the build, so sign-up, RLS policies, RPCs, realtime and `/api/admin/users` have not been exercised end-to-end.
- In Supabase mode, demo residents in `seed.sql` are not auth users, so seeded SOS requests have no linked resident; anonymous (no-login) SOS submission is not enabled (tracking by reference works via `track_sos`).
- No SMS / push / WhatsApp notification delivery — alerts appear in the app only.
- Shelter "nearest" uses straight-line distance, not road routing; directions open OpenStreetMap.
- Map tiles come from the public OpenStreetMap tile server (fine for a demo; use a tile provider for production traffic). An internet connection is needed for tiles.
- Tamil labels cover the resident home tiles only; full localisation is not implemented.
