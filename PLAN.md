# PLAN.md: Disaster-Shield AI development plan

> Read [`CLAUDE.md`](CLAUDE.md) and this whole file before every task. Update this file after every significant task.
>
> **How items are marked**
> - `[x]` means the work is implemented **and** tested. The tests are listed in §6.
> - `[ ]` means pending.
> - `[ ]` with *implemented, untested* means the code exists but the work has not yet been checked end-to-end. Do not tick it until it has been tested.

**Last updated:** 2026-11-20 (session 2: documentation setup)

---

## 1. Current status

| Area | Status |
| --- | --- |
| Overall | **Working prototype in demo mode, deployed and tested live.** All five modules work end-to-end in the Velachery scenario. |
| Code checks | typecheck ✅ · lint ✅ · `npm run verify` 19/19 ✅ (2026-11-20) · production build ✅ (local 2026-11-19, and on Render) |
| Live site | <https://disaster-shield-ai-r7x6.onrender.com>. `/api/health` returned `ok`, `dataMode: demo`, `rule-based@1.0.0-prototype` on 2026-11-20. |
| Repository | `vjxeyy/disaster-shield-ai` (public). On GitHub, `main` is at `7ec6fcc`, which includes `CLAUDE.md` and `PLAN.md`. A newer local commit with the health-check doc updates is **not pushed yet**. |
| Supabase mode | Implemented, **untested against a live project** (no credentials yet) |
| Project name | **Disaster-Shield AI**. The owner chose to keep it (2026-11-19). |

---

## 2. Phases, tasks and features

### Phase 0: Setup
- [x] Create the project folder `C:\MY SPACE\Claude Projects\disaster-shield-ai`
- [x] Scaffold Next.js 16 (App Router, TypeScript, Tailwind 4, ESLint)
- [x] Install Leaflet, Recharts, lucide-react, supabase-js and tsx
- [x] Configure `cacheComponents` / `partialPrefetching` and the Tailwind Turbopack loader
- [x] Add design tokens (navy scale, map and marker styles) in `globals.css`, plus the shield icon

### Phase 1: Domain model and data layer
- [x] Domain types that mirror the SQL schema (`types.ts`)
- [x] Simulated Chennai seed:
  - 8 zones, 96 rainfall readings, 12 users, 6 teams
  - 6 SOS, 7 flood reports, 3 alerts, 8 shelters
  - 3 scenarios
- [x] `Backend` interface and `AppDataProvider` (`useSyncExternalStore`)
- [x] `DemoBackend`:
  - localStorage state
  - a session per tab
  - cross-tab sync
- [x] Pure, authorised, validated mutations (`mutations.ts`)
- [x] Selectors:
  - dashboard stats
  - triage order
  - team recommendation
  - zones needing an alert
  - shelter availability
- [ ] `SupabaseBackend` (RLS reads, RPC writes, realtime refetch): *implemented, untested*

### Phase 2: Security and validation
- [x] Permission matrix, `authorize()` on every mutation, `canUpdateSOS` (own team only). Verified by `verify-logic`.
- [x] Shared validation: Indian mobile numbers, Chennai bounds, field rules
- [x] Route gating (`nav.ts` roles + `RoleGuard`). This is for user experience only; enforcement is in the data layer.
- [ ] Supabase RLS policies, triggers and the `SECURITY DEFINER` RPCs: *written, parsed OK with libpg-query, never run on Supabase*
- [ ] `/api/admin/users` (staff invites with the service key after an admin check): *implemented, untested*

### Phase 3: Risk engine
- [x] Rule-based `RiskModel` with five factors, each with points and an explanation; Low/Moderate/High thresholds
- [x] Model registry (`getRiskModel`), ready for an ML model to be plugged in
- [x] Velachery heavy-rain scenario raises Velachery from 43 (Moderate) to 73 (High). Tested in the browser and in `verify-logic`.
- [x] `POST /api/risk/assess`. The live API returned 78 / high for the test input.
- [ ] Citywide cyclone and rain-subsides scenarios, and the custom sliders: *implemented, browser test not recorded*

