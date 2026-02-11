import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const schema = z.object({
  prompt: z.string().min(10).max(500),
  style: z.string().default("realistic"),
  colorScheme: z.string().default("normal"),
  quality: z.string().default("high"),
  creativity: z.number().min(0).max(100).default(70),
  text: z.string().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = schema.parse(await req.json());

    const { prompt, style, colorScheme, quality, creativity, text } = body;

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) throw new Error("Missing AI API key");

    /* ======================================================
       STEP 1 — CONCEPT ART (CREATIVE, CINEMATIC)
    ====================================================== */

    const conceptPrompt = `
You are a professional concept artist.

Create a highly detailed, cinematic concept illustration based on this idea:
"${prompt}"

STYLE:
- Art style: ${style}
- Color mood: ${colorScheme}
- Quality: ${quality}
- Creativity: ${creativity}%

RULES:
- Full environment and background allowed
- Storytelling and atmosphere encouraged
- This is CONCEPT ART ONLY
- Do NOT worry about printing
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

    if (!conceptRes.ok) {
      throw new Error("Concept generation failed");
    }

    const conceptData = await conceptRes.json();

    const conceptImageUrl =
      conceptData?.choices?.[0]?.message?.images?.[0]?.image_url?.url || conceptData?.images?.[0]?.url;

    if (!conceptImageUrl) {
      throw new Error("No concept image generated");
    }

    /* ======================================================
       STEP 2 — PRINT DESIGN CONVERTER (STRICT)
    ====================================================== */

    const printPrompt = `
You are a professional apparel graphic designer.

TASK:
Convert the provided image into a PRINT-READY T-SHIRT DESIGN.

STRICT RULES (NON-NEGOTIABLE):
- Extract ONLY the main subject
- REMOVE all background, scenery, characters, environment
- Clean edges and sharp silhouette
- Center the subject
- Plain or transparent background
- No poster layout
- No cinematic lighting
- No depth or perspective tricks
- No frames or borders
- No mockups or clothing shown

TEXT RULES:
${
  text
    ? `Include this text clearly and boldly: "${text}"
       - Integrated naturally
       - Readable from distance`
    : "DO NOT include any text or letters"
}

CANVAS:
- Square (1:1)
- Subject occupies 60–70% of canvas
- Suitable for real T-shirt printing

FINAL CHECK:
✔ Isolated
✔ Wearable
✔ Print-safe
✔ Looks like streetwear art
`;

    const printRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: printPrompt,
            images: [{ url: conceptImageUrl }],
          },
        ],
        modalities: ["image"],
      }),
    });

    if (!printRes.ok) {
      throw new Error("Print conversion failed");
    }

    const printData = await printRes.json();

    const finalImageUrl = printData?.choices?.[0]?.message?.images?.[0]?.image_url?.url || printData?.images?.[0]?.url;

    if (!finalImageUrl) {
      throw new Error("No final image generated");
    }

    return new Response(
      JSON.stringify({
        imageUrl: finalImageUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
