import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeFarmHealthScore } from "@/lib/disease-engine";
import { Activity, AlertTriangle, Leaf, ScanLine, Stethoscope, Upload } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PoultryGuard AI" }] }),
  component: Dashboard,
});

function Dashboard() {
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

  const farms = data?.farms ?? [];
  const preds = data?.predictions ?? [];
  const totalBirds = farms.reduce((s, f) => s + (f.bird_count ?? 0), 0);
  const activeAlerts = preds.filter((p) => p.risk_level === "High").length;
  const healthScore = computeFarmHealthScore(preds.map((p) => ({ ...p, confidence: Number(p.confidence) })));
  const healthyBirds = Math.round(totalBirds * (healthScore / 100));

  return (
    <div className="p-6 md:p-10 space-y-8">
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
