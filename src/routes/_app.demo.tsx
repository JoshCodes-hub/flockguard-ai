import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { seedDemoData, clearDemoData } from "@/lib/demo-seed.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Trash2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_app/demo")({
  component: DemoPage,
});

type Result = { records_created: number; predictions_created: number; images_created: number; credentials: { email: string; password: string; role: string }[] };

function DemoPage() {
  const seed = useServerFn(seedDemoData);
  const clear = useServerFn(clearDemoData);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState<null | "seed" | "clear">(null);
  const [result, setResult] = useState<Result | null>(null);
  const [cleared, setCleared] = useState<{ deleted_users: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSeed() {
    setErr(null); setLoading("seed"); setResult(null);
    try {
      const r = await seed({ data: { secret } });
      setResult(r as Result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(null); }
  }
  async function onClear() {
    setErr(null); setLoading("clear"); setCleared(null);
    try {
      const r = await clear({ data: { secret } });
      setCleared(r as { deleted_users: number });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(null); }
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-3xl mx-auto">
      <header className="mb-8">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50 mb-2">/ Development</p>
        <h1 className="font-display text-4xl tracking-tight">Demo Data</h1>
        <p className="text-foreground/60 mt-2">Seed demonstration accounts and sample farm data. Requires the DEMO_SEED_SECRET.</p>
      </header>

      <div className="border border-border rounded-sm p-6 bg-card space-y-4">
        <label className="block">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60 flex items-center gap-2">
            <KeyRound className="size-3" /> Demo Secret
          </span>
          <Input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Paste DEMO_SEED_SECRET"
            className="mt-2 font-mono"
          />
        </label>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={onSeed} disabled={!secret || loading !== null}>
            <Sparkles className="size-4 mr-2" />
            {loading === "seed" ? "Seeding…" : "Seed Demo Data"}
          </Button>
          <Button onClick={onClear} disabled={!secret || loading !== null} variant="outline">
            <Trash2 className="size-4 mr-2" />
            {loading === "clear" ? "Clearing…" : "Clear Demo Data"}
          </Button>
        </div>
        {err && <p className="text-destructive text-sm border border-destructive/30 bg-destructive/5 p-3 rounded-sm">{err}</p>}
      </div>

      {result && (
        <div className="mt-6 border border-primary/30 bg-primary/5 rounded-sm p-6">
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary mb-4">Seed Complete</h2>
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <Stat label="Records" value={result.records_created} />
            <Stat label="Predictions" value={result.predictions_created} />
            <Stat label="Images" value={result.images_created} />
          </div>
          <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60 mb-2">Demo Credentials</h3>
          <ul className="space-y-2">
            {result.credentials.map((c) => (
              <li key={c.email} className="flex items-center justify-between gap-2 text-sm font-mono bg-background p-3 rounded-sm border border-border">
                <div>
                  <p className="text-xs uppercase tracking-widest text-foreground/50">{c.role}</p>
                  <p>{c.email}</p>
                </div>
                <code className="text-xs text-foreground/70">{c.password}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cleared && (
        <div className="mt-6 border border-border rounded-sm p-5 text-sm">
          Cleared <strong>{cleared.deleted_users}</strong> demo user(s) and all associated data.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-3xl tracking-tight text-primary">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/60">{label}</p>
    </div>
  );
}