### Phase 4: Modules

**Module 1: Government Dashboard (`/dashboard`)**
- [x] KPI cards: risk level, affected areas, active SOS, available teams, shelters, free capacity
- [x] Monitoring map and charts: risk by locality, rainfall trend, SOS status, shelter occupancy
- [x] Recent SOS, active alerts, team availability, activity feed
- [x] Risk-engine banner that drafts a red alert. Tested: the alert was issued from the banner.
- [ ] Flood-report verify and clear actions: *implemented, browser test not recorded*

**Module 2: AI Risk Heatmap (`/risk-map`)**
- [x] Red/orange/green zones on OSM, zone detail with the factor breakdown
- [x] Layer toggles, legend, locality ranking, rainfall trend
- [x] Scenario panel (Velachery scenario)
- [ ] "Re-run on server API" button in the UI: *implemented; the API itself was tested, the button was not recorded*

**Module 3: Resident Portal (`/resident/*`)**
- [x] One-tap SOS with validation and GPS / tap-on-map location. Sent SOS-1042 live.
- [x] Alerts with safety instructions. The red alert appeared for the resident.
- [x] Nearby shelters by distance. Showed "210 of 400 free" after the occupancy update.
- [x] SOS tracking timeline and team contact (Submitted → Assigned → In Progress)
- [ ] Flood-road report submission: *the form loads; submitting it was not recorded*
- [ ] SOS lookup by reference + phone: *implemented, untested in the browser*
- [x] Tamil sub-labels on home tiles, helpline numbers

**Module 4: Rescue Management (`/rescue`)**
- [x] Triage queue (urgency, then waiting time) and map
- [x] Nearest-capable-team recommendation. SDRF Boat Team Alpha came first, about 1 km away.
- [x] Assign a team; the team becomes deployed
- [x] Rescue role sees only its own team's requests; marks In Progress with a note
- [x] Resolve frees the team and completes the assignment. Checked in `verify-logic`.
- [ ] Reassign and the Resolve button in the browser UI: *implemented, browser test not recorded*

**Module 5: Shelter Management (`/shelters`)**
- [x] Occupancy update. Tested live (180 → 190); auto-full at capacity is checked in `verify-logic`.
- [x] Occupancy bars, facilities, distance, map
- [ ] Add, edit and remove a shelter with the location picker (admin): *implemented. The admin-only rule is checked in `verify-logic`; the UI flow was not recorded.*

**Supporting modules**
- [x] Alerts: issue a Red alert to selected localities
- [ ] Alerts: withdraw / re-activate, and Yellow/Orange levels: *implemented, browser test not recorded*
- [x] Admin page loads (12 users, teams, data counts, health check)
- [ ] Admin actions (change role or team, activate/deactivate, add user in demo mode, add/edit team, JSON export, demo reset): *implemented. Rules are checked in `verify-logic`; the UI was not recorded.*
- [x] Demo Guide: all 7 steps detected as complete; one-click role switching
- [x] Landing page with demo role selection and "Start guided demo"
- [ ] Landing-page Supabase sign-in: *implemented, untested (needs Supabase)*

