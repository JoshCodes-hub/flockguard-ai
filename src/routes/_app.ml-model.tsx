import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { predictWithMlModel, getMlApiHealth } from "@/lib/ml-model.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  ArrowLeft,
  Activity,
  Thermometer,
  Droplets,
  Utensils,
  GlassWater,
  AlertTriangle,
  CheckCircle2,
  ServerOff,
  Server,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_app/ml-model")({
  head: () => ({ meta: [{ title: "ML Model Lab — PoultryGuard AI" }] }),
  component: MlModelPage,
});

const ALL_SYMPTOMS = [
  "Twisted Neck",
  "Difficulty Breathing",
  "Coughing",
  "Sneezing",
  "Reduced Egg Production",
  "Reduced Feeding",
  "Nasal Discharge",
  "Swollen Head",
  "Watery Eyes",
  "Lethargy",
  "Diarrhea",
  "Ruffled Feathers",
];

type Result = {
  prediction: string;
  confidence: number;
  risk_level: "Low" | "Medium" | "High";
  all_probabilities: Record<string, number>;
};

function MlModelPage() {
  const predictFn = useServerFn(predictWithMlModel);
  const healthFn = useServerFn(getMlApiHealth);

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [temperature, setTemperature] = useState("42.0");
  const [humidity, setHumidity] = useState("60");
  const [feedIntake, setFeedIntake] = useState<"High" | "Medium" | "Low">("Medium");
  const [waterConsumption, setWaterConsumption] = useState<"High" | "Medium" | "Low">("Medium");
  const [activityLevel, setActivityLevel] = useState<"Active" | "Moderate" | "Weak">("Active");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  useEffect(() => {
    healthFn({ data: undefined }).then((res) => setApiOnline(res.ok));
  }, [healthFn]);

  async function handlePredict() {
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await predictFn({
      data: {
        temperature: parseFloat(temperature) || 41.0,
        humidity: parseFloat(humidity) || 60,
        feed_intake: feedIntake,
        water_consumption: waterConsumption,
        activity_level: activityLevel,
        symptoms: selectedSymptoms,
      },
    });

    setLoading(false);

    if (!res.ok) {
      setError(res.error ?? "ML API unreachable");
      return;
    }

    setResult({
      prediction: res.prediction,
      confidence: res.confidence,
      risk_level: res.risk_level,
      all_probabilities: res.all_probabilities,
    });
  }

  function toggleSymptom(s: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  const riskColor =
    result?.risk_level === "High"
      ? "bg-destructive text-destructive-foreground"
      : result?.risk_level === "Medium"
      ? "bg-warning text-background"
      : "bg-primary text-primary-foreground";

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8 max-w-5xl">
      {/* Header */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/60 hover:text-primary"
      >
        <ArrowLeft className="size-3.5" /> Dashboard
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <Brain className="size-6 text-primary" />
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
            {apiOnline === true ? (
              <span className="flex items-center gap-1 text-primary">
                <Server className="size-3" /> API Online
              </span>
            ) : apiOnline === false ? (
              <span className="flex items-center gap-1 text-destructive">
                <ServerOff className="size-3" /> API Offline
              </span>
            ) : (
              <span className="flex items-center gap-1 text-foreground/50">Checking…</span>
            )}
          </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
          ML Model Lab
        </h1>
        <p className="text-foreground/60 mt-2 max-w-2xl">
          Your trained Random Forest classifier for poultry disease prediction. This page connects to the Python ML API you trained locally.
        </p>
      </div>

      {/* Model Info Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="border border-border p-5 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">Algorithm</p>
          <p className="text-lg font-bold">Random Forest</p>
          <p className="text-xs text-foreground/60">200 estimators, max depth 15</p>
        </div>
        <div className="border border-border p-5 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">Test Accuracy</p>
          <p className="text-lg font-bold text-primary">86.0%</p>
          <p className="text-xs text-foreground/60">5-fold CV mean: 87.1%</p>
        </div>
        <div className="border border-border p-5 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">Training Data</p>
          <p className="text-lg font-bold">5,000 Records</p>
          <p className="text-xs text-foreground/60">Synthetic but realistic poultry health data</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-border p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50 mb-3">Confusion Matrix</p>
          <img
            src="/ml-model/confusion_matrix.png"
            alt="Confusion matrix showing model prediction accuracy across Healthy, Newcastle Disease, and Avian Influenza classes"
            className="w-full h-auto rounded-sm"
          />
        </div>
        <div className="border border-border p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50 mb-3">Feature Importance</p>
          <img
            src="/ml-model/feature_importance.png"
            alt="Feature importance chart showing which symptoms and vitals the model weights most heavily"
            className="w-full h-auto rounded-sm"
          />
        </div>
      </div>

      {/* Prediction Form */}
      <div className="border border-border p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50 mb-1">Live Prediction</p>
            <h2 className="text-2xl font-bold tracking-tight">Test Your Trained Model</h2>
          </div>
          {apiOnline === false && (
            <div className="flex items-center gap-2 text-destructive text-xs font-bold">
              <AlertTriangle className="size-4" />
              <span>ML API not running</span>
            </div>
          )}
        </div>

        {apiOnline === false && (
          <div className="p-4 border border-destructive/30 bg-destructive/5 text-sm space-y-2">
            <p className="font-bold text-destructive flex items-center gap-2">
              <Info className="size-4" /> How to start the ML API
            </p>
            <ol className="list-decimal list-inside space-y-1 text-foreground/80 text-xs">
              <li>Open your command line in the <code className="bg-foreground/10 px-1 rounded">Train_Poultry_Model</code> folder</li>
              <li>Install FastAPI: <code className="bg-foreground/10 px-1 rounded">pip install fastapi uvicorn</code></li>
              <li>Start the API: <code className="bg-foreground/10 px-1 rounded">python api/main.py</code></li>
              <li>The API will run at <code className="bg-foreground/10 px-1 rounded">http://localhost:8000</code></li>
              <li>Come back here and refresh — the badge will turn green</li>
            </ol>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground/60">
              <Thermometer className="size-3.5" /> Temperature (°C)
            </label>
            <Input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="e.g. 42.5"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground/60">
              <Droplets className="size-3.5" /> Humidity (%)
            </label>
            <Input
              type="number"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              placeholder="e.g. 65"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground/60">
              <Utensils className="size-3.5" /> Feed Intake
            </label>
            <select
              value={feedIntake}
              onChange={(e) => setFeedIntake(e.target.value as any)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground/60">
              <GlassWater className="size-3.5" /> Water Consumption
            </label>
            <select
              value={waterConsumption}
              onChange={(e) => setWaterConsumption(e.target.value as any)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground/60">
              <Activity className="size-3.5" /> Activity Level
            </label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as any)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option>Active</option>
              <option>Moderate</option>
              <option>Weak</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">Symptoms (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {ALL_SYMPTOMS.map((s) => {
              const active = selectedSymptoms.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-sm border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground/60 hover:border-foreground/30"
                  }`}
                >
                  {active && <CheckCircle2 className="size-3 inline mr-1" />}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handlePredict}
          disabled={loading || apiOnline === false}
          className="rounded-sm text-xs font-bold uppercase tracking-widest"
        >
          {loading ? "Running Model…" : "Predict with ML Model"}
        </Button>

        {error && (
          <div className="p-4 border border-destructive/40 bg-destructive/5 text-destructive text-sm rounded-sm">
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-foreground text-background p-8 md:p-12 rounded-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-background/10 pb-6">
            <div>
              <p className="font-mono text-[10px] opacity-50 mb-4 tracking-widest uppercase">
                ML RANDOM FOREST PREDICTION
              </p>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none">
                {result.prediction}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-extrabold">
                {result.confidence.toFixed(1)}
                <span className="text-sm opacity-50 uppercase ml-1">% CONF</span>
              </div>
              <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${riskColor}`}>
                {result.risk_level} Risk
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono opacity-50 mb-4 tracking-widest uppercase">
              All Class Probabilities
            </p>
            <div className="space-y-3">
              {Object.entries(result.all_probabilities)
                .sort(([, a], [, b]) => b - a)
                .map(([cls, prob]) => (
                  <div key={cls}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold">{cls}</span>
                      <span className="font-mono opacity-60">{prob.toFixed(1)}%</span>
                    </div>
                    <div className="h-1 bg-background/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, prob)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <p className="mt-6 text-xs font-mono opacity-40">
            Model: RandomForestClassifier (200 trees) · Features: 17 · Trained on 5,000 synthetic records
          </p>
        </div>
      )}

      {/* Architecture Note */}
      <div className="border border-border p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/50 mb-3">
          For Your Final Year Project
        </p>
        <h3 className="text-lg font-bold mb-2">How This Integration Works</h3>
        <p className="text-sm text-foreground/70 leading-relaxed mb-4">
          Your final year project now has a <strong>hybrid AI architecture</strong>: the web app (React + TanStack Start) provides the user interface and stores predictions in the database, while your trained Python ML model runs as a separate microservice. This is exactly how real-world AI systems work — the frontend talks to an API, and the API loads the model.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 text-xs text-foreground/60">
          <div className="p-3 border border-border">
            <p className="font-bold text-foreground mb-1">1. Web App</p>
            <p>React frontend collects symptoms and vitals from the farmer.</p>
          </div>
          <div className="p-3 border border-border">
            <p className="font-bold text-foreground mb-1">2. Server Function</p>
            <p>TanStack server function sends data to the Python API over HTTP.</p>
          </div>
          <div className="p-3 border border-border">
            <p className="font-bold text-foreground mb-1">3. ML API (Python)</p>
            <p>FastAPI loads your .pkl model, scales features, and returns the prediction.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
