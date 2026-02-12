import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Input schema matching frontend exactly
const schema = z.object({
  prompt: z.string().min(10).max(500),
  style: z.string(),
  colorScheme: z.string(),
  creativity: z.number().min(0).max(100).default(70),

  // Product fields
  apparelType: z.string().optional(),
  apparelColor: z.string().optional(),
  designPlacement: z.string().optional(),
  clothingType: z.string().optional(),
  imagePosition: z.string().optional(),
  color: z.string().optional(),

  text: z.string().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, style, colorScheme, creativity, text, clothingType, imagePosition, apparelType, designPlacement } =
      schema.parse(body);

    // Validate required environment variables
    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration error: Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ============================================================
       SINGLE-STEP DESIGN GENERATION
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
      return new Response(JSON.stringify({ error: `AI Generation Failed: ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageUrl =
      data?.choices?.[0]?.message?.images?.[0]?.url ||
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data?.choices?.[0]?.message?.image_url;

    if (!imageUrl) {
      console.error("No image URL in response", data);
      return new Response(JSON.stringify({ error: "Failed to generate design image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Design Generated Successfully:", imageUrl);

    // Initialize Supabase client with service role for storage/DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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

    // Download and upload image to user's Supabase Storage
    let supabaseImageUrl: string = imageUrl;
    try {
      console.log("Downloading image from Lovable...");
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      const imageBlob = await imageResponse.blob();

      // Use service role to bypass RLS - storage path doesn't need user folder structure
      const filename = `${userId || "anon"}_${Date.now()}.png`;
      const storagePath = filename; // Direct path in bucket root

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
      // Continue with Lovable URL - non-critical failure
    }

    // Save to ai_generations table (only if user is authenticated)
    let generationId: string | null = null;
    if (userId) {
      try {
        const { data: generationData, error: dbError } = await supabase
          .from("ai_generations")
          .insert({
            user_id: userId,
            session_id: globalThis.crypto.randomUUID(),
            prompt,
            style,
            color_scheme: colorScheme,
            image_url: supabaseImageUrl,
            clothing_type: clothingType || apparelType || "t-shirt",
            image_position: imagePosition || designPlacement || "front",
            included_text: text || null,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (dbError) {
          console.error("Database insertion error:", dbError);
          // Continue without DB record - non-critical failure
        } else {
          generationId = generationData?.id;
          console.log("Saved to database with ID:", generationId);
        }
      } catch (dbErr) {
        console.error("Failed to save generation:", dbErr);
        // Continue without DB record - non-critical failure
      }
    } else {
      console.log("Skipping DB insert - no authenticated user");
    }

    return new Response(
      JSON.stringify({
        imageUrl: supabaseImageUrl,
        generationId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Function Error:", err);

    // Return detailed error for debugging
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorDetails = err instanceof z.ZodError ? err.errors : undefined;

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
