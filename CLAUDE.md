# CLAUDE.md: Disaster-Shield AI project instructions

These are the permanent instructions for this project. Every development session follows them.
Read this whole file and the whole of [`PLAN.md`](PLAN.md) before starting any task.

@AGENTS.md

---

## 0. Mandatory workflow

### Before any task

This applies to every feature, modification, debugging session, test run, integration or deployment.

1. Read this whole file (`CLAUDE.md`).
2. Read the whole of `PLAN.md`: current progress, completed and pending tasks, known issues and next steps.
3. Check the code to confirm what is actually implemented. If the code and the docs disagree, the code is right. Fix the docs and say so.
4. Pick the next task: the one the owner asked for, or otherwise the next item in `PLAN.md` → *Next steps*.
5. Follow the rules in this file while doing it.
6. Read both files again before moving to the next task or phase. Conversation history or memory is not a substitute.

### After every significant task

1. **Update `PLAN.md`:**
   - tick completed items and add new pending items;
   - add bugs and errors with their fixes to the *Bugs and issues log*;
   - add testing results and deployment status;
   - rewrite *Next steps*.
2. **Update `CLAUDE.md`** whenever the architecture, stack, dependencies, coding rules or an important decision changes. Add decisions to §15 *Decision log*.
3. **Never tick `[x]` for work that has not been implemented and tested.** Mark built-but-unverified work *implemented, untested*.
4. **Keep both files consistent with the code.**
   - Never delete useful documentation or overwrite a recorded decision without a reason.
   - Record the reason in the decision log.
5. **Report at the end of each session** what was completed and what remains.

---

## 1. Project overview

**Disaster-Shield AI** is a web platform prototype for **urban flood preparedness and response**. The pilot region is **Chennai, Tamil Nadu**, covering eight localities: Velachery, Tambaram, Adyar, Saidapet, Perungudi, Pallikaranai, Madipakkam and T. Nagar.

**Objectives**

- Show which localities face flood risk now and **why**, using a transparent and explainable risk score.
- Let officials issue IMD-style early warnings (Yellow / Orange / Red) to affected localities.
- Give residents one-tap SOS, flooded-road reporting, alerts, nearby shelters and SOS tracking.
- Coordinate rescue: triage, nearest-capable-team recommendation, assignment and status tracking. The status flow is Submitted → Assigned → In Progress → Resolved.
- Manage relief shelters: capacity, occupancy, facilities and availability.
- Connect all modules through **one shared data store**, so one action shows up everywhere, including in other browser tabs.

**Demo storyline (Velachery heavy rainfall)**

1. A simulation pushes Velachery from about 43 (Moderate) to about 73 (**High**).
2. The official issues a red alert.
3. A resident sends an SOS.
4. The official assigns SDRF Boat Team Alpha, which the system recommends (about 1 km away, boat capability).
5. The rescue lead marks the SOS In Progress.
6. The resident tracks progress.
7. The official updates occupancy at Velachery Corporation HSS.

Live site: <https://disaster-shield-ai-r7x6.onrender.com> (demo mode).
Repository: <https://github.com/vjxeyy/disaster-shield-ai> (public, branch `main`).

---

## 2. Non-negotiable rules from the project owner

1. **Honesty about data and models.**
   - Never claim that predictions are scientifically validated.
   - Never claim that live government feeds (IMD, GCC, TNSDMA) are connected. They are not.
   - The risk engine is rule-based, and its weights are illustrative.
2. **Label simulated data clearly** everywhere it appears. Use `SimulatedTag` from `src/components/ui/badges.tsx`, plus the existing banners and disclaimers.
3. **Security never relies on hiding buttons.**
   - Every write goes through `authorize()` in the data layer.
   - In Supabase mode, Row Level Security and `SECURITY DEFINER` RPCs are the real enforcement.
   - UI hiding (nav roles, `RoleGuard`) is only for user experience.
