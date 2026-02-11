import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Input validation schema - matches all frontend options exactly (updated)
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
  color: z.string().optional().default("black"),
  size: z.string().optional().default("M"),
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
    console.log("Request body received:", body);

    const validationResult = designRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      console.error("Validation errors:", errors);
      return new Response(JSON.stringify({ error: "Invalid request", details: errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, style, colorScheme, quality, creativity, clothingType, imagePosition, text, color } =
      validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    console.log("LOVABLE_API_KEY loaded:", LOVABLE_API_KEY ? `${LOVABLE_API_KEY.slice(0, 4)}********` : "NOT FOUND");
    if (!LOVABLE_API_KEY) {
      throw new Error("AI API key is not configured");
    }

    console.log("Generating design with:", {
      prompt,
      style,
      colorScheme,
      aspectRatio,
      quality,
      creativity,
      imagePosition,
      text: text || "(none)",
    });

    // Build text instruction conditionally
    const textInstruction =
      text && text.length > 0
        ? `IMPORTANT: Include this text prominently in the design: "${text}". Make the text stylish, readable, and well-integrated with the artwork.`
        : "Do NOT include any text, words, letters, logos, or watermarks in the design.";

    // Build the enhanced prompt - NO clothing type mentioned to get raw artwork only
    // Map clothing type to display name
    const apparelMap: Record<string, string> = {
      "t-shirt": "T-Shirt",
      polo: "Polo Shirt",
      hoodie: "Hoodie",
      sweatshirt: "Sweatshirt",
      tops: "Top",
    };

    // Map placement to display name
    const placementMap: Record<string, string> = {
      front: "Front Center",
      back: "Back Center",
    };

    const currentApparel = apparelMap[clothingType] || clothingType;
    const currentPlacement = placementMap[imagePosition] || imagePosition;

    console.log("Mockup Target:", {
      color,
      size,
      clothingType: currentApparel,
      imagePosition: currentPlacement,
    });

    const enhancedPrompt = `
ROLE:
You are a professional apparel graphic designer creating a PRINT-READY T-SHIRT DESIGN.

ABSOLUTE RULES (NON-NEGOTIABLE):
- Generate ONLY a T-SHIRT PRINT GRAPHIC
- This is NOT a poster, NOT a book cover, NOT a scene illustration
- DO NOT create full environments, landscapes, skies, or cinematic backgrounds
- DO NOT create depth-heavy scenes or storytelling compositions
- DO NOT show clothing, mockups, models, or studio photography
- NO borders, NO frames, NO UI elements
- NO watermarks, NO logos, NO brand names

COMPOSITION RULES (VERY IMPORTANT):
- Single, centered design
- Subject must be ISOLATED or grouped tightly
- Design must float on a transparent or plain background
- No background storytelling
- No horizon lines
- No cinematic lighting
- No wide-angle composition

BACKGROUND:
- Transparent background preferred
- If not possible: flat, solid, neutral background
- Background must be removable easily
- Background must NOT be part of the artwork

DESIGN STYLE:
- Clean, bold, wearable
- High contrast
- Clear silhouette
- Looks good when printed on fabric
- Similar to premium streetwear or print-on-demand designs

DESIGN IDEA:
Create a T-shirt graphic based on this concept:
"${prompt}"

STYLE SETTINGS:
- Art style: ${style}
- Color mood: ${colorScheme}
- Quality: ${quality}
- Creativity: ${creativity}%

TEXT RULES:
${
  text && text.length > 0
    ? `Include this text as part of the graphic:
"${text}"
- Text must be bold and readable
- Text must be integrated into the design
- Avoid small or thin typography`
    : `Do NOT include any text or lettering`
}

PRINT SAFETY:
- Avoid tiny details
- Avoid excessive gradients
- Avoid background noise
- Design must be printable on a T-shirt

FINAL VALIDATION:
✔ Isolated graphic
✔ No full scene
✔ No poster composition
✔ Apparel-print ready
✔ Centered and wearable
`;

    console.log("Enhanced prompt:", enhancedPrompt);

    // Call AI gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY} `,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds to your account." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract image URL from various possible response formats
    const imageUrl =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data?.choices?.[0]?.message?.images?.[0]?.url ||
      data?.choices?.[0]?.message?.image_url ||
      data?.output?.[0]?.url ||
      data?.data?.[0]?.url ||
      data?.images?.[0]?.url ||
      data?.image_url ||
      null;

    if (!imageUrl) {
      console.error("No image URL in response:", data);
      throw new Error("No image generated");
    }

    console.log("Generated image URL:", imageUrl);

    return new Response(
      JSON.stringify({
        imageUrl,
        includedText: text || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
