import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Initialize Supabase client for storage and database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from authorization header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
        }
      } catch (authErr) {
        console.error("Auth error:", authErr);
      }
    }

    // Download the generated image from Lovable
    let supabaseImageUrl: string | null = null;
    try {
      console.log("Downloading image from Lovable...");
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to download generated image");
      }
      const imageBlob = await imageResponse.blob();

      // Upload to user's Supabase Storage
      const filename = `ai_${userId ?? "anon"}_${Date.now()}.png`;
      const storagePath = `${filename}`;

      console.log("Uploading to Supabase Storage:", storagePath);
      const { error: uploadError } = await supabase.storage.from("ai-designs").upload(storagePath, imageBlob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/png",
      });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("ai-designs").getPublicUrl(storagePath);

      if (urlData?.publicUrl) {
        supabaseImageUrl = urlData.publicUrl;
        console.log("Image uploaded to Supabase:", supabaseImageUrl);
      }
    } catch (storageErr) {
      console.error("Failed to upload to storage:", storageErr);
      // Continue anyway with the original Lovable URL
      supabaseImageUrl = imageUrl;
    }

    // Get additional parameters from request body
    const { clothingType, imagePosition, color, apparelType, apparelColor, designPlacement } = body;

    // Save to ai_generations table
    let generationId = null;
    if (userId) {
      try {
        const { data: generationData, error: dbError } = await supabase
          .from("ai_generations")
          .insert({
            user_id: userId,
            session_id: globalThis.crypto.randomUUID(), // Generate a session ID
            prompt,
            style,
            color_scheme: colorScheme,
            image_url: supabaseImageUrl || imageUrl,
            clothing_type: clothingType || apparelType || "t-shirt",
            image_position: imagePosition || designPlacement || "front",
            included_text: text || null,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (dbError) {
          console.error("Database insertion error:", dbError);
        } else {
          generationId = generationData?.id;
          console.log("Saved to database with ID:", generationId);
        }
      } catch (dbErr) {
        console.error("Failed to save generation:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        imageUrl: supabaseImageUrl || imageUrl,
        generationId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Function Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
