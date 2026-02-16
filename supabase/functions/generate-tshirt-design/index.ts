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

    const aiHeaders = {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    };

    // Helper: call AI and extract image URL, with auto-retry on content block
    async function generateImage(imagePrompt: string, retryPrompt?: string): Promise<string | null> {
      const makeCall = async (p: string) => {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: aiHeaders,
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: p }],
            modalities: ["image"],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return { ok: false as const, status: res.status, errText };
        }

        const data = await res.json();
        const url =
          data?.choices?.[0]?.message?.images?.[0]?.url ||
          data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
          data?.choices?.[0]?.message?.image_url;

        const nativeReason = data?.choices?.[0]?.native_finish_reason || "";
        return { ok: true as const, url, nativeReason, data };
      };

      // First attempt
      const result = await makeCall(imagePrompt);

      if (!result.ok) {
        if (result.status === 429) throw { httpStatus: 429, msg: "Too many requests right now. Please wait a moment and try again 🙏" };
        if (result.status === 402) throw { httpStatus: 402, msg: "AI credits have been used up. Please contact support to continue generating designs." };
        throw { httpStatus: 500, msg: "Something went wrong while generating. Please try again." };
      }

      if (result.url) return result.url;

      // Content was blocked — auto-retry with rephrased prompt
      if (result.nativeReason === "IMAGE_PROHIBITED_CONTENT" && retryPrompt) {
        console.warn("Content blocked, retrying with rephrased prompt...");
        const retry = await makeCall(retryPrompt);
        if (retry.ok && retry.url) return retry.url;
        // Still blocked after retry
        console.warn("Retry also blocked");
      }

      return null;
    }

    // Build a "safe" rephrased version of the prompt for auto-retry
    const safePromptNote = `
IMPORTANT: Create an ORIGINAL artistic interpretation inspired by the following concept. 
Do NOT depict any real person, celebrity, or trademarked character. 
Instead, create a stylized, original character or scene that captures the spirit and energy of the idea.

Original concept for inspiration: "${prompt}"
Reinterpret this as an original artistic design.`;

    const retryMockupPrompt = mockupPrompt.replace(`"${prompt}"`, safePromptNote);
    const retryArtworkPrompt = artworkPrompt.replace(`"${prompt}"`, safePromptNote);

    // Generate both in parallel
    let imageUrl: string | null = null;
    let artworkUrl: string | null = null;
    let wasRephrased = false;

    try {
      const [mockupResult, artworkResult] = await Promise.allSettled([
        generateImage(mockupPrompt, retryMockupPrompt),
        generateImage(artworkPrompt, retryArtworkPrompt),
      ]);

      if (mockupResult.status === "fulfilled") {
        imageUrl = mockupResult.value;
      } else {
        const err = mockupResult.reason;
        if (err?.httpStatus) {
          return new Response(
            JSON.stringify({ error: err.msg }),
            { status: err.httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (artworkResult.status === "fulfilled") {
        artworkUrl = artworkResult.value;
      }
    } catch (outerErr: any) {
      if (outerErr?.httpStatus) {
        return new Response(
          JSON.stringify({ error: outerErr.msg }),
          { status: outerErr.httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw outerErr;
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          error: "The AI couldn't create this exact design. Try describing your idea differently — for example, instead of naming specific people or characters, describe their look or action. Your creativity has no limits! 🎨"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
