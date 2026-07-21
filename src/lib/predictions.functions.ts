import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runClinicalEngine, type HealthInput, type ActivityLevel, type IntakeLevel } from "./disease-engine";
import { z } from "zod";

// Allowed DB values for prediction_source. Keep in sync with DB constraint/migrations.
const ALLOWED_PREDICTION_SOURCES = ["rule_engine", "vision_ai", "ml_model"] as const;
type PredictionSource = (typeof ALLOWED_PREDICTION_SOURCES)[number];

function normalizePredictionSource(raw?: string | null): PredictionSource {
  if (!raw) return "rule_engine";
  const r = String(raw).toLowerCase();
  if (r === "vision_ai" || r === "vision" || r === "ai" || r === "lovable") return "vision_ai";
  if (r === "ml_model" || r === "ml" || r === "mlmodel") return "ml_model";
  if (r === "rule_engine" || r === "rule") return "rule_engine";
  // conservative default
  return "rule_engine";
}

const HealthRecordInput = z.object({
  farm_id: z.string().uuid(),
  temperature: z.number().nullable().optional(),
  humidity: z.number().nullable().optional(),
  feed_intake: z.enum(["High", "Medium", "Low"]).nullable().optional(),
  water_consumption: z.enum(["High", "Medium", "Low"]).nullable().optional(),
  activity_level: z.enum(["Active", "Moderate", "Weak"]).nullable().optional(),
  symptoms: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
});

