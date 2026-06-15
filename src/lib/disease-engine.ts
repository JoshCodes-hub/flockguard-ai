// Clinical Decision Support Engine — pure rule-based health risk scoring.
// Designed so the rule engine can later be swapped for a trained ML model
// without changing the calling code. Output shape is stable.

export type ActivityLevel = "Active" | "Moderate" | "Weak";
export type IntakeLevel = "High" | "Medium" | "Low";

export type HealthInput = {
  temperature?: number | null; // °C
  humidity?: number | null; // %
  feedIntake?: IntakeLevel | null;
  waterConsumption?: IntakeLevel | null;
  activityLevel?: ActivityLevel | null;
  symptoms: string[];
};

export type Factor = {
  label: string;
  weight: number; // 0..1 contribution to the score
  direction: "newcastle" | "avian" | "stress" | "healthy";
  detail?: string;
};

export type DiseaseResult = {
  prediction: string;
  confidence: number; // 0..100
  risk: "Low" | "Medium" | "High";
  recommendation: string;
  factors: Factor[];
  scores: { newcastle: number; avian: number; healthy: number };
};

// Weighted symptom mapping. Tune-able and replaceable.
const NEWCASTLE_SYMPTOMS: Record<string, number> = {
  "Twisted Neck": 0.35,
  "Difficulty Breathing": 0.18,
  "Coughing": 0.12,
  "Sneezing": 0.1,
  "Reduced Egg Production": 0.15,
  "Reduced Feeding": 0.08,
  "Nasal Discharge": 0.1,
};

const AVIAN_SYMPTOMS: Record<string, number> = {
  "Swollen Head": 0.3,
  "Difficulty Breathing": 0.2,
  "Coughing": 0.12,
  "Sneezing": 0.1,
  "Nasal Discharge": 0.14,
  "Reduced Feeding": 0.08,
  "Reduced Egg Production": 0.1,
};

export function runClinicalEngine(input: HealthInput): DiseaseResult {
  const factors: Factor[] = [];
  let newcastle = 0;
  let avian = 0;

  for (const s of input.symptoms) {
    const n = NEWCASTLE_SYMPTOMS[s];
    const a = AVIAN_SYMPTOMS[s];
    if (n) {
      newcastle += n;
      factors.push({ label: s, weight: n, direction: "newcastle", detail: "Symptom associated with Newcastle Disease" });
    }
    if (a) {
      avian += a;
      factors.push({ label: s, weight: a, direction: "avian", detail: "Symptom associated with Avian Influenza" });
    }
  }

  // Vitals contribute as stress signal split across both diseases
  if (input.temperature != null) {
    if (input.temperature > 42) {
      const w = 0.15;
      newcastle += w * 0.5;
      avian += w * 0.5;
      factors.push({ label: `High body temperature (${input.temperature}°C)`, weight: w, direction: "stress", detail: "Above normal poultry range (40.6–41.7°C)" });
    } else if (input.temperature < 40) {
      const w = 0.08;
      newcastle += w * 0.5;
      avian += w * 0.5;
      factors.push({ label: `Low body temperature (${input.temperature}°C)`, weight: w, direction: "stress", detail: "Below normal poultry range" });
    }
  }

  if (input.humidity != null && (input.humidity > 80 || input.humidity < 40)) {
    factors.push({ label: `Humidity ${input.humidity}% out of optimal range`, weight: 0.05, direction: "stress", detail: "Optimal humidity is 50–70%" });
    newcastle += 0.025;
    avian += 0.025;
  }

  if (input.activityLevel === "Weak") {
    factors.push({ label: "Weak activity level", weight: 0.12, direction: "stress" });
    newcastle += 0.07;
    avian += 0.07;
  }

  if (input.feedIntake === "Low") {
    factors.push({ label: "Low feed intake", weight: 0.08, direction: "stress" });
    newcastle += 0.04;
    avian += 0.04;
  }

  if (input.waterConsumption === "Low") {
    factors.push({ label: "Low water consumption", weight: 0.08, direction: "stress" });
    newcastle += 0.04;
    avian += 0.04;
  }

  const healthy = Math.max(0, 1 - Math.max(newcastle, avian));

  newcastle = Math.min(1, newcastle);
  avian = Math.min(1, avian);

  if (factors.length === 0) {
    factors.push({ label: "No clinical risk indicators detected", weight: 1, direction: "healthy", detail: "All recorded vitals and symptoms are within normal range." });
  }

  let prediction: string;
  let confidence: number;
  let risk: "Low" | "Medium" | "High";
  let recommendation: string;

  if (newcastle < 0.15 && avian < 0.15) {
    prediction = "Healthy";
    confidence = Math.round((healthy * 100));
    risk = "Low";
    recommendation = "Continue routine biosecurity, vaccination schedule, and daily health checks. Maintain optimal environmental conditions.";
  } else if (newcastle >= avian) {
    prediction = "Newcastle Disease";
    confidence = Math.round(newcastle * 100);
    risk = newcastle > 0.6 ? "High" : newcastle > 0.3 ? "Medium" : "Low";
    recommendation = risk === "High"
      ? "Isolate affected birds immediately. Contact a veterinarian and the local animal-health authority. Initiate emergency biosecurity protocol and review the LaSota or I-2 vaccination schedule."
      : "Increase monitoring frequency, separate symptomatic birds, and verify the Newcastle vaccination schedule. Sanitize equipment and water lines.";
  } else {
    prediction = "Avian Influenza";
    confidence = Math.round(avian * 100);
    risk = avian > 0.6 ? "High" : avian > 0.3 ? "Medium" : "Low";
    recommendation = risk === "High"
      ? "Treat as a notifiable disease event. Quarantine immediately, restrict farm access, and contact veterinary authorities for testing (PCR / HI). Halt movement of birds, eggs, and equipment off-site."
      : "Increase surveillance, restrict visitor access, sanitize entry points, and watch for swollen head, nasal discharge, and respiratory distress.";
  }

  // Sort factors by weight desc, dedupe by label
  const seen = new Set<string>();
  const deduped = factors.filter((f) => {
    if (seen.has(f.label)) return false;
    seen.add(f.label);
    return true;
  }).sort((a, b) => b.weight - a.weight);

  return {
    prediction,
    confidence: Math.min(99, Math.max(50, confidence)),
    risk,
    recommendation,
    factors: deduped,
    scores: {
      newcastle: Math.round(newcastle * 100),
      avian: Math.round(avian * 100),
      healthy: Math.round(healthy * 100),
    },
  };
}

// Farm Health Score: 0–100, higher = healthier.
// Aggregates recent predictions + active alerts.
export function computeFarmHealthScore(predictions: Array<{ prediction: string; confidence: number; risk_level: string; created_at: string }>): number {
  if (predictions.length === 0) return 100;
  const recent = predictions.slice(0, 20);
  let penalty = 0;
  for (const p of recent) {
    if (p.prediction === "Healthy") continue;
    const riskWeight = p.risk_level === "High" ? 1 : p.risk_level === "Medium" ? 0.55 : 0.25;
    penalty += (Number(p.confidence) / 100) * riskWeight * (60 / recent.length);
  }
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
