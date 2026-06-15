# Vercel Deployment Guide for FlockGuard AI

This guide walks you through deploying your FlockGuard AI project (TanStack Start + Lovable Cloud / Supabase) on Vercel.

---

## What Changed

The project was originally configured for Cloudflare Workers. To deploy on Vercel, we switched the **Nitro preset** to `vercel` in `vite.config.ts`. This tells Nitro (the build system under TanStack Start) to output Vercel-compatible serverless functions.

---

## Prerequisites

1. **A GitHub account** — you will push your code there so Vercel can auto-deploy.
2. **A Vercel account** — free tier works fine. Sign up at [vercel.com](https://vercel.com).
3. **Your Lovable Cloud backend credentials** — you need the Supabase project URL and keys.

---

## Step 1: Push Code to GitHub

### Option A — Using GitHub Desktop (easiest for beginners)

1. Install [GitHub Desktop](https://desktop.github.com).
2. Open GitHub Desktop → **File → Add Local Repository**.
3. Select your project folder (where `package.json` lives).
4. Click **"Publish repository"**.
5. Give it a name (e.g., `flockguard-ai`) and make it **Public** or **Private**.
6. Click **"Publish Repository"**.

### Option B — Using Git in terminal

```bash
# In your project root
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flockguard-ai.git
git push -u origin main
```

> Replace `YOUR_USERNAME` and `flockguard-ai` with your actual GitHub username and desired repo name.

---

## Step 2: Import Project into Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard).
2. Click **"Add New..." → Project**.
3. Under **"Import Git Repository"**, find your `flockguard-ai` repo and click **Import**.
4. On the **"Configure Project"** screen:
   - **Framework Preset**: Vercel might auto-detect something else. Make sure it says `Other` (or just leave it — the `vercel.json` file handles everything).
   - **Root Directory**: `./` (default, keep as-is).
   - **Build Command**: `bun run build` (auto-read from `vercel.json`).
   - **Output Directory**: `.vercel/output` (auto-read from `vercel.json`).
5. Click **"Deploy"**.

> The first deploy might fail because environment variables are missing. That's expected — continue to Step 3.

---

## Step 3: Add Environment Variables

After the first (failed) deploy, go to your project in Vercel dashboard:

1. Click **Settings → Environment Variables**.
2. Add **EVERY variable** listed below exactly as shown.

### Client-side variables (needed by the browser)

| Variable Name | Value | Where to find it |
|--------------|-------|------------------|
| `VITE_SUPABASE_URL` | `https://xdrlazherzgzxuklismu.supabase.co` | Lovable Cloud settings or `.env` file |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkcmxhemhlcnpnenh1a2xpc211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzQ1NDEsImV4cCI6MjA5NzExMDU0MX0.a7lQmy_WHvt_2RWyXWgDlzumujnThA-31divRFw-wnc` | `.env` file (starts with `eyJhbGc...`) |
| `VITE_SUPABASE_PROJECT_ID` | `xdrlazherzgzxuklismu` | `.env` file |

### Server-side variables (needed by API routes & server functions)

| Variable Name | Value | Where to find it |
|--------------|-------|------------------|
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` | Copy from above |
| `SUPABASE_PUBLISHABLE_KEY` | Same as `VITE_SUPABASE_PUBLISHABLE_KEY` | Copy from above |
| `SUPABASE_SERVICE_ROLE_KEY` | `YOUR_SERVICE_ROLE_KEY` | ⚠️ **See note below** |
| `SUPABASE_PROJECT_ID` | Same as `VITE_SUPABASE_PROJECT_ID` | Copy from above |

> **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is a **secret server-only key**. It bypasses all database security rules. You can find it in your Lovable Cloud panel under **Project Settings → API**. If you don't have access to it, your server functions that use `supabaseAdmin` will fail. For a school project, you may not need it if you only use `requireSupabaseAuth` (user-authenticated) flows.

### How to add them in Vercel

1. In the **Environment Variables** page:
   - **Key**: Paste the variable name (e.g., `VITE_SUPABASE_URL`).
   - **Value**: Paste the value.
   - **Environment**: Select **Production**, **Preview**, and **Development** (all three).
   - Click **Save**.
2. Repeat for every variable above.

---

## Step 4: Re-deploy

After all environment variables are set:

1. Go to your project in Vercel dashboard.
2. Click **Deployments** tab.
3. Find the latest failed deployment and click the three dots (⋯) → **Redeploy**.

Or simply make any small change and push to GitHub — Vercel auto-deploys on every push.

---

## Step 5: Verify the Deployment

Once the deploy succeeds:

1. Vercel gives you a URL like `https://flockguard-ai.vercel.app`.
2. Open it in a browser.
3. Test these key flows:
   - **Homepage loads** without errors.
   - **Authentication** (sign up / log in) works.
   - **Dashboard** loads data from your Supabase database.
   - **Image Analysis / Diagnosis** works (if you use the Gemini API).
   - **Farm Management** and other data pages load correctly.

---

## Troubleshooting

### Build fails with "No output directory named \".vercel/output\""

- Make sure `vite.config.ts` has `nitro: { preset: "vercel" }` — this is what tells Nitro to write to `.vercel/output`.
- Check that `vercel.json` exists with `"outputDirectory": ".vercel/output"`.

### App builds but shows "Unauthorized" or "Error 500" on every page

- You forgot to add **environment variables**. Go back to Step 3.
- Specifically, missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` causes auth and database failures.

### "SUPABASE_SERVICE_ROLE_KEY is not defined" in server functions

- This key is needed for admin-level operations (like `supabaseAdmin` in `client.server.ts`).
- If you don't have it, avoid features that use admin-level database access, or get it from your backend panel.

### "Cannot find module" or TypeScript errors during build

- Make sure `bun install` ran correctly. Check Vercel build logs.
- Delete `node_modules` and `bun.lockb` locally, re-run `bun install`, commit the updated lockfile, and push.

### Styles look wrong / Tailwind not working

- This project uses Tailwind CSS v4 with `@tailwindcss/vite`. The Lovable config already handles this.
- If styles break, make sure `src/styles.css` exists and is imported in `src/routes/__root.tsx`.

---

## Optional: Custom Domain

1. In Vercel dashboard, go to **Settings → Domains**.
2. Enter your custom domain (e.g., `flockguard-ai.com`).
3. Follow Vercel's DNS instructions (add a CNAME or A record at your domain registrar).
4. Vercel automatically provisions HTTPS.

---

## Environment Summary

| Platform | Purpose |
|----------|---------|
| **Vercel** | Hosts your frontend + serverless API routes |
| **Lovable Cloud (Supabase)** | Database, Authentication, Storage |
| **GitHub** | Source code repository + triggers Vercel deploys |

---

## Important Notes for Your Final Year Project

1. **Keep Supabase running**: Your database lives on Lovable Cloud (Supabase). Vercel only hosts the frontend code. The database is separate and stays active as long as your Supabase project exists.

2. **Free tier limits**:
   - Vercel Free: 100 GB bandwidth, 6,000 build minutes per month.
   - Supabase Free: 500 MB database, 2 GB bandwidth.
   - For a school project / demo, these limits are more than enough.

3. **Back up your database**: Before making major schema changes, export your tables as CSV from the Lovable Cloud panel.

4. **Show your deploy URL in your report**: Include the live Vercel URL in your final year documentation as proof of deployment.

5. **Training notebook**: The Google Colab notebook (`train_poultry_model.ipynb`) you created is separate — it runs on Google's servers, not Vercel. Keep it for your thesis methodology chapter.

---

If you hit any specific error during deployment, share the exact error message and I'll help you fix it!
