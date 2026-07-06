import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Leaf, Stethoscope, Sparkles, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/onboarding")({
  head: () => ({ meta: [{ title: "Get Started — PoultryGuard" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["onboarding-state"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const [farmsR, recR, predR, profR] = await Promise.all([
        supabase.from("farms").select("id, farm_name").limit(1),
        supabase.from("poultry_records").select("id").limit(1),
        supabase.from("predictions").select("id").limit(1),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      return {
        userId: user.id,
        firstName: (profR.data?.full_name ?? user.email ?? "there").split(" ")[0],
        firstFarmId: farmsR.data?.[0]?.id ?? null,
        hasFarm: (farmsR.data?.length ?? 0) > 0,
        hasRecord: (recR.data?.length ?? 0) > 0,
        hasPrediction: (predR.data?.length ?? 0) > 0,
      };
    },
  });

  const [farmName, setFarmName] = useState("");
  const [birdCount, setBirdCount] = useState("");
  const [location, setLocation] = useState("");
  const [creatingFarm, setCreatingFarm] = useState(false);

  async function createFarm(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !farmName.trim()) return;
    setCreatingFarm(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreatingFarm(false); return; }
    const { error } = await supabase.from("farms").insert({
      user_id: user.id,
      farm_name: farmName.trim(),
      bird_count: birdCount ? Number(birdCount) : 0,
      location: location.trim() || null,
    });
    setCreatingFarm(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Farm created");
    setFarmName(""); setBirdCount(""); setLocation("");
    refetch();
  }

  if (isLoading || !data) {
    return <div className="p-10 text-foreground/40 font-mono text-xs">LOADING…</div>;
  }

  const step = !data.hasFarm ? 1 : !data.hasRecord ? 2 : !data.hasPrediction ? 2 : 3;
  const complete = data.hasFarm && data.hasRecord && data.hasPrediction;

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-2">WELCOME</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">Hello, {data.firstName}.</h1>
        <p className="text-sm text-foreground/60 mt-2 max-w-2xl">Three quick steps to set up your first farm, log a health record, and see your first AI prediction.</p>
      </div>

      {/* Progress bar */}
      <div className="bg-surface border border-border p-6">
        <div className="grid grid-cols-3 gap-4">
          <ProgressStep n={1} label="Create Farm" done={data.hasFarm} active={step === 1} />
          <ProgressStep n={2} label="Log Health Record" done={data.hasRecord} active={step === 2} />
          <ProgressStep n={3} label="See Prediction" done={data.hasPrediction} active={step === 3 && !complete} />
        </div>
      </div>

      {/* Step 1 */}
      {!data.hasFarm && (
        <section className="bg-surface border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 bg-primary-soft grid place-items-center"><Leaf className="size-5 text-primary" /></div>
            <div>
              <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">STEP 1</p>
              <h2 className="font-extrabold tracking-tighter text-xl">Create your first farm</h2>
            </div>
          </div>
          <form onSubmit={createFarm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Farm Name *" className="md:col-span-2">
              <input value={farmName} onChange={(e) => setFarmName(e.target.value)} maxLength={120} required className="ob-input" placeholder="Sunrise Poultry Farm" />
            </Field>
            <Field label="Bird Count">
              <input value={birdCount} onChange={(e) => setBirdCount(e.target.value)} type="number" min={0} max={1000000} className="ob-input" placeholder="500" />
            </Field>
            <Field label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} className="ob-input" placeholder="Nairobi, Kenya" />
            </Field>
            <div className="md:col-span-2 flex justify-end">
              <button disabled={creatingFarm} className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-sm disabled:opacity-50 inline-flex items-center gap-2">
                {creatingFarm ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                Create Farm
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Step 2 */}
      {data.hasFarm && !data.hasPrediction && (
        <section className="bg-surface border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 bg-primary-soft grid place-items-center"><Stethoscope className="size-5 text-primary" /></div>
            <div>
              <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">STEP 2</p>
              <h2 className="font-extrabold tracking-tighter text-xl">Log your first health observation</h2>
            </div>
          </div>
          <p className="text-sm text-foreground/60 mb-6">Record vitals and symptoms — the Clinical Decision Support Engine will generate a disease prediction automatically.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link to="/health-record/new" className="border border-border p-5 hover:bg-background flex items-start gap-4 group">
              <Stethoscope className="size-6 text-primary shrink-0" />
              <div>
                <h3 className="font-extrabold tracking-tighter mb-1">Symptom-based record</h3>
                <p className="text-xs text-foreground/60">Enter temperature, mortality, and observed symptoms.</p>
              </div>
              <ArrowRight className="size-4 ml-auto text-foreground/40 group-hover:text-primary" />
            </Link>
            <Link to="/image-analysis" className="border border-border p-5 hover:bg-background flex items-start gap-4 group">
              <Sparkles className="size-6 text-primary shrink-0" />
              <div>
                <h3 className="font-extrabold tracking-tighter mb-1">AI image analysis</h3>
                <p className="text-xs text-foreground/60">Upload a bird photo for instant computer-vision diagnosis.</p>
              </div>
              <ArrowRight className="size-4 ml-auto text-foreground/40 group-hover:text-primary" />
            </Link>
          </div>
        </section>
      )}

      {/* Complete */}
      {complete && (
        <section className="bg-surface border border-border p-8 text-center">
          <CheckCircle2 className="size-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold tracking-tighter mb-2">You're all set.</h2>
          <p className="text-sm text-foreground/60 mb-6 max-w-md mx-auto">Your farm is configured, you've logged your first record, and the AI engine has generated its first prediction.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => navigate({ to: "/dashboard" })} className="px-6 py-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-sm">Go to Dashboard</button>
            {data.firstFarmId && (
              <Link to="/farms/$farmId" params={{ farmId: data.firstFarmId }} className="px-6 py-3 border border-border text-xs font-bold uppercase tracking-widest rounded-sm">View Farm</Link>
            )}
          </div>
        </section>
      )}

      <style>{`.ob-input{width:100%;background:hsl(var(--background));border:1px solid hsl(var(--border));padding:0.625rem 0.75rem;font-size:0.875rem;font-family:inherit;outline:none}.ob-input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function ProgressStep({ n, label, done, active }: { n: number; label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${active ? "" : done ? "opacity-100" : "opacity-40"}`}>
      {done ? <CheckCircle2 className="size-6 text-primary shrink-0" /> : <Circle className={`size-6 shrink-0 ${active ? "text-primary" : "text-foreground/40"}`} />}
      <div className="min-w-0">
        <p className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">STEP {n}</p>
        <p className="text-xs font-bold uppercase tracking-widest truncate">{label}</p>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block font-mono text-[10px] text-foreground/50 uppercase tracking-widest mb-2">{label}</span>
      {children}
    </label>
  );
}
