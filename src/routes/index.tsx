import { createFileRoute, Link } from "@tanstack/react-router";
import heroChicken from "@/assets/hero-chicken.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PoultryGuard — Smart Poultry Health Monitoring" },
      { name: "description", content: "Detect Avian Influenza and Newcastle Disease early with AI-powered image analysis and a Clinical Decision Support Engine." },
      { property: "og:title", content: "PoultryGuard" },
      { property: "og:description", content: "AI-powered disease detection for sustainable poultry farming." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-display">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <span className="font-extrabold tracking-tighter text-xl uppercase">PoultryGuard<span className="text-primary">AI</span></span>
          <div className="hidden md:flex gap-6 text-sm font-medium text-foreground/60">
            <a href="#platform" className="hover:text-primary transition-colors">Platform</a>
            <a href="#features" className="hover:text-primary transition-colors">Intelligence</a>
            <a href="#about" className="hover:text-primary transition-colors">About</a>
          </div>
        </div>
        <Link to="/auth" className="px-5 py-2 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:bg-primary transition-all rounded-sm">Access Portal</Link>
      </nav>

      <section className="relative px-6 pt-24 pb-32 border-b border-border overflow-hidden" id="platform">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-7 animate-reveal">
            <div className="font-mono text-xs mb-6 flex items-center gap-2">
              <span className="size-2 bg-primary animate-pulse rounded-full"></span>
              SMART POULTRY HEALTH MONITORING
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9] text-balance mb-8">
              Protect your <span className="font-serif italic font-semibold text-primary/80">poultry farm</span> with AI-powered detection.
            </h1>
            <p className="text-lg text-foreground/60 max-w-md leading-relaxed mb-10">
              Detect Avian Influenza and Newcastle Disease early using artificial intelligence, computer vision, and a Clinical Decision Support Engine.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/auth" className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-sm hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20">Get Started</Link>
              <a href="#features" className="px-8 py-4 border border-border font-bold rounded-sm hover:bg-foreground hover:text-background transition-colors">Learn More</a>
            </div>
          </div>
          <div className="col-span-12 md:col-span-5 relative mt-12 md:mt-0 animate-reveal [animation-delay:200ms]">
            <img src={heroChicken} alt="Healthy poultry monitored by AI" width={896} height={1120} className="w-full aspect-[4/5] object-cover rounded-2xl border border-border" />
            <div className="absolute -bottom-8 -left-8 bg-background p-6 border border-border shadow-2xl max-w-xs rounded-sm hidden sm:block">
              <p className="font-mono text-[10px] text-primary mb-2 tracking-widest">SYSTEM_STATUS: ACTIVE</p>
              <p className="text-sm font-medium italic font-serif">"Early detection of Newcastle Disease saved an entire flock in our trial farm."</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-surface" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 animate-reveal">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-4">PLATFORM CAPABILITIES</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter max-w-2xl">Production-grade tools for modern poultry operations.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="bg-background border border-border p-8 animate-reveal" style={{ animationDelay: `${i * 80}ms` }}>
                <p className="font-mono text-[10px] text-foreground/40 mb-6 tracking-widest">{String(i + 1).padStart(2, "0")} / {String(FEATURES.length).padStart(2, "0")}</p>
                <h3 className="text-2xl font-extrabold tracking-tighter mb-3">{f.title}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 animate-reveal">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-4">END-TO-END WORKFLOW</p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter max-w-3xl">From farmer observation to a self-improving model.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {WORKFLOW.map((s, i) => (
              <div key={s.title} className="relative bg-surface border border-border p-6 animate-reveal" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="font-mono text-[10px] text-primary mb-4 tracking-widest">STEP {String(i + 1).padStart(2, "0")}</div>
                <h3 className="text-xl font-extrabold tracking-tighter mb-2">{s.title}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-border bg-surface">
        <div className="max-w-7xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-6 text-center">BUILT WITH</p>
          <div className="flex flex-wrap justify-center gap-3">
            {STACK.map((s) => (
              <span key={s} className="px-4 py-2 border border-border bg-background text-xs font-mono uppercase tracking-widest text-foreground/70">{s}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-border" id="about">
        <div className="max-w-4xl mx-auto text-center animate-reveal">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-6">FOR FARMERS &amp; VETERINARIANS</p>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-6">Built for sustainable livestock farming.</h2>
          <p className="text-lg text-foreground/60 mb-10 max-w-2xl mx-auto">PoultryGuard gives every farmer access to clinical-grade disease detection — without needing a veterinarian on-site.</p>
          <Link to="/auth" className="inline-block px-10 py-4 bg-foreground text-background font-bold rounded-sm hover:bg-primary transition-colors">Create Free Account</Link>
        </div>
      </section>


      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <p className="font-extrabold text-lg uppercase tracking-tighter mb-4">PoultryGuard<span className="text-primary">AI</span></p>
            <p className="text-xs font-mono text-foreground/40">© 2026 POULTRYGUARD AI · SMART LIVESTOCK MONITORING</p>
          </div>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest">
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <a href="#platform">Platform</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { title: "AI Disease Detection", body: "Computer-vision models identify early signs of Avian Influenza and Newcastle Disease from a single bird photo." },
  { title: "Clinical Decision Support", body: "A rule-based engine analyzes vitals, symptoms, and environmental data to surface risk before it spreads." },
  { title: "Farm Health Score", body: "A single 0–100 score per farm summarizes flock health, mortality risk, and active disease alerts." },
  { title: "Image Analysis Module", body: "Upload or capture a bird photo and receive a confidence-scored diagnostic in seconds." },
  { title: "Veterinarian Review Portal", body: "Licensed vets validate AI predictions across all farms, feeding a curated dataset back into the model." },
  { title: "IoT-Ready Architecture", body: "Designed to accept ESP32 temperature, humidity, feed, and water sensors when you're ready." },
];

const WORKFLOW = [
  { title: "Farmer Logs Observation", body: "A farmer records vitals, symptoms, or uploads a bird photo from any device." },
  { title: "AI Generates Prediction", body: "The CDSE and vision model produce a disease prediction with confidence and risk level." },
  { title: "Vet Verifies Diagnosis", body: "Licensed veterinarians review predictions in a dedicated portal and confirm or correct them." },
  { title: "Dataset Trains Next Model", body: "Verified cases are exported as labeled training data for the next-generation ML model." },
];

const STACK = ["React 19", "TanStack Start", "TypeScript", "Tailwind v4", "Lovable Cloud", "Lovable AI Gateway", "Gemini Vision", "Recharts", "PostgreSQL", "Row-Level Security"];

