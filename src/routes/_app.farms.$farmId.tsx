import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeFarmHealthScore } from "@/lib/disease-engine";
import { ArrowLeft, Stethoscope, Upload } from "lucide-react";

export const Route = createFileRoute("/_app/farms/$farmId")({
  head: () => ({ meta: [{ title: "Farm Detail — PoultryGuard" }] }),
  component: FarmDetail,
  notFoundComponent: () => <div className="p-10">Farm not found.</div>,
  errorComponent: ({ error }) => <div className="p-10 text-destructive">{error.message}</div>,
});

function FarmDetail() {
  const { farmId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["farm", farmId],
    queryFn: async () => {
      const [farmR, recR, predR] = await Promise.all([
        supabase.from("farms").select("*").eq("id", farmId).maybeSingle(),
        supabase.from("poultry_records").select("*").eq("farm_id", farmId).order("created_at", { ascending: false }).limit(50),
        supabase.from("predictions").select("*").eq("farm_id", farmId).order("created_at", { ascending: false }).limit(50),
      ]);
      if (!farmR.data) throw notFound();
      return { farm: farmR.data, records: recR.data ?? [], predictions: predR.data ?? [] };
    },
  });

  if (isLoading) return <div className="p-10 font-mono text-xs text-foreground/40">LOADING…</div>;
  if (!data) return null;

  const { farm, records, predictions } = data;
  const score = computeFarmHealthScore(predictions.map((p) => ({ ...p, confidence: Number(p.confidence) })));
  const activeCases = predictions.filter((p) => p.risk_level === "High").length;

  // Build timeline (records + predictions)
  type Item = { date: string; type: "record" | "prediction"; data: typeof records[number] | typeof predictions[number] };
  const timeline: Item[] = [
    ...records.map((r) => ({ date: r.created_at, type: "record" as const, data: r })),
    ...predictions.map((p) => ({ date: p.created_at, type: "prediction" as const, data: p })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8">
      <Link to="/farms" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/60 hover:text-primary"><ArrowLeft className="size-3.5" /> All Farms</Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">FARM DETAIL</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">{farm.farm_name}</h1>
          <p className="text-sm text-foreground/60 mt-2">{farm.location || "—"} · {farm.bird_type}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/health-record/new" search={{ farm: farm.id }} className="px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-sm inline-flex items-center gap-2"><Stethoscope className="size-3.5" /> Health Record</Link>
          <Link to="/image-analysis" search={{ farm: farm.id }} className="px-4 py-2.5 bg-foreground text-background text-xs font-bold uppercase tracking-widest rounded-sm inline-flex items-center gap-2"><Upload className="size-3.5" /> Scan</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="TOTAL BIRDS" value={farm.bird_count.toLocaleString()} />
        <Stat label="HEALTH SCORE" value={`${score}`} sub={score >= 80 ? "OPTIMAL" : score >= 50 ? "WATCH" : "AT RISK"} color={score >= 80 ? "text-primary" : score >= 50 ? "text-warning" : "text-destructive"} />
        <Stat label="ACTIVE CASES" value={String(activeCases).padStart(2, "0")} color={activeCases ? "text-destructive" : ""} />
        <Stat label="HEALTH RECORDS" value={String(records.length).padStart(2, "0")} />
      </div>

      <div className="bg-surface border border-border p-6">
        <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest mb-1">HEALTH HISTORY TIMELINE</p>
        <h2 className="text-2xl font-extrabold tracking-tighter mb-6">Recent activity</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-foreground/60">No activity yet for this farm.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-6">
            {timeline.slice(0, 30).map((item, i) => (
              <li key={i} className="ml-6">
                <span className={`absolute -left-1.5 mt-1.5 size-3 rounded-full ${item.type === "prediction" ? "bg-primary" : "bg-foreground/30"}`} />
                <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mb-1">{new Date(item.date).toLocaleString()} · {item.type === "prediction" ? "PREDICTION" : "HEALTH RECORD"}</p>
                {item.type === "prediction" ? (
                  <Link to="/predictions/$id" params={{ id: (item.data as typeof predictions[number]).id }} className="block hover:text-primary">
                    <p className="font-bold">{(item.data as typeof predictions[number]).prediction} · {Number((item.data as typeof predictions[number]).confidence).toFixed(0)}% · {(item.data as typeof predictions[number]).risk_level} risk</p>
                  </Link>
                ) : (
                  <p className="text-sm">
                    {(item.data as typeof records[number]).symptoms?.length ? `Symptoms: ${(item.data as typeof records[number]).symptoms.join(", ")}` : "Routine check"} · feed {(item.data as typeof records[number]).feed_intake ?? "—"} · activity {(item.data as typeof records[number]).activity_level ?? "—"}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-background border border-border p-6">
      <p className="font-mono text-[10px] text-foreground/40 mb-3 tracking-widest">{label}</p>
      <div className={`text-3xl md:text-4xl font-extrabold tracking-tighter ${color ?? ""}`}>{value}</div>
      {sub && <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40 mt-1">{sub}</p>}
    </div>
  );
}
