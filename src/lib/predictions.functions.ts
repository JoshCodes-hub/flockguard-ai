import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runClinicalEngine, type HealthInput, type ActivityLevel, type IntakeLevel } from "./disease-engine";
import { z } from "zod";

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

    // Run Clinical Decision Support Engine
    const input: HealthInput = {
      temperature: data.temperature ?? null,
      humidity: data.humidity ?? null,
      feedIntake: (data.feed_intake ?? null) as IntakeLevel | null,
      waterConsumption: (data.water_consumption ?? null) as IntakeLevel | null,
      activityLevel: (data.activity_level ?? null) as ActivityLevel | null,
      symptoms: data.symptoms,
    };
    const result = runClinicalEngine(input);

    const { data: pred, error: predErr } = await supabase
      .from("predictions")
      .insert({
        farm_id: data.farm_id,
        user_id: userId,
        record_id: record.id,
        prediction: result.prediction,
        confidence: result.confidence,
        risk_level: result.risk,
        recommendation: result.recommendation,
        prediction_source: "rule_engine",
        factors: JSON.parse(JSON.stringify(result.factors)),
      })
      .select()
      .single();
    if (predErr || !pred) throw new Error(predErr?.message ?? "Failed to save prediction");

    return { prediction_id: pred.id, ...result };
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

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable");

    const systemPrompt = `You are a veterinary poultry diagnostic assistant. Examine the poultry image and assess visible signs of Avian Influenza or Newcastle Disease.

You MUST respond with a single JSON object only (no markdown, no commentary) with this exact shape:
{
  "prediction": "Healthy" | "Newcastle Disease" | "Avian Influenza" | "Inconclusive",
  "confidence": <integer 50-99>,
  "risk_level": "Low" | "Medium" | "High",
  "detected_symptoms": [<short strings>],
  "recommendation": <one paragraph veterinary recommendation>,
  "factors": [{"label": <short reason>, "weight": <0-1>, "direction": "newcastle"|"avian"|"healthy"|"stress"}]
}`;

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
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";

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

    const prediction = String(parsed.prediction ?? "Inconclusive");
    const confidence = Math.max(0, Math.min(99, Number(parsed.confidence ?? 60)));
    const rawRisk = String(parsed.risk_level ?? "Medium");
    const risk_level: "Low" | "Medium" | "High" =
      rawRisk === "High" || rawRisk === "Medium" || rawRisk === "Low" ? rawRisk : "Medium";
    const detected_symptoms: string[] = Array.isArray(parsed.detected_symptoms) ? parsed.detected_symptoms.slice(0, 12) : [];
    const recommendation = String(parsed.recommendation ?? "Consult a veterinarian for confirmation.");
    const factors = Array.isArray(parsed.factors) ? parsed.factors : [];

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

    const { data: pred, error: predErr } = await supabase
      .from("predictions")
      .insert({
        farm_id: data.farm_id,
        user_id: userId,
        image_id: imageRow.id,
        prediction,
        confidence,
        risk_level,
        recommendation,
        prediction_source: "vision_ai",
        factors: JSON.parse(JSON.stringify(factors)),
      })
      .select()
      .single();
    if (predErr || !pred) throw new Error(predErr?.message ?? "Failed to save prediction");

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
