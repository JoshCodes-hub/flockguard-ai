import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { submitHealthRecord } from "@/lib/predictions.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const SYMPTOMS = ["Coughing", "Sneezing", "Difficulty Breathing", "Twisted Neck", "Reduced Feeding", "Reduced Egg Production", "Swollen Head", "Nasal Discharge"];

export const Route = createFileRoute("/_app/health-record/new")({
  head: () => ({ meta: [{ title: "New Health Record — PoultryGuard AI" }] }),
  validateSearch: z.object({ farm: z.string().optional() }),
  component: NewRecord,
});

function NewRecord() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const submit = useServerFn(submitHealthRecord);

  const { data: farms } = useQuery({
    queryKey: ["farms-list"],
    queryFn: async () => (await supabase.from("farms").select("id, farm_name")).data ?? [],
  });

  const [farmId, setFarmId] = useState(search.farm ?? "");
  const [form, setForm] = useState({
    temperature: "",
    humidity: "",
    feed_intake: "Medium" as "High" | "Medium" | "Low",
    water_consumption: "Medium" as "High" | "Medium" | "Low",
    activity_level: "Active" as "Active" | "Moderate" | "Weak",
    notes: "",
  });
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(s: string) {
    setSymptoms((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!farmId) return toast.error("Select a farm");
    setLoading(true);
    try {
      const res = await submit({
        data: {
          farm_id: farmId,
          temperature: form.temperature ? parseFloat(form.temperature) : null,
          humidity: form.humidity ? parseFloat(form.humidity) : null,
          feed_intake: form.feed_intake,
          water_consumption: form.water_consumption,
          activity_level: form.activity_level,
          symptoms,
          notes: form.notes || undefined,
        },
      });
      toast.success("Analysis complete");
      navigate({ to: "/predictions/$id", params: { id: res.prediction_id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to analyze");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">CLINICAL DECISION SUPPORT ENGINE</p>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-8">New Health Record</h1>

      <form onSubmit={onSubmit} className="space-y-6 bg-surface border border-border p-6 md:p-8">
        <div>
          <Label className="text-xs font-bold uppercase tracking-widest">Farm</Label>
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a farm" /></SelectTrigger>
            <SelectContent>
              {(farms ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.farm_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-widest">Temperature (°C)</Label>
            <Input type="number" step="0.1" placeholder="41.0" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-widest">Humidity (%)</Label>
            <Input type="number" step="0.1" placeholder="60" value={form.humidity} onChange={(e) => setForm({ ...form, humidity: e.target.value })} className="mt-1.5" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["feed_intake", "water_consumption"] as const).map((k) => (
            <div key={k}>
              <Label className="text-xs font-bold uppercase tracking-widest">{k.replace("_", " ")}</Label>
              <Select value={form[k]} onValueChange={(v) => setForm({ ...form, [k]: v as typeof form[typeof k] })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
          <div>
            <Label className="text-xs font-bold uppercase tracking-widest">Activity Level</Label>
            <Select value={form.activity_level} onValueChange={(v) => setForm({ ...form, activity_level: v as typeof form.activity_level })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Moderate">Moderate</SelectItem>
                <SelectItem value="Weak">Weak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-bold uppercase tracking-widest mb-3 block">Observed Symptoms</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SYMPTOMS.map((s) => (
              <label key={s} className={`flex items-center gap-2 border border-border p-3 cursor-pointer text-sm transition-colors ${symptoms.includes(s) ? "bg-primary-soft border-primary" : "bg-background hover:bg-muted"}`}>
                <Checkbox checked={symptoms.includes(s)} onCheckedChange={() => toggle(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs font-bold uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5" rows={3} />
        </div>

        <Button type="submit" disabled={loading} className="w-full md:w-auto rounded-sm text-xs font-bold uppercase tracking-widest px-8 py-3 h-auto">
          {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Analyzing</> : "Analyze Health Data"}
        </Button>
      </form>
    </div>
  );
}
