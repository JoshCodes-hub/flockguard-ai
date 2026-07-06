# PoultryGuard — Defense Demo Script (≈5 minutes)

## Pre-demo checklist (do this 5 minutes before)

1. Open `/demo`, paste secret, click **Clear Demo Data** then **Seed Demo Data**.
2. Sign out. Confirm three demo accounts exist (password: `DemoPass2026!`):
   - `demo-farmer@poultryguard.ai`
   - `demo-vet@poultryguard.ai`
   - `demo-admin@poultryguard.ai`
3. Open two browser windows side-by-side: one normal, one incognito.
4. Have the architecture diagram (`docs/architecture.md`) open in a third tab.

---

## Act 1 — The Problem (30 sec)

**Open the landing page (`/`).**

> "Poultry farmers in Kenya lose entire flocks to Avian Influenza and Newcastle
> Disease because diagnosis arrives too late. A veterinarian visit can take days.
> PoultryGuard puts a clinical-grade diagnostic tool in every farmer's pocket
> and closes the loop with licensed vets who validate the AI."

Scroll to show the **Workflow** section: Farmer → AI → Vet → Dataset.

---

## Act 2 — The Farmer (90 sec)

**Sign in as `demo-farmer@poultryguard.ai`.**

1. Land on `/onboarding` or `/dashboard` — show the **Health Score**, **Active Alerts**,
   and the four **charts**: 14-day trend, risk distribution, top conditions, daily volume.
2. Click **New Record**. Enter:
   - Temperature: `42.5°C` (high)
   - Mortality: `8`
   - Tick symptoms: `coughing`, `nasal_discharge`, `swollen_head`
   - Submit.
3. The prediction page opens automatically. Point out:
   - **Disease + confidence** (likely Avian Influenza, High risk)
   - **Explain Prediction** button — shows the rule that fired

> "The Clinical Decision Support Engine is a transparent rule-based system —
> not a black box. Every prediction is explainable."

4. Go to `/image-analysis`. Upload any chicken photo. Show the Gemini Vision result.

---

## Act 3 — The Veterinarian (60 sec)

**Open second window, sign in as `demo-vet@poultryguard.ai`.**

1. Navigate to `/vet` — show the queue across **all farms**.
2. Filter by **Risk = High**.
3. Check 3-4 boxes, click **Verify**. Toast confirms bulk update.

> "Vets validate AI predictions at scale. This is the human-in-the-loop layer
> that real clinical software needs."

---

## Act 4 — The Dataset & Reports (45 sec)

Still as the vet (or switch to admin):

1. Open `/dataset`. Show **training-ready records** counter and the verified-vs-unverified split.

> "Every verified case becomes a labeled example for the next-generation ML model.
> The system gets smarter the more it's used."

2. Open `/reports`. Click **Export PDF**. Show the generated farm health report.

---

## Act 5 — Architecture & Security (45 sec)

Switch to the architecture diagram tab.

1. Walk through the three layers: Frontend → Server → Database.
2. Highlight:
   - **Row-Level Security** — farmers see only their data, enforced at the DB.
   - **Roles in a separate `user_roles` table** with a `has_role()` security-definer
     function (prevents privilege escalation).
   - **Lovable AI Gateway** — no API key in the client, no key in the database.

---

## Q&A talking points

| Question                                          | Answer                                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Why a rule engine and not pure ML?                | Explainability + safety. We can defend every prediction. ML is added incrementally via the verified dataset loop. |
| How do you handle offline farms?                  | Records are queued client-side; future ESP32 IoT integration is already scaffolded at `/iot`.                     |
| What stops a farmer from seeing another's farm?   | Postgres Row-Level Security policies scoped to `auth.uid()`. Verified with the security linter.                   |
| Who validates the AI?                             | Licensed veterinarians, in the `/vet` portal. Their verifications become training labels.                         |
| Where does Avian Influenza confidence come from?  | Weighted symptom matching + vital-sign deviation + photo evidence. See `src/lib/disease-engine.ts`.               |
| Cost of running this?                             | Lovable Cloud + AI Gateway. Sub-cent per prediction; database-backed, not always-on inference.                    |

---

## Total budget: 4 min 30 sec demo + 30 sec buffer
