import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Wand2,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { lovableSupabase } from "@/integrations/supabase/lovableClient";
import { toast } from "sonner";

/* ---------------- Types ---------------- */

type ClothingType = "t-shirt" | "hoodie" | "polo" | "tops" | "sweatshirt";
type ImagePosition = "front" | "back";

/* ---------------- Mockup Assets ---------------- */

const BASE_IMAGES: Record<
  ClothingType,
  { front?: string; back?: string }
> = {
  "t-shirt": { front: "/t-shirtFront.jpg", back: "/t-shirtBack.jpg" },
  hoodie: { front: "/hoodieFront.jpg", back: "/hoodieBack.jpg" },
  polo: { back: "/poloBack.jpg" },
  tops: { front: "/topFront.jpg" },
  sweatshirt: {
    front: "/sweatshirtFront.png",
    back: "/sweatshirtBack.png",
  },
};

const OVERLAY_PRESETS: Record<
  ClothingType,
  {
    front?: { widthPct: number; leftPct: number; topPct: number };
    back?: { widthPct: number; leftPct: number; topPct: number };
  }
> = {
  "t-shirt": {
    front: { widthPct: 40, leftPct: 30, topPct: 30 },
    back: { widthPct: 40, leftPct: 30, topPct: 30 },
  },
  hoodie: {
    front: { widthPct: 32, leftPct: 34, topPct: 40 },
    back: { widthPct: 32, leftPct: 34, topPct: 40 },
  },
  polo: {
    back: { widthPct: 28, leftPct: 36, topPct: 35 },
  },
  tops: {
    front: { widthPct: 28, leftPct: 36, topPct: 42 },
  },
  sweatshirt: {
    front: { widthPct: 30, leftPct: 35, topPct: 40 },
    back: { widthPct: 30, leftPct: 35, topPct: 40 },
  },
};

/* ========================================================= */

export default function AIPatternToDesign() {
  const navigate = useNavigate();

  const [inputImage, setInputImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // ✅ Correct naming
  const [designRequest, setDesignRequest] = useState("");

  const [clothingType, setClothingType] =
    useState<ClothingType>("t-shirt");
  const [imagePosition, setImagePosition] =
    useState<ImagePosition>("front");

  const [generatedDesign, setGeneratedDesign] =
    useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [largePreview, setLargePreview] = useState(false);

  /* ---------------- Upload Helper ---------------- */

  const uploadImage = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `pattern_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("ai-designs")
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("ai-designs")
      .getPublicUrl(path);

    return data.publicUrl;
  };

  /* ---------------- Generate Handler ---------------- */

  const handleGenerate = async () => {
    if (!inputImage)
      return toast.error("Please upload a reference image");

    if (designRequest.trim().length < 10)
      return toast.error("Design request must be at least 10 characters");

    setLoading(true);
    setGeneratedDesign(null);

    try {
      const imageUrl = await uploadImage(inputImage);

      const { data, error } =
        await supabase.functions.invoke(
          "pattern-to-design",
          {
            body: {
              referenceImageUrl: imageUrl,
              designRequest, // ✅ correct key
              clothingType,
              imagePosition,
            },
          }
        );

      if (error) throw error;
      if (!data?.imageUrl)
        throw new Error("No image returned from AI");

      // Upload generated image to storage and save to DB
      let storedUrl = data.imageUrl;
      try {
        if (data.imageUrl?.startsWith("data:")) {
          const imgRes = await fetch(data.imageUrl);
          const blob = await imgRes.blob();
          const fileName = `pattern_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.png`;
          const { data: upData, error: upErr } = await supabase.storage
            .from("ai-designs").upload(fileName, blob, { contentType: "image/png", cacheControl: "3600" });
          if (!upErr && upData) {
            const { data: pubUrl } = supabase.storage.from("ai-designs").getPublicUrl(fileName);
            storedUrl = pubUrl.publicUrl;
          }
        }
      } catch (e) { console.warn("Storage upload failed:", e); }

      // Save to ai_generations for analytics
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("ai_generations").insert({
          user_id: user.id,
          session_id: crypto.randomUUID(),
          image_url: storedUrl,
          prompt: designRequest,
          style: "pattern-to-design",
          color_scheme: "reference",
          clothing_type: clothingType,
          image_position: imagePosition,
        });
      }

      setGeneratedDesign(data.imageUrl);
      toast.success("Design generated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Preview Helpers ---------------- */

  const baseImage =
    BASE_IMAGES[clothingType]?.[imagePosition] ??
    BASE_IMAGES[clothingType]?.front;

  const overlay =
    OVERLAY_PRESETS[clothingType]?.[imagePosition] ??
    OVERLAY_PRESETS[clothingType]?.front;

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container flex items-center gap-4 h-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold">Pattern → Custom Design</h1>
            <p className="text-xs text-muted-foreground">
              Create new designs using texture & colors
            </p>
          </div>
        </div>
      </header>

      <main className="container py-10 grid lg:grid-cols-2 gap-10">
        {/* LEFT */}
        <div className="space-y-6">
          <div>
            <Label>Reference Image</Label>
            <div className="mt-2 h-44 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden">
              {preview ? (
                <div className="relative w-full h-full">
                  <img
                    src={preview}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setInputImage(null);
                      setPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="w-6 h-6 mb-2" />
                  <span className="text-xs">
                    Upload cloth / texture / pattern
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setInputImage(f);
                        setPreview(URL.createObjectURL(f));
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Design Request</Label>
            <Textarea
              placeholder="Example: Create a bold typography design for the word ‘Rushabh’ using the same colors, textures, and visual style from the reference image."
              value={designRequest}
              onChange={(e) =>
                setDesignRequest(e.target.value)
              }
              className="mt-2 min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Clothing Type</Label>
              <Select
                value={clothingType}
                onValueChange={(v) =>
                  setClothingType(v as ClothingType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="t-shirt">T-Shirt</SelectItem>
                  <SelectItem value="hoodie">Hoodie</SelectItem>
                  <SelectItem value="polo">Polo</SelectItem>
                  <SelectItem value="tops">Tops</SelectItem>
                  <SelectItem value="sweatshirt">Sweatshirt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Position</Label>
              <Select
                value={imagePosition}
                onValueChange={(v) =>
                  setImagePosition(v as ImagePosition)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Front</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-12"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Design
              </>
            )}
          </Button>
        </div>

        {/* RIGHT */}
        <div className="bg-card rounded-2xl p-6 border shadow-sm">
          <h2 className="font-semibold mb-3">Mockup Preview</h2>

          <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
            {baseImage && (
              <img
                src={baseImage}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {generatedDesign && overlay && (
              <img
                src={generatedDesign}
                className="absolute cursor-pointer"
                style={{
                  width: `${overlay.widthPct}%`,
                  left: `${overlay.leftPct}%`,
                  top: `${overlay.topPct}%`,
                }}
                onClick={() => setLargePreview(true)}
              />
            )}

            {!generatedDesign && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="w-10 h-10 mb-2" />
                <p className="text-sm text-center">
                  Generated design will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Large Preview */}
      {largePreview && generatedDesign && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setLargePreview(false)}
        >
          <img
            src={generatedDesign}
            className="max-w-[80vw] max-h-[80vh] rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
