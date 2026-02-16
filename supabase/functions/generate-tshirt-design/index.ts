import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Input schema matching frontend exactly (but we ignore product fields for generation)
const schema = z.object({
  prompt: z.string().min(10).max(500),
  style: z.string(),
  colorScheme: z.string(),
  creativity: z.number().min(0).max(100).default(70),

  // Product fields (kept for schema compatibility but ignored for AI generation)
  apparelType: z.string().optional(),
  apparelColor: z.string().optional(),
  designPlacement: z.string().optional(),

  text: z.string().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, style, colorScheme, creativity, text } = schema.parse(body);

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) throw new Error("Missing API key");

    /* ============================================================
       SINGLE-STEP DESIGN GENERATION
       Strictly follows "Master Prompt" rules:
       - Output ONLY the design artwork
       - NO apparel/mockups/scenes
       - Transparent background
       - One clear subject
    ============================================================ */

    const designPrompt = `
You are a professional apparel print designer.

TASK:
Create a PRINT-READY DESIGN ARTWORK.

ABSOLUTE RULES:
- Generate ONLY the design artwork
- NO apparel
- NO mockups
- NO mannequins
- NO scenes
- NO environments
- NO backgrounds
- Transparent background only
- One clear subject
- Centered
- High contrast
- Clean silhouette

THIS IS FOR:
T-shirt / hoodie printing

DESIGN DETAILS:
- Prompt: "${prompt}"
- Style: ${style}
- Color Scheme: ${colorScheme}
- Creativity Level: ${creativity}%

TEXT:
${text ? `Include text ONLY if explicitly provided: "${text}"` : "Do NOT include any text."}

FAIL IF:
- Any background exists
- Multiple subjects exist
- It looks like a poster or scene

OUTPUT FORMAT:
Return only the raw design image.
`;

    console.log("Generating Single-Step Design...", { prompt, style });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Generation Error:", response.status, errorText);
      throw new Error(`AI Generation Failed: ${errorText}`);
    }

    const data = await response.json();
    const imageUrl =
      data?.choices?.[0]?.message?.images?.[0]?.url ||
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data?.choices?.[0]?.message?.image_url;

    if (!imageUrl) {
      console.error("No image URL in response", data);
      throw new Error("Failed to generate design image");
    }

    console.log("Design Generated Successfully:", imageUrl);

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Function Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
