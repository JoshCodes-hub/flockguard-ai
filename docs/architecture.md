# PoultryGuard — System Architecture

## 1. High-Level Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         FARMER / VET / ADMIN                        │
│                    (Browser — Mobile & Desktop)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTPS
┌────────────────────────────▼────────────────────────────────────────┐
│            FRONTEND  —  React 19 + TanStack Start (SSR)             │
│  Routes: /, /auth, /dashboard, /farms, /health-record/new,          │
│          /image-analysis, /vet, /predictions/$id, /reports,         │
│          /dataset, /assistant, /admin, /settings, /onboarding       │
│  UI: Tailwind v4 · shadcn/ui · Recharts · Lucide                    │
└──────┬────────────────────────────────────┬─────────────────────────┘
       │ createServerFn RPC                 │ supabase-js (RLS)
       │ (Authorization: Bearer)            │
┌──────▼────────────────────────────────────▼─────────────────────────┐
│                 TANSTACK START SERVER (Edge Worker)                 │
│  • Server functions: predictions, assistant, demo-seed, storage     │
│  • Middleware: requireSupabaseAuth + attachSupabaseAuth             │
│  • CDSE (Clinical Decision Support Engine) — rules + scoring        │
└──────┬────────────────────────────────────┬─────────────────────────┘
       │                                    │
       │                                    │  Gemini Vision
       │                                    │  (image analysis)
       │                                    ▼
       │                       ┌──────────────────────────┐
       │                       │   LOVABLE AI GATEWAY     │
       │                       │   Google Gemini 2.5      │
       │                       └──────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────────┐
│                     LOVABLE CLOUD (PostgreSQL)                      │
│  Tables: profiles, user_roles, farms, poultry_records,              │
│          predictions, uploaded_images                               │
│  Security: Row-Level Security + has_role() security-definer fn      │
│  Storage: bird-images bucket (private)                              │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. The Feedback Loop (key differentiator)

```text
   ┌────────────┐
   │  TIER 1    │  Kaggle (Poultry Diseases ~6.8K imgs, Chicken Disease tabular),
   │ SEED DATA  │  Mendeley fecal images, FAO/WOAH clinical bulletins
   └─────┬──────┘
         │  bootstraps
         ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  FARMER  │───▶ │   AI     │───▶ │   VET    │───▶ │ TIER 2   │
   │ observes │     │ predicts │     │ verifies │     │ FIELD    │
   │  birds   │     │ disease  │     │  result  │     │ DATASET  │
   └──────────┘     └──────────┘     └──────────┘     └─────┬────┘
         ▲                                                  │
         └──────────────────────────────────────────────────┘
                  Self-improving system (Ghana-specific)
```

## 3. Component Responsibilities

| Layer            | Responsibility                                              |
| ---------------- | ----------------------------------------------------------- |
| Browser          | Capture vitals/images, render dashboards, role-based nav    |
| TanStack Start   | SSR, route gating, RPC to server functions                  |
| Server functions | Validate input (Zod), call CDSE, persist predictions        |
| CDSE             | Pure-TS rule engine: vitals + symptoms → disease + risk     |
| Lovable AI       | Gemini Vision for image-based diagnosis                     |
| PostgreSQL + RLS | Multi-tenant data isolation by `auth.uid()` and role        |
| Vet Portal       | Bulk verification feeding training dataset                  |

## 4. Roles

- **Farmer** — owns farms, records, predictions; sees only their own data.
- **Veterinarian** — read-only on all farms, can verify any prediction.
- **Admin** — full access; manages users and roles.

## 5. Tech Stack

React 19 · TanStack Start · TypeScript · Tailwind v4 · shadcn/ui · Recharts ·
Lovable Cloud (PostgreSQL) · Lovable AI Gateway (Gemini 2.5) · Row-Level Security
