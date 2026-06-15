import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Leaf, Activity, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({
  component: AdminPage,
});

type Stats = {
  farmers: number;
  farms: number;
  predictions: number;
  highRisk: number;
};

type RecentPrediction = {
  id: string;
  prediction: string;
  risk_level: string;
  confidence: number;
  created_at: string;
};

function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentPrediction[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) { setIsAdmin(false); return; }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!roleRow;
      setIsAdmin(admin);
      if (!admin) return;

      const [profilesRes, farmsRes, predsRes, highRes, recentRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("farms").select("id", { count: "exact", head: true }),
        supabase.from("predictions").select("id", { count: "exact", head: true }),
        supabase.from("predictions").select("id", { count: "exact", head: true }).eq("risk_level", "High"),
        supabase.from("predictions").select("id, prediction, risk_level, confidence, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      setStats({
        farmers: profilesRes.count ?? 0,
        farms: farmsRes.count ?? 0,
        predictions: predsRes.count ?? 0,
        highRisk: highRes.count ?? 0,
      });
      setRecent((recentRes.data as RecentPrediction[]) ?? []);

      const { data: all } = await supabase.from("predictions").select("prediction");
      const counts: Record<string, number> = {};
      (all ?? []).forEach((p: { prediction: string }) => {
        counts[p.prediction] = (counts[p.prediction] ?? 0) + 1;
      });
      setBreakdown(counts);
    })();
  }, []);

  if (isAdmin === null) {
    return <div className="p-10 font-mono text-xs text-foreground/40 tracking-widest">CHECKING ACCESS…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-10 max-w-xl">
        <h1 className="font-display text-3xl mb-2">Access denied</h1>
        <p className="text-foreground/60">You need the admin role to view this page.</p>
      </div>
    );
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50 mb-2">/ Admin</p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">Platform Overview</h1>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard icon={Users} label="Farmers" value={stats?.farmers ?? 0} />
        <StatCard icon={Leaf} label="Farms" value={stats?.farms ?? 0} />
        <StatCard icon={Activity} label="Predictions" value={stats?.predictions ?? 0} />
        <StatCard icon={AlertTriangle} label="High Risk" value={stats?.highRisk ?? 0} tone="destructive" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 border border-border rounded-sm bg-card">
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60 mb-4">Disease Breakdown</h2>
          {Object.keys(breakdown).length === 0 ? (
            <p className="text-foreground/40 text-sm">No predictions yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(breakdown).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{k}</span>
                    <span className="font-mono text-xs text-foreground/60">{v} · {Math.round((v / total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-foreground/10 rounded-sm overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(v / total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border border-border rounded-sm bg-card">
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60 mb-4">Recent Predictions</h2>
          {recent.length === 0 ? (
            <p className="text-foreground/40 text-sm">No predictions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{r.prediction}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 ${
                    r.risk_level === "High" ? "bg-destructive/15 text-destructive" :
                    r.risk_level === "Medium" ? "bg-foreground/10" : "bg-primary/10 text-primary"
                  }`}>{r.risk_level} · {r.confidence}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone?: "destructive" }) {
  return (
    <div className="p-5 border border-border rounded-sm bg-card">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`size-4 ${tone === "destructive" ? "text-destructive" : "text-foreground/40"}`} />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50">{label}</span>
      </div>
      <p className={`font-display text-4xl tracking-tight ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
