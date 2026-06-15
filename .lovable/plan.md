# PoultryGuard AI — Phase 1 Build Plan

Production-quality MVP. Uses the **Premium editorial** design direction (Inter + Playfair Display + JetBrains Mono on green #2E7D32 / cream #FDFDFC). Out of scope this phase: Learning Center, AI Assistant, Reports, Alerts, Admin Analytics, Veterinarian portal, IoT.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud and provision:

**Auth**: email + password. New users default to `farmer` role.

**Roles** (separate `user_roles` table, app_role enum: `farmer`, `veterinarian`, `admin`, plus `has_role()` security-definer function).

**Tables** (all RLS-on, GRANTed to `authenticated` + `service_role`):

- `profiles` — id (= auth.users.id), full_name, phone, farm_name, created_at. Auto-created on signup via trigger.
- `user_roles` — user_id, role
- `farms` — id, user_id, farm_name, location, bird_type, bird_count, created_at
- `poultry_records` — id, farm_id, temperature, humidity, feed_intake, water_consumption, activity_level, symptoms (text[]), notes, created_at
- `uploaded_images` — id, farm_id, image_path (storage), prediction, confidence, detected_symptoms (text[]), recommendation, created_at
- `predictions` — id, farm_id, record_id (nullable), image_id (nullable), prediction, confidence, risk_level, recommendation, prediction_source ('rule_engine' | 'vision_ai'), created_at

RLS: users see/modify only rows whose farm belongs to them; admins see all (via `has_role`).

**Storage**: bucket `bird-images` (private). RLS: users can upload/read only their own folder `{user_id}/...`.

## 2. AI integration

Hybrid, designed so the rule engine is swappable later.

- `src/lib/disease-engine.ts` — pure TypeScript rule engine. Maps symptoms + vitals → { disease, confidence, risk, recommendation }. Weighted symptom scoring for Newcastle Disease vs Avian Influenza vs Healthy. Called from a server function so it's centralized and replaceable.
- `predictHealth` server function (`src/lib/predictions.functions.ts`) — takes a record, runs the rule engine, persists to `predictions`, returns result.
- `analyzeImage` server function — uploads image to storage, calls Lovable AI Gateway with `google/gemini-3-flash` vision (image_url block) using a strict structured-output schema (disease, confidence 0–100, symptoms[], recommendation, risk_level). Persists to `uploaded_images` + `predictions`.
- `LOVABLE_API_KEY` provisioned via the gateway tool. All AI calls server-side only.

## 3. Routes (TanStack Start)

Public:

- `/` — landing (hero, features, footer) — ported from chosen prototype
- `/auth` — login + signup tabs

Protected under `_authenticated/`:

- `/dashboard` — stat cards (Total Birds, Healthy Birds, Active Alerts, Total Predictions), recent predictions table, quick actions
- `/farms` — list + create
- `/farms/$farmId` — detail with records, predictions, images
- `/health-record/new` — form (temperature, humidity, feed/water intake, activity level, multi-select symptoms) → submits to `predictHealth` → navigates to result
- `/predictions/$id` — result screen (disease, confidence ring, risk badge, recommendation, save/back actions)
- `/image-analysis` — upload + preview + analyze → result
- `/iot` — placeholder "Coming Soon" cards (Temperature, Humidity, Feed, Water sensors)

## 4. Design system

Copy prototype tokens verbatim into `src/styles.css` `@theme`:

- Colors: `--color-background #fdfdfc`, `--color-foreground #0e120f`, `--color-primary #2e7d32`, `--color-primary-soft #e8f5e9`, `--color-accent #4caf50`, `--color-border #0e120f15`, plus semantic warning/danger.
- Fonts via `<link>` in `__root.tsx`: Inter, Playfair Display, JetBrains Mono. Tokens: `--font-display`, `--font-serif`, `--font-mono`.
- Reuse prototype primitives: sticky nav, slideUp `animate-reveal` keyframe, sharp-cornered cards (`rounded-sm`), mono labels, oversized extrabold numerals on stat cards, dark prediction card.

All shadcn components restyled via tokens (no hardcoded colors in JSX).

## 5. Images

Generate two hero/scan images via `imagegen` and import as ES6 assets — one for landing hero, one as default scan thumbnail.

## 6. Mobile responsiveness

Every route built with the prototype's responsive grid patterns. Bottom-sheet nav drawer on mobile for authenticated layout.

## 7. Verification

After build: run typecheck/build, then drive Playwright through signup → create farm → submit health record → view prediction → upload image → view image analysis to confirm the full Phase 1 flow works end-to-end. Confirm RLS by checking a second user cannot see the first user's farms.

## Out of scope (Phase 2+)

Learning Center, Farm Assistant chat, Reports/PDF export, Alerts module, Admin dashboard & analytics, Veterinarian portal, real IoT ingestion. The schema and routes are shaped so these slot in without refactors.  
  
  
Please make the following improvements before generation:

1. Add an Explain Prediction section showing factors that influenced disease predictions.

2. Add a Farm Health Score (0–100) on the dashboard and farm details page.

3. Add a Health History Timeline on each farm page showing historical records and predictions.

4. Add support for future dataset generation by including fields:

   - is_verified

   - verified_by

   - verification_notes

   in predictions.

5. Rename the internal rule-engine result presentation to Clinical Decision Support Engine throughout the UI.

Keep all other Phase 1 specifications unchanged.