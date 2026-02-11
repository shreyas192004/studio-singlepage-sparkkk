import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ---------------- Schema (UNCHANGED) ---------------- */
const designRequestSchema = z.object({
  prompt: z.string().trim().min(10).max(500),
  style: z.enum([
    "modern",
    "vintage",
    "minimalist",
    "abstract",
    "retro",
    "graffiti",
    "anime",
    "geometric",
    "organic",
    "grunge",
    "realistic",
  ]),
  colorScheme: z.enum([
    "normal",
    "vibrant",
    "pastel",
    "monochrome",
    "neon",
    "earth-tones",
    "black-white",
    "cool",
    "warm",
    "gradient",
  ]),
  quality: z.enum(["standard", "high", "ultra"]).optional().default("high"),
  creativity: z.number().min(0).max(100).optional().default(70),
  text: z.string().trim().max(120).optional(),
});

/* ---------------- Server ---------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { prompt, style, colorScheme, quality, creativity, text } = designRequestSchema.parse(body);

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) throw new Error("AI API key not configured");

    /* ======================================================
       STEP 1 — CONCEPT ART (FREE CREATIVE GENERATION)
    ====================================================== */

    const conceptPrompt = `
You are a cinematic concept artist.

Create a detailed, expressive illustration based on:
"${prompt}"

Rules:
- Full environment allowed
- Dramatic lighting allowed
- Characters allowed
- Storytelling allowed
- No text, no UI, no logos
`;

    const conceptRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: conceptPrompt }],
        modalities: ["image"],
      }),
    });

    const conceptData = await conceptRes.json();
    const conceptImage = conceptData?.choices?.[0]?.message?.images?.[0]?.url;

    if (!conceptImage) throw new Error("Concept image generation failed");

    /* ======================================================
       STEP 2 — PRINT ISOLATION (THIS IS THE REAL PRINT PROMPT)
    ====================================================== */

    const printPrompt = `
You are a professional apparel graphic designer.

TASK:
Convert the given image into a PRINT-READY T-SHIRT GRAPHIC.

ABSOLUTE RULES:
- REMOVE background completely (transparent if possible)
- NO scenery, NO environment
- NO cinematic lighting
- Subject must be isolated
- Centered composition
- High contrast
- Clean silhouette
- Apparel-print safe
- NOT a poster or illustration

STYLE SETTINGS:
- Art style: ${style}
- Color mood: ${colorScheme}
- Quality: ${quality}
- Creativity: ${creativity}%

TEXT RULES:
${text ? `Include this text cleanly and boldly: "${text}"` : "NO text, NO lettering"}
`;

    const finalRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "input_text", text: printPrompt },
              { type: "input_image", image_url: conceptImage },
            ],
          },
        ],
        modalities: ["image"],
      }),
    });

    const finalData = await finalRes.json();
    const finalImage = finalData?.choices?.[0]?.message?.images?.[0]?.url;

    if (!finalImage) throw new Error("Final print image failed");

    /* ---------------- Response (UNCHANGED) ---------------- */
    return new Response(JSON.stringify({ imageUrl: finalImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
