import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Bell, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/alerts")({
  component: AlertsPage,
});

type Alert = {
  id: string;
  farm_id: string;
  prediction: string;
  confidence: number;
  risk_level: string;
  recommendation: string;
  created_at: string;
  farms: { farm_name: string } | null;
};

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("predictions")
        .select("id, farm_id, prediction, confidence, risk_level, recommendation, created_at, farms(farm_name)")
        .in("risk_level", ["Medium", "High"])
        .order("created_at", { ascending: false })
        .limit(50);
      setAlerts((data as unknown as Alert[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const high = alerts.filter((a) => a.risk_level === "High");
  const medium = alerts.filter((a) => a.risk_level === "Medium");

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <header className="mb-10 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50 mb-2">/ Alerts</p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Active Alerts</h1>
          <p className="text-foreground/60 mt-2">Predictions flagged Medium or High risk across all your farms.</p>
        </div>
        <div className="flex gap-6">
          <Stat label="High Risk" value={high.length} tone="destructive" />
          <Stat label="Medium Risk" value={medium.length} tone="warning" />
        </div>
      </header>

      {loading ? (
        <p className="font-mono text-xs text-foreground/40 tracking-widest">LOADING ALERTS…</p>
      ) : alerts.length === 0 ? (
        <div className="border border-dashed border-border p-12 rounded-sm text-center">
          <Bell className="size-8 text-foreground/30 mx-auto mb-3" />
          <p className="text-foreground/60">No active alerts. All your farms look healthy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "destructive" | "warning" }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50">{label}</p>
      <p className={`font-display text-4xl tracking-tight ${tone === "destructive" ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const isHigh = alert.risk_level === "High";
  return (
    <Link
      to="/predictions/$id"
      params={{ id: alert.id }}
      className={`block p-5 border rounded-sm hover:shadow-sm transition-all ${
        isHigh ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`size-10 rounded-sm grid place-items-center shrink-0 ${
          isHigh ? "bg-destructive/15 text-destructive" : "bg-foreground/10 text-foreground/70"
        }`}>
          <AlertTriangle className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 rounded-sm ${
              isHigh ? "bg-destructive text-destructive-foreground" : "bg-foreground/10 text-foreground/70"
            }`}>{alert.risk_level} Risk</span>
            <h3 className="font-bold">{alert.prediction}</h3>
            <span className="font-mono text-xs text-foreground/50">{alert.confidence}%</span>
          </div>
          <p className="text-sm text-foreground/60 line-clamp-2">{alert.recommendation}</p>
          <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-foreground/40">
            <span>{alert.farms?.farm_name ?? "—"}</span>
            <span>·</span>
            <span>{new Date(alert.created_at).toLocaleString()}</span>
          </div>
        </div>
        <ArrowRight className="size-4 text-foreground/40 shrink-0 mt-2" />
      </div>
    </Link>
  );
}
