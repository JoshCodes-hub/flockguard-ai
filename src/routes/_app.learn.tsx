import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, ShieldAlert, Syringe, Droplets, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/learn")({
  component: LearnPage,
});

type Topic = {
  id: string;
  title: string;
  tag: string;
  icon: typeof BookOpen;
  summary: string;
  symptoms: string[];
  prevention: string[];
  action: string;
};

const TOPICS: Topic[] = [
  {
    id: "avian-influenza",
    title: "Avian Influenza (H5N1)",
    tag: "High-Threat Disease",
    icon: ShieldAlert,
    summary:
      "Avian Influenza is a highly contagious viral disease that affects domestic poultry and wild birds. Highly Pathogenic Avian Influenza (HPAI) strains such as H5N1 can cause near 100% mortality within 48 hours.",
    symptoms: [
      "Sudden death with few or no clinical signs",
      "Swelling of the head, eyelids, comb, wattles",
      "Purple discoloration of wattles, combs and legs",
      "Respiratory distress: gasping, coughing, sneezing",
      "Greenish diarrhea and drop in egg production",
      "Nervous signs: tremors, twisted neck, paralysis",
    ],
    prevention: [
      "Strict biosecurity: footbaths, controlled visitor access, dedicated farm clothing",
      "Keep poultry away from wild birds and standing water",
      "Quarantine new birds for at least 14 days",
      "Disinfect equipment, vehicles and crates between flocks",
      "Report unusual mortality immediately to animal health authorities",
    ],
    action:
      "Isolate the flock, do not move birds or products off-farm, and contact your veterinary authority. HPAI is a notifiable disease in most countries.",
  },
  {
    id: "newcastle",
    title: "Newcastle Disease",
    tag: "Endemic Disease",
    icon: Syringe,
    summary:
      "Newcastle Disease is a viral disease caused by paramyxovirus. Velogenic strains can wipe out entire flocks. It is one of the most economically damaging diseases in poultry worldwide.",
    symptoms: [
      "Respiratory: gasping, coughing, sneezing, rales",
      "Greenish watery diarrhea",
      "Drop in egg production with soft-shelled or misshapen eggs",
      "Nervous signs: torticollis (twisted neck), tremors, paralysis",
      "Swelling around the eyes and neck",
      "Sudden death in unvaccinated flocks",
    ],
    prevention: [
      "Vaccinate chicks at day 1 (HB1/B1) and booster at 21 days (LaSota)",
      "Use IB+ND combined vaccines where available",
      "Maintain consistent vaccination calendar — Newcastle requires lifelong boosters",
      "Avoid mixing birds of different ages",
      "Disinfect drinkers, feeders and litter regularly",
    ],
    action:
      "Isolate symptomatic birds, increase vitamin and electrolyte support, and consult a veterinarian to confirm via lab test. Cull severely affected birds humanely.",
  },
  {
    id: "biosecurity",
    title: "Farm Biosecurity Basics",
    tag: "Prevention",
    icon: Droplets,
    summary:
      "Biosecurity is the first and cheapest line of defense against poultry disease. A consistent routine prevents most outbreaks before they begin.",
    symptoms: [],
    prevention: [
      "Single-entry farm with locked gate and visitor log",
      "Footbaths with fresh disinfectant (refreshed daily)",
      "Dedicated farm boots and overalls — never worn off-site",
      "All-in-all-out flock management",
      "Clean and disinfect houses between batches; rest period 7-14 days",
      "Source chicks from certified hatcheries only",
    ],
    action: "Print and post a daily biosecurity checklist near the farm entrance. Audit it weekly.",
  },
];

function LearnPage() {
  const [active, setActive] = useState<string>(TOPICS[0].id);
  const topic = TOPICS.find((t) => t.id === active) ?? TOPICS[0];
  const Icon = topic.icon;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <header className="mb-8 md:mb-12">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50 mb-2">/ Learning Center</p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">Disease & Husbandry Library</h1>
        <p className="text-foreground/60 mt-2 max-w-2xl">
          Evidence-based reference material for farmers. Bookmark and revisit when something feels off in the flock.
        </p>
      </header>

      <div className="grid md:grid-cols-[260px_1fr] gap-8">
        <nav className="space-y-1 md:sticky md:top-6 self-start">
          {TOPICS.map((t) => {
            const TIcon = t.icon;
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`w-full flex items-start gap-3 p-3 text-left rounded-sm border transition-colors ${
                  isActive ? "border-primary bg-accent/30" : "border-border hover:border-foreground/30"
                }`}
              >
                <TIcon className={`size-4 mt-0.5 ${isActive ? "text-primary" : "text-foreground/40"}`} />
                <div>
                  <p className="text-sm font-bold leading-tight">{t.title}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mt-1">{t.tag}</p>
                </div>
              </button>
            );
          })}
        </nav>

        <article className="space-y-8">
          <div className="border-b border-border pb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-sm bg-primary/10 text-primary grid place-items-center">
                <Icon className="size-5" />
              </div>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50">{topic.tag}</span>
            </div>
            <h2 className="font-display text-3xl tracking-tight mb-3">{topic.title}</h2>
            <p className="text-foreground/70 leading-relaxed">{topic.summary}</p>
          </div>

          {topic.symptoms.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="size-4 text-destructive" />
                <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60">Clinical Signs</h3>
              </div>
              <ul className="space-y-2">
                {topic.symptoms.map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-foreground/80">
                    <span className="text-destructive mt-1">▪</span> {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="size-4 text-primary" />
              <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60">Prevention</h3>
            </div>
            <ul className="space-y-2">
              {topic.prevention.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-foreground/80">
                  <span className="text-primary mt-1">▪</span> {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="p-5 border border-primary/30 bg-primary/5 rounded-sm">
            <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary mb-2">Recommended Action</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{topic.action}</p>
            <Link
              to="/assistant"
              className="inline-block mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
            >
              Ask the AI Assistant →
            </Link>
          </section>
        </article>
      </div>
    </div>
  );
}
