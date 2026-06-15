import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DEMO_EMAILS = {
  farmer: "demo-farmer@poultryguard.ai",
  admin: "demo-admin@poultryguard.ai",
  vet: "demo-vet@poultryguard.ai",
} as const;

const DEMO_PASSWORD = "DemoPass2026!";

const SeedInput = z.object({ secret: z.string().min(8).max(256) });

function assertAllowed(secret: string) {
  const expected = process.env.DEMO_SEED_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding is disabled in production.");
  }
  if (!expected) throw new Error("DEMO_SEED_SECRET is not configured.");
  if (secret !== expected) throw new Error("Invalid demo secret.");
}

export const seedDemoData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SeedInput.parse(d))
  .handler(async ({ data }) => {
    assertAllowed(data.secret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    type Summary = {
      users: Record<string, { id: string; email: string; created: boolean }>;
      farm_id: string;
      records_created: number;
      predictions_created: number;
      images_created: number;
      credentials: { email: string; password: string; role: string }[];
    };

    // Helper: get or create a user with confirmed email
    async function ensureUser(email: string, fullName: string, role: "farmer" | "admin" | "veterinarian") {
      // Try find existing user
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) throw new Error(`listUsers: ${listErr.message}`);
      const existing = list.users.find((u) => u.email === email);
      let userId: string;
      let created = false;
      if (existing) {
        userId = existing.id;
      } else {
        const { data: createRes, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: fullName, farm_name: "Sunrise Demo Farm" },
        });
        if (createErr || !createRes.user) throw new Error(`createUser ${email}: ${createErr?.message}`);
        userId = createRes.user.id;
        created = true;
      }
      // Ensure role row exists (handle_new_user trigger sets farmer by default)
      if (role !== "farmer") {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
      }
      return { id: userId, email, created };
    }

    const farmerUser = await ensureUser(DEMO_EMAILS.farmer, "Demo Farmer", "farmer");
    const adminUser = await ensureUser(DEMO_EMAILS.admin, "Demo Admin", "admin");
    const vetUser = await ensureUser(DEMO_EMAILS.vet, "Demo Veterinarian", "veterinarian");

    // Find or create farm
    let farmId: string;
    const { data: existingFarms } = await supabaseAdmin
      .from("farms")
      .select("id")
      .eq("user_id", farmerUser.id)
      .eq("farm_name", "Sunrise Demo Farm")
      .limit(1);
    if (existingFarms && existingFarms.length > 0) {
      farmId = existingFarms[0].id;
    } else {
      const { data: farm, error: farmErr } = await supabaseAdmin
        .from("farms")
        .insert({
          user_id: farmerUser.id,
          farm_name: "Sunrise Demo Farm",
          location: "Kiambu, Kenya",
          bird_type: "Layer (Rhode Island Red)",
          bird_count: 1500,
        })
        .select("id")
        .single();
      if (farmErr || !farm) throw new Error(`farm insert: ${farmErr?.message}`);
      farmId = farm.id;
    }

    // Skip seeding more sample data if already present
    const { count: existingRecCount } = await supabaseAdmin
      .from("poultry_records")
      .select("id", { count: "exact", head: true })
      .eq("farm_id", farmId);
    const { count: existingPredCount } = await supabaseAdmin
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("farm_id", farmId);
    const { count: existingImgCount } = await supabaseAdmin
      .from("uploaded_images")
      .select("id", { count: "exact", head: true })
      .eq("farm_id", farmId);

    let recordsCreated = 0;
    let predictionsCreated = 0;
    let imagesCreated = 0;

    const SAMPLE_SYMPTOMS = [
      ["Lethargy", "Reduced feed intake"],
      ["Coughing", "Sneezing", "Nasal discharge"],
      ["Greenish diarrhea", "Drop in egg production"],
      ["Swollen wattles", "Purple comb"],
      ["Ruffled feathers"],
      [],
      ["Twisted neck", "Tremors"],
      ["Gasping", "Respiratory distress"],
      [],
      ["Watery eyes", "Lethargy"],
    ];
    const PREDICTIONS = [
      { p: "Healthy", c: 92, r: "Low" },
      { p: "Newcastle Disease", c: 78, r: "High" },
      { p: "Newcastle Disease", c: 65, r: "Medium" },
      { p: "Avian Influenza", c: 81, r: "High" },
      { p: "Healthy", c: 88, r: "Low" },
      { p: "Healthy", c: 95, r: "Low" },
      { p: "Newcastle Disease", c: 72, r: "High" },
      { p: "Avian Influenza", c: 69, r: "Medium" },
      { p: "Healthy", c: 90, r: "Low" },
      { p: "Inconclusive", c: 55, r: "Medium" },
    ];

    if ((existingRecCount ?? 0) < 10) {
      const recordRows = SAMPLE_SYMPTOMS.map((symptoms, i) => ({
        farm_id: farmId,
        user_id: farmerUser.id,
        temperature: 39 + Math.random() * 3,
        humidity: 55 + Math.random() * 20,
        feed_intake: i % 3 === 0 ? "Low" : i % 3 === 1 ? "Medium" : "High",
        water_consumption: i % 2 === 0 ? "Medium" : "High",
        activity_level: PREDICTIONS[i].p === "Healthy" ? "Active" : PREDICTIONS[i].r === "High" ? "Weak" : "Moderate",
        symptoms,
        notes: `Daily check #${i + 1}`,
        created_at: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
      }));
      const { data: insertedRecs, error: recErr } = await supabaseAdmin
        .from("poultry_records")
        .insert(recordRows)
        .select("id");
      if (recErr) throw new Error(`records: ${recErr.message}`);
      recordsCreated = insertedRecs?.length ?? 0;

      // Pair each record with a prediction
      const predRows = (insertedRecs ?? []).map((rec, i) => ({
        farm_id: farmId,
        user_id: farmerUser.id,
        record_id: rec.id,
        prediction: PREDICTIONS[i].p,
        confidence: PREDICTIONS[i].c,
        risk_level: PREDICTIONS[i].r,
        recommendation:
          PREDICTIONS[i].r === "High"
            ? "Isolate affected birds, contact veterinarian, and review biosecurity immediately."
            : PREDICTIONS[i].r === "Medium"
              ? "Monitor closely for 48 hours. Improve ventilation and check water quality."
              : "Continue routine monitoring. Flock condition is good.",
        prediction_source: "rule_engine",
        factors: [{ label: "Symptom pattern", weight: 0.6, direction: "newcastle" }],
        created_at: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
      }));
      const { data: insertedPreds, error: predErr } = await supabaseAdmin
        .from("predictions")
        .insert(predRows)
        .select("id");
      if (predErr) throw new Error(`predictions: ${predErr.message}`);
      predictionsCreated = insertedPreds?.length ?? 0;
    }

    if ((existingImgCount ?? 0) < 5) {
      const imgRows = Array.from({ length: 5 }).map((_, i) => ({
        farm_id: farmId,
        user_id: farmerUser.id,
        image_path: `${farmerUser.id}/demo/sample-${i + 1}.jpg`,
        prediction: i === 0 ? "Healthy" : i === 1 ? "Avian Influenza" : i === 2 ? "Newcastle Disease" : "Healthy",
        confidence: 70 + Math.floor(Math.random() * 25),
        detected_symptoms: i === 1 ? ["Swollen head", "Cyanotic comb"] : i === 2 ? ["Twisted neck"] : [],
        recommendation: i <= 2 ? "Sample demo image — see image analysis." : "Image looks healthy.",
        created_at: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
      }));
      const { data: insertedImgs, error: imgErr } = await supabaseAdmin
        .from("uploaded_images")
        .insert(imgRows)
        .select("id, prediction, confidence");
      if (imgErr) throw new Error(`images: ${imgErr.message}`);
      imagesCreated = insertedImgs?.length ?? 0;

      // Predictions from images
      const visionPredRows = (insertedImgs ?? []).map((img) => ({
        farm_id: farmId,
        user_id: farmerUser.id,
        image_id: img.id,
        prediction: img.prediction ?? "Inconclusive",
        confidence: img.confidence ?? 70,
        risk_level: img.prediction === "Healthy" ? "Low" : img.prediction === "Avian Influenza" ? "High" : "Medium",
        recommendation: "Vision AI analysis — verify with a licensed vet.",
        prediction_source: "vision_ai",
        factors: [{ label: "Visual symptom detection", weight: 0.7, direction: "newcastle" }],
        is_verified: Math.random() > 0.6,
        verified_by: Math.random() > 0.6 ? vetUser.id : null,
      }));
      const { error: vpErr } = await supabaseAdmin.from("predictions").insert(visionPredRows);
      if (vpErr) throw new Error(`vision predictions: ${vpErr.message}`);
      predictionsCreated += visionPredRows.length;
    }

    const summary: Summary = {
      users: { farmer: farmerUser, admin: adminUser, vet: vetUser },
      farm_id: farmId,
      records_created: recordsCreated,
      predictions_created: predictionsCreated,
      images_created: imagesCreated,
      credentials: [
        { email: DEMO_EMAILS.farmer, password: DEMO_PASSWORD, role: "farmer" },
        { email: DEMO_EMAILS.admin, password: DEMO_PASSWORD, role: "admin" },
        { email: DEMO_EMAILS.vet, password: DEMO_PASSWORD, role: "veterinarian" },
      ],
    };
    return summary;
  });

export const clearDemoData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SeedInput.parse(d))
  .handler(async ({ data }) => {
    assertAllowed(data.secret);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const demoEmails: string[] = Object.values(DEMO_EMAILS);
    const demoUsers = (list?.users ?? []).filter((u) =>
      demoEmails.includes(u.email ?? ""),
    );

    let deletedUsers = 0;
    for (const u of demoUsers) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (!error) deletedUsers++;
    }
    // Cascade via FK should clear profiles, farms, records, predictions, images
    return { deleted_users: deletedUsers, emails: demoUsers.map((u) => u.email) };
  });
