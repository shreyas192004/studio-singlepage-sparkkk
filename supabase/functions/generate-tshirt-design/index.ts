import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const schema = z.object({
  prompt: z.string().min(10).max(500),
  style: z.string(),
  colorScheme: z.string(),
  creativity: z.number().min(0).max(100).default(70),

  // product controls
  apparelType: z.enum(["t-shirt", "hoodie", "sweatshirt", "polo", "tops"]),
  apparelColor: z.string(),
  designPlacement: z.enum(["front", "back"]),

  text: z.string().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, style, colorScheme, creativity, apparelType, apparelColor, designPlacement, text } =
      schema.parse(body);

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) throw new Error("Missing API key");

    /* ============================
       STEP 1 — DESIGN GENERATION
    ============================ */

    const designPrompt = `
You are a professional illustration artist.

Create a high-quality DESIGN ARTWORK based on:
"${prompt}"

STYLE:
- Art style: ${style}
- Color mood: ${colorScheme}
- Creativity: ${creativity}%

RULES:
- Full illustration allowed
- No text unless specified
- No mockups
- No apparel
- No UI
`;

    const step1Res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: designPrompt }],
        modalities: ["image"],
      }),
    });

    const step1Data = await step1Res.json();
    const designImageUrl = step1Data?.choices?.[0]?.message?.images?.[0]?.url;

    if (!designImageUrl) {
      throw new Error("Step 1 failed to generate design");
    }

    /* ============================
       STEP 2 — PRODUCT PREPARATION
    ============================ */

    const productPrompt = `
You are a PRINT DESIGN PREPARATION ENGINE.

TASK:
Prepare the provided artwork for printing on apparel.

PRODUCT SETTINGS:
- Apparel type: ${apparelType}
- Apparel color: ${apparelColor}
- Design placement: ${designPlacement}

RULES (MANDATORY):
- DO NOT create a mockup
- DO NOT show clothing
- DO NOT add backgrounds
- Keep artwork print-ready
- Center and scale artwork correctly for placement
- Ensure good contrast for "${apparelColor}" fabric
- Clean edges, no noise

PLACEMENT LOGIC:
- Front: center chest placement
- Back: upper back placement

TEXT:
${text ? `Include text cleanly: "${text}"` : "No text"}

OUTPUT:
- Single print-ready design image
- Transparent or plain background
`;

    const step2Res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "input_text", text: productPrompt },
              { type: "input_image", image_url: designImageUrl },
            ],
          },
        ],
        modalities: ["image"],
      }),
    });

    const step2Data = await step2Res.json();
    const finalImageUrl = step2Data?.choices?.[0]?.message?.images?.[0]?.url;

    if (!finalImageUrl) {
      throw new Error("Step 2 failed to prepare design");
    }

    return new Response(JSON.stringify({ imageUrl: finalImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
