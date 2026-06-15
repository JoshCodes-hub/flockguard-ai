import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeFarmHealthScore } from "@/lib/disease-engine";
import { Activity, AlertTriangle, Leaf, ScanLine, Stethoscope, Upload } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PoultryGuard AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const [farmsR, predsR, recR] = await Promise.all([
        supabase.from("farms").select("id, farm_name, bird_count"),
        supabase.from("predictions").select("id, prediction, confidence, risk_level, prediction_source, created_at").order("created_at", { ascending: false }).limit(50),
        supabase.from("poultry_records").select("id").limit(1),
      ]);
      return { farms: farmsR.data ?? [], predictions: predsR.data ?? [], hasRecords: (recR.data?.length ?? 0) > 0 };
    },
  });

  useEffect(() => {
    if (!isLoading && data && data.farms.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, data, navigate]);


  const farms = data?.farms ?? [];
  const preds = data?.predictions ?? [];
  const totalBirds = farms.reduce((s, f) => s + (f.bird_count ?? 0), 0);
  const activeAlerts = preds.filter((p) => p.risk_level === "High").length;
  const healthScore = computeFarmHealthScore(preds.map((p) => ({ ...p, confidence: Number(p.confidence) })));
  const healthyBirds = Math.round(totalBirds * (healthScore / 100));

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">OPERATIONAL OVERVIEW</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/health-record/new" className="px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-sm inline-flex items-center gap-2"><Stethoscope className="size-3.5" /> New Record</Link>
          <Link to="/image-analysis" className="px-4 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest rounded-sm inline-flex items-center gap-2"><Upload className="size-3.5" /> Analyze Image</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL BIRDS" value={totalBirds.toLocaleString()} sub={`${farms.length} farm${farms.length === 1 ? "" : "s"}`} />
        <StatCard label="HEALTHY BIRDS" value={healthyBirds.toLocaleString()} sub={`Health score ${healthScore}/100`} accent={healthScore >= 80 ? "primary" : healthScore >= 50 ? "warning" : "danger"} />
        <StatCard label="ACTIVE ALERTS" value={String(activeAlerts).padStart(2, "0")} sub={activeAlerts === 0 ? "All clear" : "Requires review"} accent={activeAlerts === 0 ? "primary" : "danger"} />
        <StatCard label="PREDICTIONS RUN" value={preds.length.toLocaleString()} sub="All time" />
      </div>

      {!isLoading && preds.length > 0 && <ChartsSection preds={preds} />}



      <div className="bg-surface border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest mb-1">CLINICAL DECISION SUPPORT ENGINE</p>
            <h3 className="font-extrabold tracking-tighter text-xl">Recent Analysis Stream</h3>
          </div>
          <Link to="/farms" className="text-[10px] font-mono border border-border px-3 py-1 uppercase tracking-widest hover:bg-background">View Farms</Link>
        </div>
        {isLoading ? (
          <p className="text-sm text-foreground/40 font-mono">LOADING…</p>
        ) : preds.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] text-foreground/40 uppercase">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Prediction</th>
                  <th className="pb-3 pr-4">Confidence</th>
                  <th className="pb-3 pr-4">Source</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border">
                {preds.slice(0, 8).map((p) => (
                  <tr key={p.id} className="hover:bg-primary-soft/20 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs opacity-60">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-3 pr-4 font-bold">
                      <Link to="/predictions/$id" params={{ id: p.id }} className="hover:text-primary">{p.prediction}</Link>
                    </td>
                    <td className="py-3 pr-4 font-mono">{Number(p.confidence).toFixed(0)}%</td>
                    <td className="py-3 pr-4 text-xs uppercase font-mono opacity-60">{p.prediction_source === "vision_ai" ? "Vision AI" : "CDSE"}</td>
                    <td className="py-3 text-right"><RiskBadge level={p.risk_level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction to="/farms" icon={Leaf} title="Manage Farms" />
        <QuickAction to="/health-record/new" icon={Activity} title="Add Health Record" />
        <QuickAction to="/image-analysis" icon={ScanLine} title="Scan Bird Image" />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "primary" | "warning" | "danger" }) {
  const color = accent === "primary" ? "text-primary" : accent === "danger" ? "text-destructive" : accent === "warning" ? "text-warning" : "";
  return (
    <div className="bg-background border border-border p-5 md:p-6">
      <p className="font-mono text-[10px] text-foreground/40 mb-3 tracking-widest">{label}</p>
      <div className={`text-3xl md:text-4xl font-extrabold tracking-tighter mb-1 ${color}`}>{value}</div>
      {sub && <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">{sub}</p>}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const map = {
    High: "bg-destructive/10 text-destructive",
    Medium: "bg-warning/10 text-warning",
    Low: "bg-primary-soft text-primary",
  } as const;
  const cls = map[level as keyof typeof map] ?? "bg-muted text-foreground/60";
  return <span className={`${cls} px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-tighter`}>{level}</span>;
}

function QuickAction({ to, icon: Icon, title }: { to: string; icon: typeof Activity; title: string }) {
  return (
    <Link to={to} className="bg-background border border-border p-6 hover:bg-surface transition-colors flex items-center gap-4">
      <div className="size-10 bg-primary-soft grid place-items-center"><Icon className="size-5 text-primary" /></div>
      <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <AlertTriangle className="size-8 text-foreground/30 mx-auto mb-3" />
      <p className="text-sm text-foreground/60 mb-4">No predictions yet. Add a farm and submit a health record to get started.</p>
      <Link to="/farms" className="inline-block px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-sm">Create First Farm</Link>
    </div>
  );
}

type Pred = { id: string; prediction: string; confidence: number | string; risk_level: string; prediction_source: string; created_at: string };

function ChartsSection({ preds }: { preds: Pred[] }) {
  // Last 14 days health trend + volume
  const days: { date: string; label: string; score: number; count: number }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayPreds = preds.filter((p) => p.created_at.slice(0, 10) === key);
    const score = dayPreds.length
      ? computeFarmHealthScore(dayPreds.map((p) => ({ ...p, confidence: Number(p.confidence) })))
      : 100;
    days.push({ date: key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), score, count: dayPreds.length });
  }

  // Disease breakdown
  const counts = new Map<string, number>();
  preds.forEach((p) => counts.set(p.prediction, (counts.get(p.prediction) ?? 0) + 1));
  const diseases = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Risk distribution
  const risk = ["High", "Medium", "Low"].map((level) => ({
    level,
    count: preds.filter((p) => p.risk_level === level).length,
  }));
  const riskColors: Record<string, string> = { High: "hsl(var(--destructive))", Medium: "hsl(var(--warning))", Low: "hsl(var(--primary))" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-surface border border-border p-6 lg:col-span-2">
        <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest mb-1">TREND · 14 DAYS</p>
        <h3 className="font-extrabold tracking-tighter text-xl mb-4">Health Score Over Time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={days} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.5)" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.5)" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#hg)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface border border-border p-6">
        <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest mb-1">RISK MIX</p>
        <h3 className="font-extrabold tracking-tighter text-xl mb-4">Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={risk} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="level" tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.5)" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.5)" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {risk.map((r) => <Cell key={r.level} fill={riskColors[r.level]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface border border-border p-6 lg:col-span-2">
        <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest mb-1">DETECTIONS</p>
        <h3 className="font-extrabold tracking-tighter text-xl mb-4">Top Conditions Detected</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={diseases} layout="vertical" margin={{ left: 20, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.5)" }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--foreground) / 0.7)" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface border border-border p-6">
        <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest mb-1">ACTIVITY</p>
        <h3 className="font-extrabold tracking-tighter text-xl mb-4">Daily Prediction Volume</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={days} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.5)" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.5)" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
