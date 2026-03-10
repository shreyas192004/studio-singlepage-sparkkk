import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/* -------------------- CORS -------------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* -------------------- INPUT SCHEMA -------------------- */
const requestSchema = z.object({
  frontImageUrl: z.string().url().optional().nullable(),
  backImageUrl: z.string().url().optional().nullable(),
  instruction: z.string().min(1),
  targetClothingType: z.string().min(1),
  designSide: z.string().optional().nullable(),
});

/* -------------------- SERVER -------------------- */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // STEP 1: ADD FULL REQUEST LOGGING
    let body;
    try {
      body = await req.json();
      console.log("DEBUG: REQUEST BODY:", JSON.stringify(body, null, 2));
    } catch (e) {
      console.error("DEBUG: Failed to parse request body:", e);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // STEP 2: VALIDATE REQUIRED FIELDS
    const { frontImageUrl, backImageUrl, instruction, targetClothingType, designSide } = body;

    // Manual check for descriptive errors
    if (!frontImageUrl && !backImageUrl) {
      return new Response(JSON.stringify({ error: "Missing required field: Either frontImageUrl or backImageUrl must be provided" }), { status: 400, headers: corsHeaders });
    }
    if (!instruction) {
      return new Response(JSON.stringify({ error: "Missing required field: instruction" }), { status: 400, headers: corsHeaders });
    }
    if (!targetClothingType) {
      return new Response(JSON.stringify({ error: "Missing required field: targetClothingType" }), { status: 400, headers: corsHeaders });
    }

    // Zod validation for structure
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      console.error("DEBUG: Zod validation failed:", parsed.error.flatten());
      return new Response(
        JSON.stringify({
          error: "Invalid request structure",
          details: parsed.error.flatten(),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // STEP 3: VERIFY IMAGE URL ACCESS
    const testUrl = frontImageUrl || backImageUrl;
    if (testUrl) {
      try {
        console.log(`DEBUG: Checking image accessibility: ${testUrl}`);
        const testFetch = await fetch(testUrl, { method: 'HEAD' });
        if (!testFetch.ok) {
          console.error(`DEBUG: Image URL not accessible (Status ${testFetch.status}): ${testUrl}`);
          return new Response(JSON.stringify({ error: "Image URL not accessible" }), { status: 400, headers: corsHeaders });
        }
        console.log("DEBUG: Image URL is accessible.");
      } catch (err) {
        console.error(`DEBUG: Failed to fetch image URL: ${err.message}`);
        return new Response(JSON.stringify({ error: "Image URL not accessible" }), { status: 400, headers: corsHeaders });
      }
    }

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
- Front mockup MUST visually match the provided front image EXACTLY (if provided)
- If back image is provided:
  - Back mockup MUST match the provided back image EXACTLY
- If back image is NOT provided:
  - Back mockup must be PLAIN (or consistent with front style)
  - Same base color and fabric texture
  - No design elements

OUTPUT REQUIREMENTS:
- ONE composite image
- Front view on LEFT, back view on RIGHT
- High-resolution, realistic apparel mockup 
- Looks like a professional product listing image
- Do not add model just show mockup of cloth
`;

    /* -------------------- USER PROMPT -------------------- */
    const userPrompt = `
Create a realistic ${targetClothingType} studio mockup using the provided reference image(s).
Target design side: ${designSide || "front/back unified"}

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
    const content = [{ type: "text", text: userPrompt }];
    if (frontImageUrl) {
      content.push({ type: "image_url", image_url: { url: frontImageUrl } } as any);
    }
    if (backImageUrl) {
      content.push({ type: "image_url", image_url: { url: backImageUrl } } as any);
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ];

    /* -------------------- AI CALL -------------------- */
    console.log("DEBUG: Sending request to AI Gateway...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("DEBUG: AI Gateway returned error:", errText);
      throw new Error(`AI error: ${errText}`);
    }

    const data = await aiResponse.json();
    console.log("DEBUG: AI Gateway response received.");

    /* -------------------- IMAGE EXTRACTION -------------------- */
    const imageUrl =
      data?.choices?.[0]?.message?.content?.find((c: any) => c.type === "image_url")?.image_url?.url ||
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data?.choices?.[0]?.message?.images?.[0]?.url ||
      data?.output?.[0]?.url ||
      data?.images?.[0]?.url ||
      data?.image_url ||
      null;

    if (!imageUrl) {
      console.error("DEBUG: No image found in AI response:", JSON.stringify(data, null, 2));
      throw new Error("No image generated by AI");
    }

    /* -------------------- RESPONSE -------------------- */
    return new Response(
      JSON.stringify({
        imageUrl,
        frontImageUrl: imageUrl, // Compatibility with some frontends
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // STEP 4: RETURN REAL ERROR MESSAGE
    console.error("DEBUG: EDGE ERROR:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown server error",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
