import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database, Image, CheckCircle2, XCircle, GraduationCap, ExternalLink, Layers } from "lucide-react";

export const Route = createFileRoute("/_app/dataset")({
  component: DatasetPage,
});

type ImgRow = { id: string; prediction: string | null; created_at: string };
type PredRow = { id: string; prediction: string; is_verified: boolean; prediction_source: string; created_at: string };

function DatasetPage() {
  const [imgs, setImgs] = useState<ImgRow[]>([]);
  const [preds, setPreds] = useState<PredRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [imgRes, predRes] = await Promise.all([
        supabase.from("uploaded_images").select("id, prediction, created_at").order("created_at", { ascending: false }),
        supabase.from("predictions").select("id, prediction, is_verified, prediction_source, created_at").order("created_at", { ascending: false }),
      ]);
      setImgs((imgRes.data as ImgRow[]) ?? []);
      setPreds((predRes.data as PredRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 font-mono text-xs text-foreground/40 tracking-widest">LOADING DATASET…</div>;

  const healthy = imgs.filter((i) => i.prediction === "Healthy").length;
  const avian = imgs.filter((i) => i.prediction === "Avian Influenza").length;
  const newcastle = imgs.filter((i) => i.prediction === "Newcastle Disease").length;
  const other = imgs.length - healthy - avian - newcastle;
  const verified = preds.filter((p) => p.is_verified).length;
  const unverified = preds.length - verified;
  const verifiedRatio = preds.length === 0 ? 0 : Math.round((verified / preds.length) * 100);

  const trainingReady = preds.filter((p) => p.is_verified && p.prediction !== "Inconclusive");

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50 mb-2">/ Dataset Collection</p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">Training Dataset</h1>
        <p className="text-foreground/60 mt-2 max-w-2xl">
          PoultryGuard AI continuously gathers field-validated disease records and bird images. Veterinarian-verified cases form the training corpus for future machine-learning model upgrades (YOLOv8, Random Forest, XGBoost).
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard icon={Image} label="Total Images" value={imgs.length} />
        <StatCard icon={CheckCircle2} label="Verified Cases" value={verified} tone="primary" />
        <StatCard icon={XCircle} label="Unverified" value={unverified} tone="muted" />
        <StatCard icon={GraduationCap} label="Training-Ready" value={trainingReady.length} tone="accent" />
      </section>

      <section className="grid lg:grid-cols-2 gap-6 mb-10">
        <Card title="Image Class Distribution">
          <Bar label="Healthy" value={healthy} total={Math.max(imgs.length, 1)} color="bg-primary" />
          <Bar label="Avian Influenza" value={avian} total={Math.max(imgs.length, 1)} color="bg-destructive" />
          <Bar label="Newcastle Disease" value={newcastle} total={Math.max(imgs.length, 1)} color="bg-[#E65100]" />
          <Bar label="Other / Inconclusive" value={other} total={Math.max(imgs.length, 1)} color="bg-foreground/30" />
        </Card>

        <Card title="Veterinary Verification Progress">
          <div className="text-center py-6">
            <div className="relative inline-block">
              <svg width="160" height="160" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="10"
                  strokeDasharray={`${(verifiedRatio / 100) * 264} 264`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div>
                  <p className="font-display text-3xl tracking-tight">{verifiedRatio}%</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">Verified</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-foreground/60 mt-4">
              {verified} of {preds.length} predictions have been confirmed by a veterinarian.
            </p>
          </div>
        </Card>
      </section>

      <section className="mb-10">
        <div className="flex items-start gap-4 mb-6">
          <Layers className="size-6 text-foreground/60 shrink-0 mt-1" />
          <div>
            <h2 className="font-display text-2xl tracking-tight mb-1">Two-Tier Dataset Strategy</h2>
            <p className="text-sm text-foreground/60 max-w-2xl">
              PoultryGuard AI is pre-trained on publicly labeled poultry datasets and FAO clinical guidelines (Tier 1), then continuously improved with vet-verified field cases from Ghanaian farms (Tier 2).
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="Tier 1 — Seed Datasets (Public)">
            <SourceRow
              name="Poultry Diseases Detection"
              meta="~6,800 labeled images · Kaggle"
              detail="Healthy · Coccidiosis · Salmonella · Newcastle"
              href="https://www.kaggle.com/datasets/kausthubkannan/poultry-diseases-detection"
            />
            <SourceRow
              name="Chicken Disease Classification"
              meta="Tabular symptoms → disease · Kaggle"
              detail="Used to tune CDSE rules and risk scoring"
              href="https://www.kaggle.com/datasets/allandclive/chicken-disease-1"
            />
            <SourceRow
              name="Poultry Fecal Images"
              meta="High-res labeled droppings · Mendeley / Zenodo"
              detail="Reinforces image classifier on dropping pathology"
              href="https://data.mendeley.com/datasets/8ppkpz1bvy/2"
            />
            <SourceRow
              name="FAO / WOAH Disease Bulletins"
              meta="Clinical guidelines · Public domain"
              detail="Symptom checklists for Newcastle, Gumboro, AI, Fowl Cholera"
              href="https://www.fao.org/animal-health/diseases/en"
            />
          </Card>

          <Card title="Tier 2 — Live Field Dataset (Ours)">
            <div className="text-sm text-foreground/70 space-y-3">
              <p>
                Real farmer submissions from Ghanaian poultry farms, validated by licensed veterinarians via the Vet Portal.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <MiniStat label="Field Images" value={imgs.length} />
                <MiniStat label="Vet-Verified" value={verified} />
                <MiniStat label="Symptom Records" value={preds.length} />
                <MiniStat label="Training-Ready" value={trainingReady.length} />
              </div>
              <p className="text-xs text-foreground/50 pt-2">
                Field data is preferred for retraining because it reflects local breeds, climate, and husbandry conditions absent from public datasets.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="border border-primary/30 bg-primary/5 rounded-sm p-6">
        <div className="flex items-start gap-4">
          <Database className="size-6 text-primary shrink-0 mt-1" />
          <div>
            <h2 className="font-display text-2xl tracking-tight mb-2">Research Roadmap</h2>
            <p className="text-sm text-foreground/70 mb-4">
              Tier 1 datasets bootstrap the model on day one. As Tier 2 (vet-verified field data) reaches critical mass per disease class, the rule-based engine can be transparently replaced with a fine-tuned ML model — without changing the UI, server functions, or database schema.
            </p>
            <ul className="space-y-1.5 text-sm text-foreground/70">
              <li className="flex gap-2"><span className="text-primary">▪</span> Hybrid rule engine + Gemini Vision (current)</li>
              <li className="flex gap-2"><span className="text-foreground/40">▪</span> YOLOv8 fine-tuned on Tier 1 + Tier 2 images</li>
              <li className="flex gap-2"><span className="text-foreground/40">▪</span> Random Forest / XGBoost on tabular records</li>
              <li className="flex gap-2"><span className="text-foreground/40">▪</span> Real-time IoT signals (ESP32 + DHT22) as additional features</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Image; label: string; value: number; tone?: "primary" | "muted" | "accent" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "muted" ? "text-foreground/40" : "";
  return (
    <div className="p-5 border border-border rounded-sm bg-card">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`size-4 ${cls || "text-foreground/40"}`} />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50">{label}</span>
      </div>
      <p className={`font-display text-4xl tracking-tight ${cls}`}>{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 border border-border rounded-sm bg-card">
      <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60 mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono text-xs text-foreground/60">{value} · {pct}%</span>
      </div>
      <div className="h-2 bg-foreground/10 rounded-sm overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SourceRow({ name, meta, detail, href }: { name: string; meta: string; detail: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block p-3 -mx-3 rounded-sm hover:bg-foreground/5 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{name}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50 mt-0.5">{meta}</p>
          <p className="text-xs text-foreground/60 mt-1">{detail}</p>
        </div>
        <ExternalLink className="size-3.5 text-foreground/40 group-hover:text-primary shrink-0 mt-1" />
      </div>
    </a>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 border border-border rounded-sm">
      <p className="font-display text-2xl tracking-tight">{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-foreground/50 mt-1">{label}</p>
    </div>
  );
}
