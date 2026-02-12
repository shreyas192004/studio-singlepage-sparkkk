import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Input schema matching frontend exactly
const designRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, "Prompt must be at least 10 characters")
    .max(500, "Prompt must be under 500 characters"),
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
  aspectRatio: z.enum(["square", "portrait", "landscape"]).optional().default("portrait"),
  quality: z.enum(["standard", "high", "ultra"]).optional().default("high"),
  creativity: z.number().min(0).max(100).optional().default(70),
  text: z.string().trim().max(120).optional(),
  clothingType: z.enum(["t-shirt", "polo", "hoodie", "tops", "sweatshirt"]).optional().default("t-shirt"),
  imagePosition: z.enum(["front", "back"]).optional().default("front"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    console.log("Request body received:", body);

    const validationResult = designRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: validationResult.error.errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, style, colorScheme, aspectRatio, quality, creativity, clothingType, imagePosition, text } =
      validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const MAIN_PROJECT_URL = Deno.env.get("MAIN_PROJECT_URL");
    const MAIN_PROJECT_SERVICE_KEY = Deno.env.get("MAIN_PROJECT_SERVICE_KEY");

    if (!LOVABLE_API_KEY || !MAIN_PROJECT_URL || !MAIN_PROJECT_SERVICE_KEY) {
      console.error("Missing configuration:", {
        LOVABLE_API_KEY: !!LOVABLE_API_KEY,
        MAIN_PROJECT_URL: !!MAIN_PROJECT_URL,
        MAIN_PROJECT_SERVICE_KEY: !!MAIN_PROJECT_SERVICE_KEY,
      });
      throw new Error(
        "Edge Function secrets not set. Please set MAIN_PROJECT_URL and MAIN_PROJECT_SERVICE_KEY in Lovable.",
      );
    }

    // --- 1. GENERATE IMAGE ---
    const aspectDesc =
      aspectRatio === "square" ? "1:1 square" : aspectRatio === "portrait" ? "3:4 portrait" : "4:3 landscape";
    const textInstruction =
      text && text.trim().length > 0
        ? `IMPORTANT: Include this text prominently in the design: "${text}". Make the text stylish, readable, and well-integrated.`
        : "Do NOT include any text, words, letters, logos, or watermarks.";

    const enhancedPrompt = `
      Create a high-quality, print-ready design artwork (isolated):
      CONCEPT: ${prompt}
      SPECIFICATIONS:
      - Style: ${style}
      - Color scheme: ${colorScheme}
      - Resolution: ${quality} (300 DPI)
      - Creativity: ${creativity}%
      - Layout: ${aspectDesc}
      REQUIREMENT:
      ${textInstruction}
      - Just the artwork/graphic itself, NOT on clothing or mockup.
      - Isolated design ready for print.
    `.trim();

    console.log("Calling Lovable AI API...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI Generation failed", details: errorText }), {
        status: aiResponse.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageUrl =
      aiData?.choices?.[0]?.message?.images?.[0]?.url || aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) throw new Error("No image URL returned from AI");

    console.log("Image generated successfully:", imageUrl);

    // --- 2. PERSISTENCE ---
    let finalImageUrl = imageUrl;
    let userId = "anon";

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const userRes = await fetch(`${MAIN_PROJECT_URL}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: MAIN_PROJECT_SERVICE_KEY },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          userId = userData.id;
        }
      } catch (e) {
        console.warn("Could not verify user token, continuing as anon:", (e as any).message);
      }
    }

    try {
      console.log(`Starting persistence for user: ${userId}`);

      const imgFetch = await fetch(imageUrl);
      const imgBlob = await imgFetch.blob();

      const filename = `${userId}_${Date.now()}.png`;
      const storagePath = `${userId}/${filename}`;

      // Upload to Main Project Storage
      const uploadRes = await fetch(`${MAIN_PROJECT_URL}/storage/v1/object/ai-designs/${storagePath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MAIN_PROJECT_SERVICE_KEY}`,
          "Content-Type": imgBlob.type,
          "x-upsert": "true",
        },
        body: imgBlob,
      });

      if (uploadRes.ok) {
        finalImageUrl = `${MAIN_PROJECT_URL}/storage/v1/object/public/ai-designs/${storagePath}`;
        console.log("Saved to storage:", finalImageUrl);

        // Save to Database
        const dbRes = await fetch(`${MAIN_PROJECT_URL}/rest/v1/ai_generations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${MAIN_PROJECT_SERVICE_KEY}`,
            apikey: MAIN_PROJECT_SERVICE_KEY,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_id: userId === "anon" ? null : userId,
            image_url: finalImageUrl,
            prompt: prompt,
            style: style,
            color_scheme: colorScheme,
            clothing_type: clothingType,
            image_position: imagePosition,
            session_id: crypto.randomUUID(),
            included_text: text || null,
          }),
        });

        if (dbRes.ok) {
          console.log("✅ Data successfully saved to Main Project Database");
        } else {
          console.error("❌ Database insert failed:", await dbRes.text());
        }
      } else {
        console.error("❌ Storage upload failed:", await uploadRes.text());
      }
    } catch (saveError: any) {
      console.error("Persistence failed (non-blocking):", saveError.message);
    }

    return new Response(JSON.stringify({ imageUrl: finalImageUrl, includedText: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