export const submitHealthRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => HealthRecordInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the farm belongs to this user
    const { data: farm, error: farmErr } = await supabase
      .from("farms")
      .select("id, user_id")
      .eq("id", data.farm_id)
      .maybeSingle();
    if (farmErr) throw new Error(farmErr.message);
    if (!farm || farm.user_id !== userId) throw new Error("Farm not found");

    // Insert the record
    const { data: record, error: recErr } = await supabase
      .from("poultry_records")
      .insert({
        farm_id: data.farm_id,
        user_id: userId,
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
        feed_intake: data.feed_intake ?? null,
        water_consumption: data.water_consumption ?? null,
        activity_level: data.activity_level ?? null,
        symptoms: data.symptoms,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (recErr || !record) throw new Error(recErr?.message ?? "Failed to save record");

    // ── PRIMARY BRAIN: try the trained ML model first ──
    // If ML_API_URL is set and the API is reachable, use the user's Random Forest model.
    // Otherwise, fall back to the rule-based clinical engine.
    const input: HealthInput = {
      temperature: data.temperature ?? null,
      humidity: data.humidity ?? null,
      feedIntake: (data.feed_intake ?? null) as IntakeLevel | null,
      waterConsumption: (data.water_consumption ?? null) as IntakeLevel | null,
      activityLevel: (data.activity_level ?? null) as ActivityLevel | null,
      symptoms: data.symptoms,
    };

    let result = runClinicalEngine(input);
    let predictionSource: "ml_model" | "rule_engine" = "rule_engine";

    const mlApiUrl = process.env.ML_API_URL ?? "https://poultry-ml-api.onrender.com";
    if (mlApiUrl) {
      try {
        const mlResp = await fetch(`${mlApiUrl}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            temperature: data.temperature ?? 41,
            humidity: data.humidity ?? 60,
            feed_intake: data.feed_intake ?? "Medium",
            water_consumption: data.water_consumption ?? "Medium",
            activity_level: data.activity_level ?? "Active",
            symptoms: data.symptoms,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (mlResp.ok) {
          const ml = await mlResp.json();
          // Merge ML model output with rule-engine recommendation/factors
          result = {
            ...result,
            prediction: String(ml.prediction ?? result.prediction),
            confidence: Math.round(Number(ml.confidence ?? result.confidence)),
            risk: (ml.risk_level as "Low" | "Medium" | "High") ?? result.risk,
          };
          predictionSource = "ml_model";
        }
      } catch {
        // Silent fall-through to rule engine result already in `result`
      }
    }

    const payload = {
      farm_id: data.farm_id,
      user_id: userId,
      record_id: record.id,
      prediction: result.prediction,
      confidence: result.confidence,
      risk_level: result.risk,
      recommendation: result.recommendation,
      prediction_source: normalizePredictionSource(predictionSource),
      factors: JSON.parse(JSON.stringify(result.factors)),
    } as const;

    const { data: pred, error: predErr } = await supabase
      .from("predictions")
      .insert(payload)
      .select()
      .single();
    if (predErr || !pred) {
      console.error("[predictions] insert failed", { payload, error: predErr });
      throw new Error(predErr?.message ?? "Failed to save prediction");
    }

    return { prediction_id: pred.id, source: predictionSource, ...result };
  });


const ImageAnalysisInput = z.object({
  farm_id: z.string().uuid(),
  image_path: z.string().min(1).max(500),
  image_data_url: z.string().min(1), // base64 data URL for AI
});

export const analyzeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImageAnalysisInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: farm } = await supabase
      .from("farms")
      .select("id, user_id")
      .eq("id", data.farm_id)
      .maybeSingle();
    if (!farm || farm.user_id !== userId) throw new Error("Farm not found");

    const geminiKey = process.env.GEMINI_API_KEY;
    const apiKey = process.env.LOVABLE_API_KEY;

    // We'll attempt Gemini first if GEMINI_API_KEY exists, otherwise fall back to Lovable.
    // If neither is configured, we now proceed with a graceful fallback instead of throwing.
    let content = "{}";
    let aiError: Error | null = null;

    if (!geminiKey && !apiKey) {
      aiError = new Error("AI service unavailable");
      console.warn("[ai] no API keys configured — using fallback prediction");
    } else if (geminiKey) {
      // Call Google Generative Language API using API key
      try {
        const gmBody = {
          messages: [
            { author: "system", content: [{ type: "text", text: systemPrompt }] },
            {
              author: "user",
              content: [
                { type: "text", text: "Analyze this poultry image for Avian Influenza and Newcastle Disease symptoms. Return JSON only." },
                { type: "image", image: { uri: data.image_data_url } },
              ],
            },
          ],
        };

        const gmUrl = `https://generativelanguage.googleapis.com/v1beta2/models/google/gemini-3-flash-preview:generateMessage?key=${encodeURIComponent(geminiKey)}`;
        const resp = await fetch(gmUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gmBody),
        });

        if (resp.status === 401) throw new Error("AI request failed (401)");
        if (resp.status === 429) throw new Error("AI rate limit reached — try again in a moment.");
        if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing settings.");
        if (!resp.ok) throw new Error(`AI request failed (${resp.status})`);

        const json = await resp.json();
        // Try common response paths to extract text content
        content =
          json?.candidates?.[0]?.message?.content?.[0]?.text ||
          json?.output?.[0]?.content?.[0]?.text ||
          json?.candidates?.[0]?.content?.[0]?.text ||
          json?.message?.content?.[0]?.text ||
          JSON.stringify(json);
      } catch (err) {
        aiError = err instanceof Error ? err : new Error(String(err));
        console.error('[ai] Gemini call failed', aiError);
      }
    } else {
      // Lovable gateway fallback (original behavior)
      try {
        const body = {
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this poultry image for Avian Influenza and Newcastle Disease symptoms. Return JSON only." },
                { type: "image_url", image_url: { url: data.image_data_url } },
              ],
            },
          ],
          response_format: { type: "json_object" as const },
        };

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify(body),
        });

        if (resp.status === 429) throw new Error("AI rate limit reached — try again in a moment.");
        if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing settings.");
        if (!resp.ok) throw new Error(`AI request failed (${resp.status})`);

        const json = await resp.json();
        content = json?.choices?.[0]?.message?.content ?? "{}";
      } catch (err) {
        aiError = err instanceof Error ? err : new Error(String(err));
        console.error('[ai] Lovable gateway call failed', aiError);
      }
    }

    type AiResult = {
      prediction?: string;
      confidence?: number;
      risk_level?: string;
      detected_symptoms?: string[];
      recommendation?: string;
      factors?: Array<{ label: string; weight: number; direction: string }>;
    };
    let parsed: AiResult = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    // If AI failed or returned nothing useful, use a safe fallback so the app doesn't crash.
    let prediction = String(parsed.prediction ?? "Inconclusive");
    let confidence = Math.max(0, Math.min(99, Number(parsed.confidence ?? 60)));
    const rawRisk = String(parsed.risk_level ?? "Medium");
    const risk_level: "Low" | "Medium" | "High" =
      rawRisk === "High" || rawRisk === "Medium" || rawRisk === "Low" ? rawRisk : "Medium";
    const detected_symptoms: string[] = Array.isArray(parsed.detected_symptoms) ? parsed.detected_symptoms.slice(0, 12) : [];
    let recommendation = String(parsed.recommendation ?? "Consult a veterinarian for confirmation.");
    let factors = Array.isArray(parsed.factors) ? parsed.factors : [];

    let sourceForInsert: PredictionSource = "vision_ai";
    if (aiError) {
      // Conservative fallback when AI is unavailable or errored.
      prediction = "Inconclusive";
      confidence = 50;
      // risk_level remains Medium
      recommendation = "AI service unavailable — please try again later.";
      factors = [];
      sourceForInsert = "rule_engine";
    } else {
      // If the call succeeded and we were using Gemini, mark as vision_ai
      sourceForInsert = geminiKey ? "vision_ai" : "vision_ai";
    }

    const { data: imageRow, error: imgErr } = await supabase
      .from("uploaded_images")
      .insert({
        farm_id: data.farm_id,
        user_id: userId,
        image_path: data.image_path,
        prediction,
        confidence,
        detected_symptoms,
        recommendation,
      })
      .select()
      .single();
    if (imgErr || !imageRow) throw new Error(imgErr?.message ?? "Failed to save image");

    const payload = {
      farm_id: data.farm_id,
      user_id: userId,
      image_id: imageRow.id,
      prediction,
      confidence,
      risk_level,
      recommendation,
      prediction_source: normalizePredictionSource(sourceForInsert),
      factors: JSON.parse(JSON.stringify(factors)),
    } as const;

    const { data: pred, error: predErr } = await supabase
      .from("predictions")
      .insert(payload)
      .select()
      .single();
    if (predErr || !pred) {
      console.error("[predictions] insert failed", { payload, error: predErr });
      throw new Error(predErr?.message ?? "Failed to save prediction");
    }

    return {
      prediction_id: pred.id,
      image_id: imageRow.id,
      prediction,
      confidence,
      risk: risk_level,
      recommendation,
      detected_symptoms,
      factors,
    };
  });

const VerifyInput = z.object({
  prediction_id: z.string().uuid(),
  is_verified: z.boolean(),
  notes: z.string().max(2000).optional(),
});

export const verifyPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VerifyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("predictions")
      .update({
        is_verified: data.is_verified,
        verified_by: userId,
        verification_notes: data.notes ?? null,
        verified_at: new Date().toISOString(),
      })
      .eq("id", data.prediction_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BulkVerifyInput = z.object({
  prediction_ids: z.array(z.string().uuid()).min(1).max(200),
  is_verified: z.boolean(),
  notes: z.string().max(2000).optional(),
});

export const bulkVerifyPredictions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkVerifyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isVet } = await supabase.rpc("has_role", { _user_id: userId, _role: "veterinarian" });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isVet && !isAdmin) throw new Error("Forbidden: veterinarian role required");
    const { error, count } = await supabase
      .from("predictions")
      .update({
        is_verified: data.is_verified,
        verified_by: userId,
        verification_notes: data.notes ?? null,
        verified_at: new Date().toISOString(),
      }, { count: "exact" })
      .in("id", data.prediction_ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: count ?? data.prediction_ids.length };
  });
