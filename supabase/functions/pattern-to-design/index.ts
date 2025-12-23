import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/* -------------------- CORS -------------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* -------------------- INPUT SCHEMA -------------------- */
const requestSchema = z.object({
  referenceImageUrl: z.string().url(),

  // This is NOT an instruction — it is the user's design intent
  designRequest: z
    .string()
    .trim()
    .min(10, "Design request must be at least 10 characters")
    .max(800),

  clothingType: z
    .enum(["t-shirt", "polo", "hoodie", "tops", "sweatshirt"])
    .optional()
    .default("t-shirt"),

  imagePosition: z.enum(["front", "back"]).optional().default("front"),
});

/* -------------------- SERVER -------------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    console.log("Incoming request:", body);

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: parsed.error.errors,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { referenceImageUrl, designRequest } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    /* -------------------- MASTER PROMPT -------------------- */
    const finalPrompt = `
You are a professional fashion and graphic design AI.

STEP 1 — VISUAL ANALYSIS:
Analyze the provided reference image and internally extract:
- Dominant and secondary colors
- Color harmony / scheme
- Texture and material feel
- Pattern structure
- Visual style and aesthetic
- Mood and theme

STEP 2 — DESIGN CREATION:
Using ONLY the extracted visual attributes,
create a NEW and ORIGINAL design based on the following design request:

DESIGN REQUEST:
"${designRequest}"

STRICT RULES:
- Preserve the image's color palette, texture feel, and style DNA
- Do NOT replicate the image literally
- Reinterpret creatively but consistently
- The design must feel like it belongs to the same visual family

OUTPUT REQUIREMENTS:
- Output ONLY the artwork/design (no clothing, no mockups)
- Transparent or isolated background preferred
- High-resolution, print-ready quality
- Centered, balanced composition
- No watermarks, no logos unless explicitly requested
- Suitable for apparel printing (screen print / DTG friendly)

REFERENCE IMAGE:
${referenceImageUrl}
`;

    console.log("Final AI Prompt:", finalPrompt);

    /* -------------------- AI CALL -------------------- */
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: finalPrompt }],
          modalities: ["image", "text"],
        }),
      },
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", errText);
      return new Response(
        JSON.stringify({ error: "AI generation failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResponse.json();

    const imageUrl =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data?.choices?.[0]?.message?.images?.[0]?.url ||
      data?.data?.[0]?.url ||
      data?.image_url ||
      null;

    if (!imageUrl) {
      throw new Error("No image returned from AI");
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        sourceImage: referenceImageUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
