import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const schema = z.object({
  prompt: z.string().min(10).max(500),
  style: z.string(),
  colorScheme: z.string(),
  creativity: z.number().min(0).max(100).default(70),
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
    const {
      prompt, style, colorScheme, creativity, text,
      clothingType, imagePosition, color,
      apparelType, apparelColor, designPlacement,
    } = schema.parse(body);

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) throw new Error("Missing API key");

    const garmentType = clothingType || apparelType || "t-shirt";
    const fabricColor = color || apparelColor || "black";
    const placement = imagePosition || designPlacement || "front";

    const garmentNameMap: Record<string, string> = {
      "t-shirt": "classic crew-neck T-shirt",
      "hoodie": "pullover hoodie with kangaroo pocket",
      "oversized-tshirt": "oversized drop-shoulder T-shirt",
      "sweatshirt": "crewneck sweatshirt",
      "polo": "polo shirt with collar",
      "tops": "casual top",
    };
    const garmentDesc = garmentNameMap[garmentType] || "T-shirt";

    const placementMap: Record<string, string> = {
      "front": "front center chest area",
      "back": "back center area",
      "left-chest": "left chest (small logo placement)",
      "full-front": "full front coverage",
    };
    const placementDesc = placementMap[placement] || "front center";

    /* ---- MOCKUP PROMPT ---- */
    const mockupPrompt = `
You are a professional fashion product photographer and apparel mockup AI.

TASK:
Generate a SINGLE, photorealistic, high-quality studio product mockup of a ${garmentDesc}.

GARMENT SPECIFICATIONS:
- Garment type: ${garmentDesc}
- Fabric color: ${fabricColor}
- The garment must look like a real piece of clothing with natural fabric texture, folds, wrinkles, and draping

DESIGN/ARTWORK TO INTEGRATE:
- Design concept: "${prompt}"
- Art style: ${style}
- Color mood: ${colorScheme}
- Creativity level: ${creativity}%
${text ? `- Include this text in the design: "${text}"` : "- No text in the design"}

DESIGN PLACEMENT:
- Place the artwork on the ${placementDesc} of the garment
- The design must be seamlessly integrated into the fabric
- It should follow the natural contours, folds, and shadows of the garment
- The print should look like it was actually printed/embroidered on the fabric
- Proper light interaction — the design should have realistic shadows and highlights matching the garment lighting

STUDIO MOCKUP REQUIREMENTS:
- Professional product photography style (like an e-commerce listing)
- Clean, neutral studio background (light gray or white gradient)
- The garment should be displayed on an invisible mannequin or laid flat naturally
- Soft, even studio lighting
- High resolution, sharp details
- The garment should look 3D and realistic, NOT flat
- Show the garment from the ${placement === "back" ? "back" : "front"} angle

DO NOT:
- Show any human model or visible mannequin
- Generate just flat artwork without a garment
- Make the design look pasted or floating on top
- Add watermarks, text overlays, or labels
- Show multiple garments or angles

OUTPUT:
One single photorealistic product mockup image ready for an e-commerce listing.
`;

    /* ---- ISOLATED ARTWORK PROMPT ---- */
    const artworkPrompt = `
You are a professional print-ready artwork designer.

TASK:
Generate ONLY the isolated design artwork — NO clothing, NO garment, NO mockup.

DESIGN SPECIFICATIONS:
- Design concept: "${prompt}"
- Art style: ${style}
- Color mood: ${colorScheme}
- Creativity level: ${creativity}%
${text ? `- Include this text in the design: "${text}"` : "- No text in the design"}

OUTPUT REQUIREMENTS:
- The artwork must be on a PURE WHITE background (#FFFFFF)
- Just the design/artwork itself, completely isolated
- No clothing template, no garment shape, no mannequin
- High resolution, crisp edges, print-ready quality (300 DPI equivalent)
- Centered composition, balanced layout
- The design should be complete and self-contained
- Colors must be vivid and suitable for fabric printing
- Edge-to-edge design content with white background surrounding it

DO NOT:
- Place the design on any clothing or mockup
- Add any background other than pure white
- Add watermarks, frames, borders, or labels
- Show multiple designs or variations
- Add shadows or 3D effects around the design

OUTPUT:
One single isolated artwork image on white background, ready for fabric printing.
`;

    console.log("Generating Mockup + Artwork in parallel...", { prompt, style, garmentType, fabricColor, placement });

    const headers = {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    };

    // Generate both in parallel
    const [mockupRes, artworkRes] = await Promise.all([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: mockupPrompt }],
          modalities: ["image"],
        }),
      }),
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: artworkPrompt }],
          modalities: ["image"],
        }),
      }),
    ]);

    // Handle mockup response
    if (!mockupRes.ok) {
      const errorText = await mockupRes.text();
      console.error("Mockup Generation Error:", mockupRes.status, errorText);
      if (mockupRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (mockupRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue generating." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Mockup Generation Failed: ${errorText}`);
    }

    const mockupData = await mockupRes.json();
    const imageUrl =
      mockupData?.choices?.[0]?.message?.images?.[0]?.url ||
      mockupData?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      mockupData?.choices?.[0]?.message?.image_url;

    if (!imageUrl) {
      const finishReason = mockupData?.choices?.[0]?.native_finish_reason ||
        mockupData?.choices?.[0]?.finish_reason || "";
      console.error("No mockup image URL in response", mockupData);

      if (finishReason === "IMAGE_PROHIBITED_CONTENT" ||
          mockupData?.choices?.[0]?.native_finish_reason === "IMAGE_PROHIBITED_CONTENT") {
        return new Response(
          JSON.stringify({ error: "Your prompt contains content the AI cannot generate (e.g. real people, copyrighted characters). Please rephrase your design idea." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("Failed to generate mockup image. Try a different prompt.");
    }

    // Handle artwork response (non-critical - don't fail if this errors)
    let artworkUrl: string | null = null;
    try {
      if (artworkRes.ok) {
        const artworkData = await artworkRes.json();
        artworkUrl =
          artworkData?.choices?.[0]?.message?.images?.[0]?.url ||
          artworkData?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
          artworkData?.choices?.[0]?.message?.image_url || null;
      } else {
        console.warn("Artwork generation failed, continuing with mockup only");
      }
    } catch (artErr) {
      console.warn("Artwork extraction error:", artErr);
    }

    console.log("Generation Complete", { hasMockup: !!imageUrl, hasArtwork: !!artworkUrl });

    return new Response(
      JSON.stringify({ imageUrl, artworkUrl }),
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
