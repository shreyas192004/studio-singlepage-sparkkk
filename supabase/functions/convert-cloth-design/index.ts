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
  frontImageUrl: z.string().url(),
  backImageUrl: z.string().url().optional().nullable(),
  instruction: z.string().min(10),
  targetClothingType: z.enum([
    "t-shirt",
    "polo",
    "hoodie",
    "tops",
    "sweatshirt",
  ]),
});

/* -------------------- SERVER -------------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: parsed.error.flatten(),
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    const {
      frontImageUrl,
      backImageUrl,
      instruction,
      targetClothingType,
    } = parsed.data;

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    /* -------------------- SYSTEM PROMPT -------------------- */
    const systemPrompt = `
You are a PROFESSIONAL apparel mockup generation AI.

STRICT, NON-NEGOTIABLE RULES:
- Generate ONE SINGLE IMAGE only
- The image must contain TWO views of the SAME garment:
  - LEFT SIDE: Front view
  - RIGHT SIDE: Back view
- Both views must:
  - Be same size and scale
  - Have identical color, fabric texture, and material
  - Use identical lighting and camera distance
- Neutral studio background (light gray or white)
- Product catalog / ecommerce mockup style

REFERENCE IMAGE RULES:
- The provided image(s) are the ONLY source of truth
- Preserve EXACTLY:
  - base color
  - fabric texture
  - fabric grain
  - print quality
  - design placement
  - proportions
- DO NOT recolor, redesign, stylize, enhance, or reinterpret
- DO NOT add logos, text, shadows, folds, watermarks, or effects

FRONT / BACK LOGIC:
- Front mockup MUST visually match the provided front image EXACTLY
- If back image is provided:
  - Back mockup MUST match the provided back image EXACTLY
- If back image is NOT provided:
  - Back mockup must be PLAIN
  - Same base color and fabric texture
  - No design elements

OUTPUT REQUIREMENTS:
- ONE composite image
- Front view on LEFT, back view on RIGHT
- High-resolution, realistic apparel mockup
- Looks like a professional product listing image
`;

    /* -------------------- USER PROMPT -------------------- */
    const userPrompt = `
Create a realistic ${targetClothingType} studio mockup using the provided reference image(s).

CRITICAL:
- Output must be ONE single image
- Left = front view
- Right = back view
- Match the reference images exactly
- No creative freedom allowed

Additional instructions from user:
${instruction}
`;

    /* -------------------- MESSAGE PAYLOAD -------------------- */
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: { url: frontImageUrl },
          },
          ...(backImageUrl
            ? [
                {
                  type: "image_url",
                  image_url: { url: backImageUrl },
                },
              ]
            : []),
        ],
      },
    ];

    /* -------------------- AI CALL -------------------- */
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages,
          modalities: ["image", "text"],
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI error: ${errText}`);
    }

    const data = await response.json();

    /* -------------------- IMAGE EXTRACTION -------------------- */
    const imageUrl =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data?.choices?.[0]?.message?.images?.[0]?.url ||
      data?.output?.[0]?.url ||
      data?.images?.[0]?.url ||
      data?.image_url ||
      null;

    if (!imageUrl) {
      throw new Error("No image generated by AI");
    }

    /* -------------------- RESPONSE -------------------- */
    return new Response(
      JSON.stringify({
        imageUrl, // SINGLE IMAGE (front + back)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown server error",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
