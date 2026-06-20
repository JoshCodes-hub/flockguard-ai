import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MlPredictInput = z.object({
  temperature: z.number(),
  humidity: z.number(),
  feed_intake: z.enum(["High", "Medium", "Low"]).default("Medium"),
  water_consumption: z.enum(["High", "Medium", "Low"]).default("Medium"),
  activity_level: z.enum(["Active", "Moderate", "Weak"]).default("Active"),
  symptoms: z.array(z.string()).default([]),
});

const ML_API_URL = process.env.ML_API_URL ?? "https://poultry-ml-api.onrender.com";

export const predictWithMlModel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MlPredictInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const resp = await fetch(`${ML_API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "Unknown error");
        throw new Error(`ML API error (${resp.status}): ${text}`);
      }

      const result = await resp.json();
      return {
        ok: true as const,
        prediction: String(result.prediction),
        confidence: Number(result.confidence),
        risk_level: String(result.risk_level) as "Low" | "Medium" | "High",
        all_probabilities: result.all_probabilities as Record<string, number>,
        source: "ml_model" as const,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Failed to reach ML API",
        source: "ml_model" as const,
      };
    }
  });

export const getMlApiHealth = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const resp = await fetch(`${ML_API_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      if (!resp.ok) throw new Error("Not OK");
      const json = await resp.json();
      return { ok: true as const, data: json };
    } catch {
      return { ok: false as const };
    }
  });