### Phase 5: UX polish and QA
- [x] Mobile at 375 px: no horizontal scroll on any page (`min-w-0` on `Card` and resident tiles)
- [x] No console errors during the full workflow (local and live)
- [x] Clear simulated-data labels and prototype disclaimers
- [x] Removed team name, hackathon name and the "Chennai flood response · Prototype" subtitle from the UI (owner's correction)
- [ ] Browser QA pass on every flow marked *browser test not recorded* above
- [ ] Automated UI tests (for example Playwright). There are none yet; only logic checks exist.

### Phase 6: Delivery and deployment
- [x] README with features, demo walkthrough, structure, running locally, environment variables, Supabase, Vercel, Render, risk engine and limitations
- [x] Front-end-only copy in `C:\Users\vijay\Documents\disaster-shield-ai-frontend`
- [x] Secret scan, then pushed to the public GitHub repo `vjxeyy/disaster-shield-ai`
- [x] `render.yaml` blueprint and live Render deploy; all five modules tested on the live site
- [x] Name-conflict check (web, domains, GitHub, Render) with five alternatives. The owner kept the name.
- [x] `CLAUDE.md` and `PLAN.md` created (2026-11-20)
- [x] Commit `CLAUDE.md` + `PLAN.md` on `main` as `7ec6fcc` (2026-11-20, owner approved; the message includes `[skip render]`)
- [x] Push `7ec6fcc` to GitHub (2026-11-20). Render did not redeploy, as intended.
- [x] Set the health check path `/api/health` on the live Render service (2026-11-20, owner approved). Verified through the Render API and a live health request.

---

## 3. Pending tasks (summary)

1. Push the local doc-update commit from 2026-11-20 (needs the owner's approval; its message includes `[skip render]`).
2. Run a browser QA pass on the untested flows and record the results in §6:
   - flood-report submit and verify
   - alert withdraw and re-activate
   - shelter add, edit and remove
   - admin user and team actions, JSON export, demo reset
   - reassign and resolve SOS
   - SOS lookup by reference + phone
   - the other two scenarios and the custom sliders
   - the "Re-run on server API" button
3. Supabase end-to-end test. This needs the owner to create a Supabase project and supply the keys. Test:
   - migration and seed
   - sign-up
   - RLS for each role
   - the RPCs
   - realtime
   - `/api/admin/users`
4. README decisions for the owner:
   - add the live URL?
   - remove the team and hackathon name from the title block? (The UI is already clean.)
5. Optional, on request:
   - sync the Documents copy (`render.yaml`, README Render section, these docs)
   - connect a custom domain (`disastershield.in`, `.app` and `disaster-shield.ai` were free on 2026-11-19)
   - add automated UI tests

### Future enhancements (out of prototype scope; not started)
- [ ] Real data feeds (IMD rainfall, GCC / TNSDMA) through official access
- [ ] Calibrate the risk weights with historical flood records, or plug in a trained model
- [ ] SMS, push or WhatsApp alert delivery
- [ ] Road-network routing to shelters (currently straight-line distance)
- [ ] Full Tamil localisation (currently only the resident home tiles)
- [ ] A production map-tile provider instead of the public OSM tile server
- [ ] Anonymous (no-login) SOS in Supabase mode, and linking seeded SOS to real resident accounts

---

## 4. Bugs and issues log

### Resolved

| Date | Problem | Cause | Fix |
| --- | --- | --- | --- |
| 2026-11-19 | Dev error "Could not validate that a segment in your UI has instant navigation" | Next 16 instant-navigation validation; a layout-level `instant = false` does not cover pages | `export const instant = false` added to **every** page under `(app)` |
| 2026-11-19 | lucide imports failed (`AlertTriangle`, `PlayCircle`, `History`, `Building2`, `Trash2`, …) | lucide-react v1 renamed icons | Used the v1 names (`TriangleExclamationPoint`, `CirclePlay`, `Trash`, …) and aliases such as `Clock as History` |
| 2026-11-19 | ESLint `react-hooks/preserve-manual-memoization` in the RescueView markers | The React compiler could not preserve the manual `useMemo` | Removed the `useMemo`; markers are computed inline |
| 2026-11-19 | Lint error: component defined inside a component (TrackSOS `RequestCard`) | React-compiler rules | Moved `RequestCard` to module level and passed `state` as a prop |
| 2026-11-19 | Horizontal scroll at 375 px (resident tiles, dashboard table cards) | Grid children default to `min-width: auto` | Added `min-w-0` to the resident `Tile` and the `Card` primitive. Re-checked that scrollWidth is 375 on all pages. |
| 2026-11-19 | Duplicate "SOS SOS-1042" wording in the toast | Message template | Reworded the toast |
| 2026-11-19 | Redundant toast when switching to the role already active | `useSwitchRole` always toasted | Skip the toast when the user is unchanged |
| 2026-11-19 | Guided-demo button pending state stuck or incorrect | Pending state handling | Fixed the pending state on "Start guided demo" |
| 2026-11-19 | `seed.sql` would fail: `delete from rescue_teams` violates the `rescue_has_team` check | `profiles.team_id` is `on delete set null`, and rescue profiles must have a team | Zones and teams are **upserted**; other tables are truncated |
| 2026-11-19 | `gh` template syntax error in PowerShell | PowerShell parsing of the Go template | Used `--json` and parsed the output instead |
| 2026-11-19 | `preview_start` could not find `launch.json` | Session working directory was still the scratch folder | Started the dev server in a background shell and opened the preview by URL |
| 2026-11-20 | Live Render service had no health check path, so Render could not detect unhealthy deploys | The service was created through the Render API, not the `render.yaml` Blueprint, so the Blueprint's `healthCheckPath` never applied | Set `/api/health` in the Render dashboard (owner approved). Saving it triggered a 20-second `service_updated` redeploy of `f635c2e`; the service went live and healthy. |
| 2026-11-20 | `git commit -F -` with a PowerShell here-string committed nothing ("pathspec … did not match") | PowerShell passed the here-string as an argument, not on stdin | Wrote the message to a file and used `git commit -F <file>` |

### Open or known issues

| Issue | Impact | Notes |
| --- | --- | --- |
| Render free plan sleeps after about 15 minutes idle | First visit can take about 1 minute | Open the site a few minutes before a demo, or upgrade the plan |
| Live Render service is not managed by `render.yaml` | Editing `render.yaml` has no effect on the live service | The service was created through the Render API. Change live settings in the dashboard (with owner approval). The health check path was fixed this way on 2026-11-20. |
| Render URL has the `-r7x6` suffix | Cosmetic | Render assigned it even though the plain subdomain appeared unused; a custom domain would hide it |
| Supabase mode untested | Unknown bugs may exist in auth, RLS, RPC or realtime paths | See pending task 3 |
| Demo-mode permissions run in the browser | Not real security in demo mode | By design for the prototype; Supabase mode is the real enforcement |
| Seeded SOS in `seed.sql` have no linked resident | Seeded requests are not visible to resident accounts in Supabase mode | Documented in README §11 |
| `README.md` still names the team and hackathon | Visible on GitHub | The owner asked for UI removal only; pending decision |
| `AGENTS.md` is rewritten by `next dev` | None | Managed by Next; commit it as-is. `next dev` never touches `CLAUDE.md`. |

---

## 5. Deployment progress

- [x] **GitHub:** <https://github.com/vjxeyy/disaster-shield-ai>, public, `main`. Commits:
  - `129bb76` initial commit (93 files)
  - `f635c2e` Render blueprint and README section
  - `7ec6fcc` `CLAUDE.md` + `PLAN.md` (2026-11-20, pushed, `[skip render]`)
  - doc updates recording the health-check change (2026-11-20, committed locally, not pushed yet, `[skip render]`)
- [x] **Render:**
  - Service `srv-dbvg7c6k1f9s73cfr8eg` in workspace `tea-dbarasrbc2fs73cgand0`. It was created through the API, not from the `render.yaml` Blueprint.
  - Free plan, Singapore, Node 22, auto-deploy on every commit to `main`
  - Health check path `/api/health`, set in the dashboard on 2026-11-20
  - Live deploy `dep-dbvpjpui0phs73aof4i0` (commit `f635c2e`, trigger `service_updated` from the health-check change, live 2026-11-20). The previous deploy was `dep-dbvg7cmk1f9s73cfr9k0`, the same commit.
  - `7ec6fcc` created no deploy, as intended (`[skip render]`)
- [x] **Live URL:** <https://disaster-shield-ai-r7x6.onrender.com>
- [ ] **Vercel:** not deployed. The owner said "Not now"; the instructions are in README §8.
- [ ] **Supabase:** no project connected; the app runs in demo mode
- [ ] **Custom domain:** none (owner's decision)

---

## 6. Testing results

| Date | Where | What | Result |
| --- | --- | --- | --- |
| 2026-11-20 | Local | `npm run typecheck`, `npm run lint`, `npm run verify` | ✅ all pass, 19/19 logic checks |
| 2026-11-20 | Live | `GET /api/health` | ✅ `ok`, demo mode, `rule-based@1.0.0-prototype` |
| 2026-11-20 | GitHub | Push of `7ec6fcc` | ✅ `origin/main` = `7ec6fcc` |
| 2026-11-20 | Render | `[skip render]` on a push to `main`, with auto-deploy on | ✅ no deploy was created |
| 2026-11-20 | Render | Health check path set to `/api/health` | ✅ the API reports `healthCheckPath: /api/health`; redeploy `dep-dbvpjpui0phs73aof4i0` is live |
| 2026-11-20 | Live | `GET /api/health` and `GET /` after the redeploy | ✅ both HTTP 200; health returns `ok`, demo mode |
| 2026-11-19 | Local | `npm run build` (production) | ✅ |
| 2026-11-19 | Local browser | Full 7-step Velachery guided demo | ✅ 7/7 |
| 2026-11-19 | Local browser | All pages at 375 px width | ✅ no horizontal scroll |
| 2026-11-19 | Live (Chrome) | All five modules (details below) | ✅ |
| 2026-11-19 | Live | Admin page, `/api/health`, `/api/risk/assess` (78 / high); browser console; Render logs | ✅ no errors |

**Live module checks on 2026-11-19:**

- **AI Risk Heatmap:** Velachery went from 43 to 73 (High), with explanations; map tiles loaded.
- **Government Dashboard:** the risk card showed High; charts and map rendered; the red alert was issued from the banner.
- **Resident Portal:**
  - SOS-1042 sent.
  - The red alert was visible.
  - The report form and shelter finder loaded.
  - Tracking showed Submitted → Assigned → In Progress with the team's note.
- **Rescue Management:** Alpha was recommended and assigned. Arjun Menon saw only his team's request and marked it In Progress.
- **Shelter Management:** occupancy went from 180 to 190, and the resident view showed 210 of 400 free.

**`verify-logic` checks (19)**

- **Risk engine:**
  - baseline Velachery moderate
  - heavy rain makes it high, with rainfall as the top factor
  - residents cannot simulate
- **SOS workflow:**
  - invalid phone rejected
  - a resident submits an SOS: it is linked to them and raises the risk
  - a resident cannot assign
  - the nearest capable team is recommended
  - assign works
  - no double assignment
  - other teams are blocked
  - In Progress works
  - no backward moves
  - resolve frees the team
- **Shelters, alerts, users:**
  - occupancy is capped at capacity
  - auto-full at capacity
  - only admins add shelters
  - residents cannot issue alerts
  - deactivated users are blocked
  - no admin self-demotion

**Not yet tested:**

- Supabase mode (everything)
- the flows marked *browser test not recorded* in §2
- browsers other than Chromium-based ones (Chrome and the in-app browser)

---

## 7. Next steps

1. **Owner:** approve pushing the local doc-update commit (`[skip render]`, so no redeploy).
2. Browser QA pass on the untested flows (pending task 2). Fix anything found, then update §2, §4 and §6.
3. Get the owner's decision on the README (live URL; team and hackathon name).
4. When the owner provides a Supabase project:
   - run the migration and seed
   - set the environment variables on Render
   - run the end-to-end test of every role
   - record the results here

---

## 8. Session log

| Date | Session | Completed | Remaining at end |
| --- | --- | --- | --- |
| 2026-11-19 | 1 | Built the full prototype (5 modules, 4 roles, demo + Supabase backends, risk engine, SQL, README); local QA; Documents copy; UI branding removal; GitHub push; Render deploy and live QA; name check (kept the name) | Supabase live test; optional README/domain decisions |
| 2026-11-20 | 2 | Inspected the project; re-ran typecheck, lint and verify (all pass) and the live health check (ok); created `CLAUDE.md` and `PLAN.md`; committed and pushed them (`7ec6fcc`, no redeploy); found that the live Render service had no health check path and set it to `/api/health` (owner approved; verified); committed the doc updates locally | Push the doc-update commit (approval needed); QA pass on untested flows; Supabase test |