4. **Do not rename the project without explicit approval.**
   - The name is **Disaster-Shield AI**. It is `APP_NAME` in `src/lib/constants.ts`, and the package and repo are `disaster-shield-ai`.
   - The owner chose to keep this name on 2026-11-19 after a name-conflict check.
5. **No team name or hackathon name in the UI.** The owner removed them on request, together with the old "Chennai flood response · Prototype" subtitle.
   - `TEAM_NAME` and `EVENT_NAME` no longer exist; do not re-add them.
   - `README.md` still mentions them in its title block. Change it only if asked.
6. **Stack limits:** no React Native, no FastAPI or other Python backend, no Firebase.
7. **Git and deployment:**
   - Commit or push only when the owner asks. Pushing to `main` **automatically redeploys Render**. Put `[skip render]` in the commit message for doc-only commits that should not redeploy.
   - Never commit secrets. `.env*` is git-ignored except `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never get a `NEXT_PUBLIC_` prefix.
8. **Outward-facing actions need approval first:** deploying, buying or attaching a domain, changing Render or GitHub settings.

---

## 3. Technology stack

| Layer | Choice (installed version) |
| --- | --- |
| Framework | **Next.js 16.4.6** (App Router, Turbopack, `cacheComponents` + `partialPrefetching`) |
| UI runtime | React 19.3, TypeScript 5 (strict) |
| Styling | Tailwind CSS 4.3.3, with tokens in `@theme` in `src/app/globals.css` (via `@tailwindcss/turbopack`) |
| Icons | lucide-react 1.76. Uses the **v1 icon names**; see §10. |
| Maps | Leaflet 1.9.4 + OpenStreetMap tiles, through a **custom wrapper** (not react-leaflet) |
| Charts | Recharts 3.11 |
| Backend (optional) | Supabase (Postgres, Auth, RLS, Realtime) via `@supabase/supabase-js` 2.119 |
| Server code | Next.js route handlers in `src/app/api/*` |
| Tooling | ESLint 9 (`eslint-config-next`, including the React-compiler rules), `tsx` for scripts |
| Hosting | **Render** (live). Vercel instructions exist, but it is not deployed. |
| Node | 22 on Render (`NODE_VERSION`); the local build used Node 24. Requires Node ≥ 20. |

**This is Next.js 16.** The APIs differ from older versions. Read the relevant guide in `node_modules/next/dist/docs/` before using an unfamiliar API (see `AGENTS.md`).

---

## 4. Architecture

```
Browser: client components ("use client")
  │  useReadyData() / useAppData() / useRiskAssessments()   ← useSyncExternalStore
  ▼
AppDataProvider (src/lib/data/AppDataProvider.tsx)
  │  Backend interface (src/lib/data/backend.ts); mode chosen by isSupabaseConfigured()
  ├─ DemoBackend (demo-backend.ts)              ← default when no Supabase env vars are set
  │    • state → localStorage  "dsa:state:v1"
  │    • session (per tab) → sessionStorage "dsa:session:v1", fallback localStorage "dsa:last-session:v1"
  │    • cross-tab sync via the window "storage" event
  │    • every write = pure function in mutations.ts: authorize → validate → new state + activity entry
  └─ SupabaseBackend (supabase-backend.ts)      ← when URL + anon key are set and NEXT_PUBLIC_DATA_MODE ≠ "demo"
       • reads tables under RLS; writes via table APIs + RPCs (assign_team, update_sos_status, track_sos)
       • realtime change → refetch; staff invites → /api/admin/users
Risk engine (src/lib/risk): RiskModel registry → computed in the client and by POST /api/risk/assess
Route handlers: /api/health · /api/risk/assess · /api/admin/users
```

- The server snapshot of the store is a **loading** state. All data UI is client-rendered.
- In demo mode, data lives in **each visitor's browser**. Tabs in one browser share it; different devices do not.
- With `cacheComponents` on, visited routes stay mounted inside React `<Activity>`. Effects must clean up when hidden, so the Leaflet map is destroyed and re-created.

### Key files

| Path | Purpose |
| --- | --- |
| `src/lib/types.ts` | Domain model (mirrors the SQL schema): entities, `AppState`, input types |
| `src/lib/constants.ts` | `APP_NAME`, labels, colours (`RISK_HEX`), alert levels, facilities, safety instructions, map centre `[12.982, 80.2]` zoom 12 |
| `src/lib/auth/permissions.ts` | `PERMISSIONS` matrix, `can`, `authorize`, `AuthorizationError`, `canUpdateSOS`, `ROLE_HOME` |
| `src/lib/validation.ts` | Shared validation for forms and writes: Indian mobile regex, Chennai bounds, `ValidationError` |
| `src/lib/data/seed.ts` | Simulated Chennai data, `SCHEMA_VERSION` (currently **3**), `SCENARIOS`, `DEMO_LOGIN_USERS` |
| `src/lib/data/mutations.ts` | Pure, authorised, validated state transitions |
| `src/lib/data/selectors.ts` | `dashboardStats`, `sortSOSForTriage`, `recommendTeams`, `zonesNeedingAlert`, `shelterAvailable` |
| `src/lib/risk/engine.ts`, `src/lib/risk/index.ts` | Rule-based model plus registry: `getRiskModel`, `buildRiskInput`, `assessAllZones` |
| `src/lib/format.ts`, `src/lib/geo.ts` | `cn`, `escapeHtml`, date and number formatting; `distanceKm`, `nearestZone`, `directionsUrl` |
| `src/components/ui/*` | Primitives (`Button`, `Card`, `CardHeader`, `Field`, `Input`, `Select`, `Textarea`, `Segmented`, `ChoiceTiles`, `ProgressBar`, `EmptyState`, `Skeleton`, `SectionTitle`), `Modal`, `Toast`, badges |
| `src/components/layout/*` | `nav.ts` (routes and allowed roles), `Sidebar`, `Topbar`, `RoleSwitcher`, `AppShell`, `RoleGuard`, `useSwitchRole` |
| `src/components/map/*` | `LeafletMap` (custom wrapper), `MapView` (dynamic, `ssr:false`), `layers.ts`, `MapLegend` |
| `src/app/(app)/*` | Authenticated shell plus one page per module |
| `supabase/migrations/0001_init.sql` | Full schema, RLS, triggers, RPCs, realtime |
| `supabase/seed.sql` | **Generated** from `seed.ts` by `npm run db:seed-sql`. Do not hand-edit. |
| `scripts/verify-logic.ts` | 19 logic checks (`npm run verify`) |
| `render.yaml` | Render Blueprint |

---

## 5. Modules and features

| Module | Route | Features |
| --- | --- | --- |
| **1. Government Dashboard** | `/dashboard` | **KPIs:** city risk level, affected areas, active SOS, available teams, shelters, free capacity.<br>**Monitoring map:** risk zones, SOS, flooded roads, shelters, teams.<br>**Charts:** risk by locality, rainfall trend, SOS status, shelter occupancy.<br>**Lists:** recent SOS table, active alerts, flood-report verification, team availability, live activity feed.<br>**Risk-engine banner** that drafts a red alert for high-risk zones. |
| **2. AI Risk Heatmap** | `/risk-map` | **Map:** red/orange/green zones on OSM.<br>**Zone detail:** score, category, rainfall, intensity and a factor-by-factor explanation.<br>**Map controls:** layer toggles, legend.<br>**Panels:** locality ranking, rainfall trend.<br>**Scenario simulator:** Velachery heavy rain, citywide cyclone, rain subsides, custom sliders.<br>**"Re-run on server API"** check. |
| **3. Resident Portal** | `/resident`, `/resident/{sos,report,alerts,shelters,track}` | **SOS:** one tap, with type, urgency, people, GPS or tap-on-map location, description.<br>**Flooded-road report.**<br>**Alerts** with safety instructions (my area or all).<br>**Nearby shelters:** by distance, with capacity, facilities, call button, OSM directions.<br>**SOS tracking:** stepper timeline, team contact, lookup by reference + phone.<br>**Extras:** Tamil sub-labels on home tiles, helpline numbers. |
| **4. Rescue Management** | `/rescue` | **Triage queue** sorted by urgency and waiting time.<br>**Map** of SOS and teams.<br>**Nearest-capable-team recommendation;** assign or reassign.<br>**Updates:** progress notes, In Progress and Resolved.<br>**Team availability.**<br>**Rescue role** sees only its own team's requests. |
| **5. Shelter Management** | `/shelters` | **Shelter list:** occupancy bars, facilities, distance from any locality.<br>**Occupancy:** ±10 buttons, auto Full/Open.<br>**Admin:** add, edit or remove a shelter with a map location picker.<br>**Map** of shelters near risk zones and SOS. |
| Alerts & Warnings | `/alerts` | **Issue alerts:** Yellow / Orange / Red, to selected localities, with safety instructions.<br>**Manage:** withdraw or re-activate.<br>**Risk-engine recommendation.** |
| Administration | `/admin` | **Users:** role, team, activate/deactivate, add user.<br>**Rescue teams:** add or edit.<br>**Data tools:** counts, JSON export, demo reset, API health check.<br>**Permission matrix view.** |
| Demo Guide | `/demo` | **7-step guided Velachery scenario,** with automatic progress detection and one-click role switching. |
| Landing | `/` | **Demo role selection** ("Start guided demo" signs in as an official and opens `/demo`).<br>**Supabase sign-in** when configured. |

---

## 6. User roles and permissions

### Roles

| Role | Home route |
| --- | --- |
| Resident | `/resident` |
| Government Official | `/dashboard` |
| Rescue Team | `/rescue` |
| Administrator | `/dashboard` |

In demo mode, users switch roles from the role switcher. Each browser tab keeps its own session.

### Permission matrix (`src/lib/auth/permissions.ts`)

| Permission | Roles |
| --- | --- |
| `dashboard:view` | official, admin |
| `riskmap:view` | all roles |
| `risk:simulate` | official, admin |
| `resident:portal` | resident |
| `sos:create` | resident, official, admin |
| `sos:view_all` | official, admin |
| `sos:view_assigned` | rescue |
| `sos:assign` | official, admin |
| `sos:update_status` | official, rescue (own team only, via `canUpdateSOS`), admin |
| `rescue:view` | official, rescue, admin |
| `report:create` | all roles |
| `report:verify` | official, admin |
| `alert:manage` | official, admin |
| `shelter:view_admin` | official, rescue, admin |
| `shelter:update_occupancy` | official, admin |
| `shelter:manage` | admin |
| `team:manage` | admin |
| `team:update_status` | official, admin |
| `users:manage` | admin |
| `system:manage` | admin |

### Business rules (enforced in `mutations.ts` and checked in `verify-logic.ts`)

- SOS status only moves **forward**.
- A deployed team cannot be double-assigned.
- Resolving an SOS frees the team and completes the assignment.
- Occupancy can never exceed capacity. Reaching capacity sets the shelter to `full`.
- Deactivated users lose all permissions.
- An admin cannot remove their own admin access.

### Demo users

Seed totals: 12 users (3 residents, 2 officials, 6 rescue users mapped to team-1 … team-6, 1 admin).

| Role | Id | Name | Notes |
| --- | --- | --- | --- |
| Resident | `u-res-1` | Priya Raman | |
| Official | `u-off-1` | Anitha Suresh | |
| Rescue | `u-resq-1` | Arjun Menon | team-1 (SDRF Boat Team Alpha) |
| Admin | `u-admin` | Kavya Natarajan | |

**When a permission changes,** update all of these together:

- `PERMISSIONS`
- the matching RLS policies and RPC checks in SQL
- `nav.ts` roles
- the page's `RoleGuard` roles
- the checks in `verify-logic.ts`

---

## 7. Database structure (Supabase / Postgres)

The source is `supabase/migrations/0001_init.sql`. It was parsed successfully with the PostgreSQL parser (libpg-query) but **has not been run on a live Supabase project yet**.

### Enums

| Enum | Values |
| --- | --- |
| `app_role` | resident, official, rescue, admin |
| `sos_status` | submitted, assigned, in_progress, resolved |
| `urgency_level` | low, medium, high, critical |
| `emergency_type` | trapped, medical, evacuation, food_water, electrical, structural, other |
| `report_severity` | low, moderate, severe |
| `report_status` | reported, verified, cleared |
| `alert_level` | yellow, orange, red |
| `team_status` | available, deployed, off_duty |
| `team_type` | boat, medical, fire, general |
| `shelter_status` | open, full, closed |
| `facility_type` | water, food, medical, first_aid, electricity, accessible, sanitation, child_care |
| `assignment_status` | active, completed, cancelled |

### Tables (12, all with RLS enabled)

| Table | Holds | Access |
| --- | --- | --- |
| `profiles` | user ↔ role, team, active; linked to `auth.users` | self read/update; admin all |
| `risk_zones` | 8 localities: centre lat/lng, `radius_m`, population, historical susceptibility, elevation, drainage note | public read; admin write |
| `rainfall_readings` | 24 h mm + intensity per zone over time | public read; staff insert |
| `rescue_teams` | type, capabilities, base location, status | authenticated read; admin all; official status update |
| `sos_requests` | references from `sos_reference_seq`; location, urgency, status, assigned team | resident: own; rescue: own team; staff: all |
| `sos_status_events` | status timeline | follows SOS visibility |
| `rescue_assignments` | team ↔ SOS history | staff: all; rescue: own team |
| `flood_reports` | flooded-road reports | authenticated read/insert; staff update |
| `disaster_alerts` | level, zones, instructions, active | public read; staff insert/update |
| `shelters` | capacity, occupancy, status, contact | public read; staff update; admin insert/delete |
| `shelter_facilities` | facility flags per shelter | public read; admin all |
| `activity_log` | audit feed | staff read; insert as self |

### Helpers, triggers and RPCs

- **Helpers:** `current_app_role()`, `current_team_id()`, `is_staff()`.
- **Triggers:**
  - `handle_new_user`: new sign-ups become Residents.
  - `protect_profile_columns`: only admins change `role`, `team_id` or `active`.
  - `sos_after_insert`: creates the timeline event and activity entry.
- **RPCs** (`SECURITY DEFINER`; each re-checks the role and the allowed transition):
  - `assign_team(p_sos_id, p_team_id, p_note)`
  - `update_sos_status(p_sos_id, p_status, p_note)`
  - `track_sos(p_reference, p_phone)` (granted to `anon`)
- **Realtime publication** covers all tables except `risk_zones`.
- **`supabase/seed.sql`:**
  - upserts zones and teams;
  - truncates the rest (`delete from rescue_teams` would break the `rescue_has_team` check, hence the upserts);
  - sets `sos_reference_seq` to 1041, so the next SOS is SOS-1042.

### Demo seed (`createSeedState()`)

| Data | Count |
| --- | --- |
| Zones | 8 |
| Rainfall readings | 96 |
| Teams | 6 |
| SOS requests | 6 (SOS-1029 … SOS-1041) |
| Flood reports | 7 |
| Alerts | 3 |
| Shelters | 8 (sh-1 is Velachery Corporation HSS, 400 capacity, 180 occupied) |

Scenarios:

- `velacheryHeavyRain`: Velachery 215 mm / 48 mm/hr, Madipakkam 124/24, Pallikaranai 142/26, Perungudi 112/21.
- `citywideCyclone`
- `rainSubsides`

**When the schema changes,** update all of these in one change:

- `types.ts`
- a **new** migration file (`0002_*.sql`; do not edit `0001` once it has been applied to a real project)
- `seed.ts`
- the mapping in `supabase-backend.ts`
- `npm run db:seed-sql`
- Bump `SCHEMA_VERSION` if the stored demo-state shape changes, so old localStorage data resets.

---

## 8. Risk engine (`src/lib/risk`)

The model is `ruleBasedModel`, id `rule-based`, version `1.0.0-prototype`, behind the `RiskModel` interface.

**Formula:**

```
score = rainfall (max 35) + intensity (10) + reports (20) + active SOS (15) + history (20)
```

| Factor | Input | How points are given |
| --- | --- | --- |
| Rainfall | 24 h total | Scales linearly up to 204.5 mm, the IMD "extremely heavy" threshold |
| Intensity | mm/hr | Saturates at 40 mm/hr (a prototype assumption) |
| Reports | Active flood reports | low 4, moderate 7, severe 10 points |
| Incidents | Unresolved SOS | high/critical 5, others 3 points |
| History | *Sample* susceptibility index (0–1) | index × 20 |

**Categories:** Low below 40; Moderate from 40 up to 69; High at 70 or above (`CATEGORY_THRESHOLDS`).

**Rules:**

- Keep the engine deterministic and explainable. Every factor returns its input, points, `maxPoints` and a plain-language reason that the UI shows.
- To add an ML model, implement `RiskModel` and register it in `src/lib/risk/index.ts`. The UI and `/api/risk/assess` use whichever model is active.
- Never present scores as validated predictions.

---

## 9. UI/UX design guidelines

- **Visual language:**
  - **Navy** = command (custom `navy-50 … navy-950` scale in `globals.css`; sidebar `navy-950` `#0b1530`).
  - **Teal** = action and positive.
  - **Restrained orange and red** = risk only.
  - Background `slate-50`, text `slate-900`.
- **Risk colours:** low `#16a34a`, moderate `#ea580c`, high `#dc2626` (`RISK_HEX`). Always pair a colour with a text label, never colour alone.
- **Alert levels** follow IMD style: Yellow "Be aware", Orange "Be prepared", Red "Take action".
- **Typography and states:**
  - Fonts: Geist Sans and Geist Mono. Use the `.tabular` class for numbers in tables and KPIs.
  - Focus ring: teal 2 px `:focus-visible`.
  - Respect `prefers-reduced-motion`.
- **Map style:**
  - Desaturated OSM tiles (`.dsa-map`).
  - Markers use the `dsa-marker--*` classes in `globals.css`. SOS markers are coloured by status; newly submitted (unassigned) ones pulse.
  - Tooltips use `.dsa-tooltip`.
- **Reuse existing building blocks** instead of making one-off styles:
  - primitives in `components/ui`
  - badges: `RiskBadge`, `SOSStatusBadge`, `UrgencyBadge`, `AlertLevelBadge`, `ShelterStatusBadge`, `TeamStatusBadge`, `SimulatedTag`
  - `StatCard`, `ActivityFeed`, `LocationPicker`, `SOSTimeline`, `Charts`
- **Resident portal:**
  - Large tap targets and plain language.
  - Emergency actions come first; SOS is always one tap from home.
  - Tamil sub-labels on the home tiles.
  - Helpline numbers are visible.
- **Responsive:**
  - Every page must work at **375 px wide with no horizontal scroll**.
  - Grid and flex children that hold tables or long text need `min-w-0`; `Card` already has it.
- **Feedback:**
  - Show success and errors as toasts (`useToast`).
  - Keep forms and modals open, with the validation message, on error.
  - Skip redundant toasts, for example when switching to the role you already have.
- **Simulated data must look simulated:** keep the `SimulatedTag` and prototype disclaimers wherever data is shown.

---

## 10. Coding standards and development rules

### General

- Use TypeScript strict mode, the `@/` → `src/` import alias and function components.
- `"use client"` only where needed (views, hooks, map, charts). Pages stay server components that export `metadata`.
- **All writes** go through the `Backend` → `mutations.ts` path: `authorize()` → `validate*()` → new state + activity entry. Never mutate store state inside components.
- **Shared code locations:**
  - labels, colours and option lists → `constants.ts`
  - formatting → `format.ts`
  - geometry → `geo.ts`
  - derived data → `selectors.ts`
- Validation lives in `validation.ts` and is used by **both** forms and mutations.
- Keep the demo and Supabase backends **behaviourally identical**. Any new mutation needs both implementations, plus an RLS/RPC rule in SQL.
- Add or extend checks in `scripts/verify-logic.ts` for any new business rule or permission.

### Next.js 16 specifics

- Every page under `src/app/(app)/` exports `metadata` **and** `export const instant = false;`. A layout-level export does not cover pages; without the page export, dev shows the "Could not validate … instant navigation" error.
- Components using `useSearchParams` must sit inside `<Suspense>` (see `rescue/page.tsx`). Use `window.history.replaceState` to sync the URL without navigation.
- Route handlers that must be dynamic call `await connection()` from `next/server` (see `/api/health`).
- Use the global `LayoutProps<"/...">` / `PageProps` types.
- Routes stay mounted in `<Activity>` (`cacheComponents`). Clean up subscriptions, timers and maps in effects.

### Maps

- Use `components/map/LeafletMap.tsx` (custom wrapper). Do **not** add react-leaflet.
- Load maps with `next/dynamic` and `ssr: false`.
- Leaflet sets tooltip and popup HTML via `innerHTML`. **Always** pass user-supplied text through `escapeHtml()`.

### Icons

- lucide-react v1 renamed many icons, for example:
  - `TriangleExclamationPoint` (was AlertTriangle)
  - `CirclePlay` (PlayCircle)
  - `Trash` (Trash2)
  - `LoaderCircle`, `House`, `Building`, `WavesHorizontal`
- Check `node_modules/lucide-react` when an import fails. Aliasing is fine, for example `Clock as History`.

### React compiler lint

- Do not define components inside other components; pass data as props instead.
- Avoid a manual `useMemo` that the compiler cannot preserve; compute inline instead.

### Security

- Never trust the client. Server routes verify the caller, as `/api/admin/users` checks the token and admin role before using the service key.
- No secrets in `NEXT_PUBLIC_*`. Never log keys.

### Definition of done

A task is done only when all of these hold:

1. `npm run typecheck`, `npm run lint` and `npm run verify` pass.
2. `npm run build` passes.
3. The change has been checked in the browser on desktop and at 375 px, with no console errors.
4. `PLAN.md` and, if needed, `CLAUDE.md` are updated.

---

## 11. Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL. Set it **and** the anon key to switch to Supabase mode. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key; RLS protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Used only by `/api/admin/users` after the admin check |
| `NEXT_PUBLIC_DATA_MODE` | optional | `demo` forces demo mode |

- With none of these set, the app runs in **demo mode**.
- `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.
- Local development uses `.env.local`, copied from `.env.example`.

---

## 12. Commands

```bash
npm install            # install dependencies
npm run dev            # dev server → http://localhost:3000 (.claude/launch.json: "disaster-shield-dev")
npm run build          # production build
npm start              # serve the build (reads PORT)
npm run lint           # ESLint (incl. React-compiler rules)
npm run typecheck      # tsc --noEmit
npm run verify         # 19 logic checks: permissions, SOS workflow, shelters, alerts, users, risk
npm run db:seed-sql    # regenerate supabase/seed.sql from src/lib/data/seed.ts
```

- **Health check:** `GET /api/health` returns `status`, `dataMode`, `riskModel`, `serviceRoleConfigured` and `time`.
- **Risk API:**
  - `GET /api/risk/assess` returns model info.
  - `POST /api/risk/assess` takes a validated `RiskInput` and returns an assessment.

---

## 13. Render deployment

The Blueprint is `render.yaml`. However, the **live service was created directly through the Render API, not from the Blueprint**, so editing `render.yaml` does **not** change the live service. Change live settings in the Render dashboard, and only with the owner's approval.

| Setting | Value |
| --- | --- |
| Service | `disaster-shield-ai`, type web, runtime node, plan **free**, region **singapore** |
| Branch | `main`, auto-deploy on every commit (`autoDeploy: yes`, trigger `commit`) |
| Build | `npm ci --include=dev && npm run build` (dev deps are needed for the Tailwind/TypeScript build) |
| Start | `npm start` (Next reads Render's `PORT`) |
| Health check | `/api/health` on the live service (set in the dashboard on 2026-11-20; matches `render.yaml`) |
| Environment | `NODE_VERSION=22`, `NEXT_TELEMETRY_DISABLED=1` (Supabase variables optional) |
| Live URL | <https://disaster-shield-ai-r7x6.onrender.com>. Render added the `-r7x6` suffix even though the plain subdomain looked free. |
| Render IDs | workspace `tea-dbarasrbc2fs73cgand0`, service `srv-dbvg7c6k1f9s73cfr8eg` |

- **Free-plan behaviour:** the instance sleeps after about 15 minutes idle, and the first request after that can take about a minute. Open the site a few minutes before a demo.
- **Skipping a deploy:** a commit whose message contains `[skip render]` does not redeploy. Verified on 2026-11-20 with `7ec6fcc`: it was pushed to `main` with auto-deploy on, and no deploy was created.
- **Settings changes redeploy:** saving a service setting in the dashboard (for example the health check path) triggers a `service_updated` deploy of the **last deployed commit**. It is quick (about 20 s, no rebuild) but still a deploy, so mention it to the owner before changing settings.
- **Deploy flow:**
  1. Run the definition-of-done checks locally.
  2. Commit (with owner approval).
  3. Push to `main`, which triggers an automatic deploy.
  4. Check the deploy status and logs.
  5. Open `/api/health` on the live site.
  6. Run a smoke test of the five modules in the browser.
  7. Clear any test data you created in the browser's localStorage.

---

## 14. Locations

| What | Where |
| --- | --- |
| Main project (source of truth) | `C:\MY SPACE\Claude Projects\disaster-shield-ai` |
| GitHub | `vjxeyy/disaster-shield-ai` (public), branch `main` |
| Front-end-only copy | `C:\Users\vijay\Documents\disaster-shield-ai-frontend` |

The front-end-only copy has no `src/app/api`, `supabase` or `scripts` folders. It was made on request and is **not** synced automatically: it has the branding fix, but not `render.yaml`, the README Render section or these docs.

---

## 15. Decision log

Add new entries at the bottom. Do not delete old ones; mark them superseded instead.

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-19 | Next.js 16 + Supabase; a `Backend` interface with a localStorage **demo mode** as the default | Works with zero setup for judges; Supabase mode adds real auth and RLS when configured |
| 2026-11-19 | Custom Leaflet wrapper instead of react-leaflet | Routes stay mounted in `<Activity>`, so the map must be destroyed and re-created cleanly |
| 2026-11-19 | Rule-based, explainable risk engine behind a `RiskModel` registry | Transparent for a prototype; an ML model can be plugged in later without UI changes |
| 2026-11-19 | One `PERMISSIONS` matrix shared by UI and data layer, mirrored by RLS and RPCs | Security must not depend on hidden buttons |
| 2026-11-19 | Removed team name, hackathon name and the "Chennai flood response · Prototype" subtitle from the UI | Owner's correction |
| 2026-11-19 | Vercel deploy declined ("Not now"); deployed on **Render** instead | Owner's request |
| 2026-11-19 | Keep the name **Disaster-Shield AI** despite similar GitHub repos and taken .com/.ai/.org domains | Owner's decision after reviewing five alternatives |
| 2026-11-20 | Added `CLAUDE.md` + `PLAN.md` with a mandatory read-before / update-after workflow | Owner's request |
| 2026-11-20 | Set the health check path `/api/health` on the live Render service in the dashboard | Owner approved. The service was created through the API, so the `render.yaml` setting never applied, and Render could not detect unhealthy deploys. |
