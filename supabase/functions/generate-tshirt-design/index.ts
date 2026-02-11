import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Input validation schema - matches all frontend options exactly (updated)
const schema = z.object({
  prompt: z.string().min(10).max(500),
  style: z.string(),
  colorScheme: z.string(),
  creativity: z.number().min(0).max(100).default(70),
  text: z.string().optional(),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { prompt, style, colorScheme, creativity, text } = schema.parse(body);

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) {
      throw new Error("Missing API key");
    }

    /* ==========================================
       STEP 1 — CONCEPT ART (FREE)
       Uses `enhancedPrompt` as requested
    ========================================== */

    const enhancedPrompt = `
You are a cinematic concept artist.

Create a detailed, expressive illustration based on:
"${prompt}"

Style: ${style}
Color Scheme: ${colorScheme}
Creativity: ${creativity}%

Rules:
- Full environment allowed
- Dramatic lighting allowed
- Characters allowed
- Storytelling allowed
- No UI, no text overlays
`;

    console.log("STEP 1: Generating Concept Art...");
    console.log("Prompt:", enhancedPrompt);

    const step1Response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image"],
      }),
    });

    if (!step1Response.ok) {
      const errorText = await step1Response.text();
      console.error("Step 1 AI Error:", step1Response.status, errorText);
      throw new Error(`Step 1 Generation Failed: ${errorText}`);
    }

    const step1Data = await step1Response.json();

    // Extract: const conceptImageUrl
    const conceptImageUrl =
      step1Data?.choices?.[0]?.message?.images?.[0]?.url ||
      step1Data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      step1Data?.choices?.[0]?.message?.image_url;

    if (!conceptImageUrl) {
      console.error("No image URL in Step 1 response", step1Data);
      throw new Error("Step 1 failed to generate an image.");
    }

    console.log("STEP 1 SUCCESS. Concept URL:", conceptImageUrl);

    /* ==========================================
       STEP 2 — PRINT ISOLATION (IMAGE → IMAGE)
       Uses `printPrompt` + `conceptImageUrl`
    ========================================== */

    const printPrompt = `
You are a professional apparel graphic designer.

TASK:
Convert the given image into a PRINT-READY T-SHIRT GRAPHIC.

ABSOLUTE RULES:
- REMOVE background completely
- NO scenery, NO environment
- NO cinematic lighting
- Subject must be isolated
- Centered composition
- High contrast
- Clean silhouette
- Apparel-print safe

STYLE:
- ${style}
- Color mood: ${colorScheme}
- Creativity: ${creativity}%

TEXT RULES:
${text ? `Include this text cleanly: "${text}"` : "NO text allowed"}
`;

    console.log("STEP 2: Converting to Print...");
    console.log("Prompt:", printPrompt);

    const step2Response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "input_image", image_url: conceptImageUrl },
            ],
          },
        ],
        modalities: ["image"],
      }),
    });

    if (!step2Response.ok) {
      const errorText = await step2Response.text();
      console.error("Step 2 AI Error:", step2Response.status, errorText);
      throw new Error(`Step 2 Generation Failed: ${errorText}`);
    }

    const step2Data = await step2Response.json();

    // Extract: const finalImageUrl
    const finalImageUrl =
      step2Data?.choices?.[0]?.message?.images?.[0]?.url ||
      step2Data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      step2Data?.choices?.[0]?.message?.image_url;

    if (!finalImageUrl) {
      console.error("No image URL in Step 2 response", step2Data);
      throw new Error("Step 2 failed to generate an image.");
    }

    console.log("STEP 2 SUCCESS. Final URL:", finalImageUrl);

    // ==========================================
    // FINAL RESPONSE
    // Return ONLY finalImageUrl
    // ==========================================
    return new Response(JSON.stringify({ imageUrl: finalImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
