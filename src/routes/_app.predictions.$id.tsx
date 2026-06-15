import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { verifyPrediction } from "@/lib/predictions.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/predictions/$id")({
  head: () => ({ meta: [{ title: "Prediction — PoultryGuard AI" }] }),
  component: PredictionPage,
});

type Factor = { label: string; weight: number; direction: string; detail?: string };

function PredictionPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const verifyFn = useServerFn(verifyPrediction);

  const { data: pred, isLoading } = useQuery({
    queryKey: ["prediction", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("predictions").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function verify(is_verified: boolean) {
    setSaving(true);
    try {
      await verifyFn({ data: { prediction_id: id, is_verified, notes: notes || undefined } });
      toast.success(is_verified ? "Marked verified" : "Marked unverified");
      qc.invalidateQueries({ queryKey: ["prediction", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <div className="p-10 font-mono text-xs text-foreground/40">LOADING…</div>;
  if (!pred) return <div className="p-10">Prediction not found.</div>;

  const factors = (Array.isArray(pred.factors) ? pred.factors : []) as Factor[];
  const riskColor = pred.risk_level === "High" ? "bg-destructive text-destructive-foreground" : pred.risk_level === "Medium" ? "bg-warning text-background" : "bg-primary text-primary-foreground";

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-5xl">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/60 hover:text-primary"><ArrowLeft className="size-3.5" /> Dashboard</Link>

      <div className="bg-foreground text-background p-8 md:p-12 rounded-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-background/10 pb-6">
          <div>
            <p className="font-mono text-[10px] opacity-50 mb-4 tracking-widest uppercase">{pred.prediction_source === "vision_ai" ? "VISION AI ANALYSIS" : "CLINICAL DECISION SUPPORT ENGINE"}</p>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none">{pred.prediction}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-extrabold">{Number(pred.confidence).toFixed(0)}<span className="text-sm opacity-50 uppercase ml-1">% CONF</span></div>
            <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${riskColor}`}>{pred.risk_level} RISK</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] font-mono opacity-50 mb-2 tracking-widest uppercase">Recommendation</p>
            <p className="text-sm leading-relaxed">{pred.recommendation}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono opacity-50 mb-2 tracking-widest uppercase">Explain Prediction · Top Factors</p>
            <ul className="space-y-3">
              {factors.slice(0, 6).map((f, i) => (
                <li key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold">{f.label}</span>
                    <span className="font-mono opacity-60">{Math.round((f.weight ?? 0) * 100)}%</span>
                  </div>
                  <div className="h-1 bg-background/10 rounded-full overflow-hidden">
                    <div className={`h-full ${f.direction === "newcastle" ? "bg-destructive" : f.direction === "avian" ? "bg-warning" : f.direction === "healthy" ? "bg-primary" : "bg-background/40"}`} style={{ width: `${Math.min(100, (f.weight ?? 0) * 100)}%` }} />
                  </div>
                  {f.detail && <p className="text-[10px] opacity-50 mt-1">{f.detail}</p>}
                </li>
              ))}
              {factors.length === 0 && <li className="text-xs opacity-60">No contributing factors recorded.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          {pred.is_verified ? <ShieldCheck className="size-5 text-primary" /> : <AlertCircle className="size-5 text-warning" />}
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">VERIFICATION · BUILDS TRAINING DATASET</p>
        </div>
        <p className="text-sm text-foreground/70 mb-4">{pred.is_verified ? "This prediction has been verified and is available for future ML training." : "Mark this prediction as verified once you've confirmed the diagnosis. Verified predictions feed the dataset that will train the next-generation model."}</p>
        {pred.verification_notes && <p className="text-xs italic mb-3 text-foreground/60">"{pred.verification_notes}"</p>}
        <Textarea placeholder="Verification notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mb-3" />
        <div className="flex gap-2">
          <Button onClick={() => verify(true)} disabled={saving} className="rounded-sm text-xs font-bold uppercase tracking-widest">Mark Verified</Button>
          <Button onClick={() => verify(false)} disabled={saving} variant="outline" className="rounded-sm text-xs font-bold uppercase tracking-widest">Unverify</Button>
        </div>
      </div>

      <p className="text-xs font-mono text-foreground/40">RECORDED {new Date(pred.created_at).toLocaleString()} · ID {pred.id.slice(0, 8)}</p>
    </div>
  );
}
