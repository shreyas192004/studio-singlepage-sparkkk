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
  frontImageUrl: z.string().url(),
  backImageUrl: z.string().url().optional().nullable(),
  instruction: z.string().min(10),
  targetClothingType: z.enum(["t-shirt", "polo", "hoodie", "tops", "sweatshirt"]),
});

/* -------------------- SERVER -------------------- */
serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { frontImageUrl, backImageUrl, instruction, targetClothingType } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured in Supabase secrets");
    }

    /* -------------------- PROMPT LOGIC -------------------- */
    const systemPrompt = `You are a high-end apparel mockup engine. 
    Your task: Generate ONE high-resolution studio image showing the ${targetClothingType} from two angles.
    
    COMPOSITION:
    - LEFT HALF: Front view of the garment.
    - RIGHT HALF: Back view of the garment.
    - BACKGROUND: Clean, neutral studio gray (#f0f0f0).
    
    STYLE RULES:
    - Maintain the EXACT fabric texture, color, and lighting from the reference image.
    - The design/print from the reference must be preserved perfectly.
    - If a back image is provided, use it for the Right Half. 
    - If NO back image is provided, the Right Half should show the back of the garment as plain/blank.`;

    const userPrompt = `Convert the attached design into a professional ${targetClothingType} mockup. 
    Instruction: ${instruction}
    Requirement: Show front and back side-by-side in one image.`;

    /* -------------------- AI GATEWAY CALL -------------------- */
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Using 2.0-flash as it is highly reliable for image generation
        model: "google/gemini-2.0-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${systemPrompt}\n\n${userPrompt}` },
              { type: "image_url", image_url: { url: frontImageUrl } },
              ...(backImageUrl ? [{ type: "image_url", image_url: { url: backImageUrl } }] : []),
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("AI Gateway Error:", errorData);
      return new Response(JSON.stringify({ error: "AI service failed", details: errorData }), {
        status: response.status,
        headers: corsHeaders,
      });
    }

    const data = await response.json();

    /* -------------------- EXTRACT IMAGE -------------------- */
    // Lovable Gateway returns the image in the message content for 2.0 models
    const generatedImage =
      data?.choices?.[0]?.message?.images?.[0]?.url ||
      data?.choices?.[0]?.message?.content?.find((c: any) => c.type === "image_url")?.image_url?.url ||
      data?.output?.[0]?.url;

    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("AI completed the request but did not return an image.");
    }

    return new Response(JSON.stringify({ imageUrl: generatedImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal Server Error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
