# Vercel Deployment Guide for PoultryGuard

This guide walks you through deploying your PoultryGuard project (TanStack Start + Lovable Cloud / Supabase) on Vercel.

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

## Step 3: Add Environment Variables (Settings → Environment Variables)

**What are environment variables?** Think of them as "secret settings" your app needs to connect to its database and authentication system. Without them, your app won't know where your backend (Lovable Cloud / Supabase) is located.

**You need to add 7 variables total.** Here is exactly what to copy and where each value comes from.

---

### Where to find ALL your values

Open your project's `.env` file (it's in the main folder, next to `package.json`). It looks like this:

```
VITE_SUPABASE_URL=https://xdrlazherzgzxuklismu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=xdrlazherzgzxuklismu
```

**Copy every value from that file.** You will paste them into Vercel in the steps below.

---

### How to add them in Vercel (one by one)

1. In your Vercel project dashboard, click **Settings** at the top.
2. On the left sidebar, click **Environment Variables**.
3. You will see a form with three boxes: **Key**, **Value**, and **Environment**.

Now add each variable below using that form:

#### Group 1 — Client-side variables (browser needs these)

These start with `VITE_` because the browser needs to see them.

| # | Key (copy exactly) | Value (copy from your `.env` file) |
|---|----------------------|-------------------------------------|
| 1 | `VITE_SUPABASE_URL` | `https://xdrlazherzgzxuklismu.supabase.co` |
| 2 | `VITE_SUPABASE_PUBLISHABLE_KEY` | The long `eyJhbGc...` string from `.env` |
| 3 | `VITE_SUPABASE_PROJECT_ID` | `xdrlazherzgzxuklismu` |

For each one:
- Paste the **Key** exactly as shown in the table (including `VITE_`).
- Paste the **Value** from your `.env` file.
- Under **Environment**, tick all three boxes: **Production**, **Preview**, and **Development**.
- Click **Save**.

#### Group 2 — Server-side variables (backend API needs these)

These do NOT start with `VITE_` because they stay secret on the server.

| # | Key (copy exactly) | Value (copy from `.env` or use same as above) |
|---|----------------------|-----------------------------------------------|
| 4 | `SUPABASE_URL` | **Same as** `VITE_SUPABASE_URL` |
| 5 | `SUPABASE_PUBLISHABLE_KEY` | **Same as** `VITE_SUPABASE_PUBLISHABLE_KEY` |
| 6 | `SUPABASE_PROJECT_ID` | **Same as** `VITE_SUPABASE_PROJECT_ID` |
| 7 | `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ **See special note below** |

For variables 4, 5, and 6: just copy-paste the same values you used in Group 1.

---

### Special note: `SUPABASE_SERVICE_ROLE_KEY`

This is the **most secret key** in your project. It lets the server bypass all security rules. Think of it as a "master password."

**Do you need it?**
- If your app has an **Admin panel** or **Demo seeding** feature → **Yes, you need it.**
- If your app is just a regular user app (sign up, log in, dashboard) → **You might not need it.**

**Where to find it:**

Unfortunately, on **Lovable Cloud**, this key is managed by the platform and is **not directly visible** to you in a dashboard. Here are your options:

1. **If you have a `.env` file that already contains it** (e.g., `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...`), just copy and paste it.
2. **If you don't have it**, you have two choices:
   - **Option A**: Ask your project supervisor or the person who set up the backend to share it with you.
   - **Option B**: Skip it for now. Your app will work for most features (login, dashboard, diagnosis). Only admin/server-only features will fail. You can add it later.

> **Security warning**: Never share this key in public. Never paste it in a WhatsApp group or public GitHub repo. It is a server-only secret.

---

### Quick checklist before moving on

Make sure you have added these 7 keys in Vercel:

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `VITE_SUPABASE_PROJECT_ID`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_PUBLISHABLE_KEY`
- [ ] `SUPABASE_PROJECT_ID`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (if you have it)

If you are missing the Service Role key, that is okay — continue to Step 4.

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
