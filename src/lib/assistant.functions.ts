import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

const SYSTEM_PROMPT = `You are PoultryGuard AI Farm Assistant — a veterinary and poultry husbandry advisor for small and commercial poultry farmers.

You specialize in:
- Avian Influenza (H5N1, H5N8) detection, prevention and biosecurity
- Newcastle Disease symptoms, vaccination schedules, outbreak control
- General flock management: nutrition, ventilation, water quality, brooding
- Reading clinical signs from farmer descriptions

Guidelines:
- Be concise, practical, and friendly. Use plain language farmers understand.
- For suspected outbreaks always recommend isolating sick birds and contacting a licensed veterinarian or local animal health authority.
- Never diagnose with certainty from text alone — offer differential possibilities with likelihood.
- If asked something outside poultry health/management, politely redirect.
- Format responses in short paragraphs or bullet lists. No markdown headers.`;

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      }),
    });

    if (resp.status === 429) throw new Error("Rate limit reached — try again shortly.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
    if (!resp.ok) throw new Error(`AI request failed (${resp.status})`);

    const json = await resp.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "I couldn't generate a response.";
    return { reply };
  });
