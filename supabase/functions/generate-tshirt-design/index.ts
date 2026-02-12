import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Input schema from "tesora latest latest" (ensures compatibility)
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

    // --- SECRETS CHECK (Improved Error Handling) ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const MAIN_PROJECT_URL = Deno.env.get("MAIN_PROJECT_URL");
    const MAIN_PROJECT_SERVICE_KEY = Deno.env.get("MAIN_PROJECT_SERVICE_KEY");

    const missing = [];
    if (!LOVABLE_API_KEY) missing.push("LOVABLE_API_KEY");
    if (!MAIN_PROJECT_URL) missing.push("MAIN_PROJECT_URL");
    if (!MAIN_PROJECT_SERVICE_KEY) missing.push("MAIN_PROJECT_SERVICE_KEY");

    if (missing.length > 0) {
      const errorMsg = `Missing secrets in Lovable: ${missing.join(", ")}`;
      console.error(errorMsg);
      // Return 500 so UI shows the specific error
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 1. GENERATE IMAGE (Logic from tesora latest latest) ---
    const aspectDesc =
      aspectRatio === "square" ? "1:1 square" : aspectRatio === "portrait" ? "3:4 portrait" : "4:3 landscape";

    const textInstruction =
      text && text.trim().length > 0
        ? `IMPORTANT: Include this text prominently in the design: "${text}". Make the text stylish, readable, and well-integrated with the artwork.`
        : "Do NOT include any text, words, letters, logos, or watermarks in the design.";

    const enhancedPrompt = `Create a high-quality, print-ready design artwork:

DESIGN CONCEPT:
${prompt}

SPECIFICATIONS:
- Style: ${style}
- Color scheme: ${colorScheme}
- Quality: ${quality}
- Creativity level: ${creativity}%
- Aspect ratio: ${aspectDesc}

TEXT REQUIREMENT:
${textInstruction}

OUTPUT REQUIREMENTS:
- Just the artwork/graphic itself, NOT placed on any clothing or mockup
- design should full as per aspect ratio ${aspectDesc}
- High-resolution suitable for print (300 DPI)
- Centered and balanced composition
- No watermarks, signatures, or backgrounds
- The design should be isolated and ready to overlay on any surface`.trim();

    console.log("Calling Lovable AI API with Enhanced Prompt...");

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
      console.error("AI gateway error:", aiResponse.status, errorText);

      // Handle specific gateway errors
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds to your account." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error", details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageUrl =
      aiData?.choices?.[0]?.message?.images?.[0]?.url ||
      aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      aiData?.choices?.[0]?.message?.image_url ||
      aiData?.output?.[0]?.url ||
      aiData?.data?.[0]?.url ||
      aiData?.images?.[0]?.url ||
      aiData?.image_url;

    if (!imageUrl) {
      console.error("No image URL in response:", aiData);
      throw new Error("No image generated by AI Service");
    }

    console.log("Image generated successfully:", imageUrl);

    // --- 2. PERSISTENCE (Added to ensure saving works) ---
    // The previous version relied on Frontend saving. We enable backend saving here for reliability.
    let finalImageUrl = imageUrl;
    let userId = "anon";

    // 2a. Identify User
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

    // 2b. Upload & Save
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
        // Construct the public URL for the stored image
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
      // We do NOT throw here, so the user still gets the standard Lovable URL if saving fails
    }

    // Return the response (Frontend expects 'imageUrl')
    return new Response(
      JSON.stringify({
        imageUrl: finalImageUrl,
        includedText: text || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
