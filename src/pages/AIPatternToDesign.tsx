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

import { supabase, lovableSupabase, clearStaleSessions } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Sparkles, Zap } from "lucide-react";

const AUTHENTICATED_USER_LIMIT = 20;

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
  const { user, loading: authLoading } = useAuth();

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

  // BUG 5 FIX: track generation count
  const [generationCount, setGenerationCount] = useState(0);

  // BUG 23 FIX: redirect if not logged in
  useEffect(() => {
    if (!user) return; // still loading - don't redirect yet
    const loadCount = async () => {
      const { data } = await supabase
        .from("user_generation_stats")
        .select("generation_count")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setGenerationCount(data.generation_count);
    };
    loadCount();
  }, [user]);

  /* ---------------- Upload Helper (Uses AI Supabase) ---------------- */
  const uploadImage = async (file: File) => {
    console.log("DEBUG: Starting upload to AI Supabase storage (Pattern)...");
    const ext = file.name.split(".").pop();
    const path = `pattern_${Date.now()}.${ext}`;

    // PROJECT MISMATCH FIX: Upload to lovableSupabase (AI Project)
    const { error } = await lovableSupabase.storage
      .from("ai-inputs")
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("DEBUG: Upload error:", error);
      throw error;
    }

    const { data } = lovableSupabase.storage
      .from("ai-inputs")
      .getPublicUrl(path);

    console.log("DEBUG: Uploaded to AI project. Public URL:", data.publicUrl);
    return data.publicUrl;
  };

  /* ---------------- Generate Handler ---------------- */

  const handleGenerate = async () => {
    // BUG 23 FIX: require login — but wait for session to resolve first
    if (authLoading) return;
    if (!user) {
      toast.error("Please sign in to generate designs.");
      navigate("/auth", { state: { from: "/ai-pattern-to-design" } });
      return;
    }

    // BUG 5 FIX: enforce generation limit
    if (generationCount >= AUTHENTICATED_USER_LIMIT) {
      toast.error(`You've reached the ${AUTHENTICATED_USER_LIMIT}-generation limit. Place an order to unlock more.`);
      navigate("/products");
      return;
    }

    if (!inputImage)
      return toast.error("Please upload a reference image");

    if (!designRequest || designRequest.trim().length < 10)
      return toast.error("Design request must be at least 10 characters");

    // BUG 3/9 FIX: Remove blocking AI session gate
    console.log("DEBUG: Proceeding with pattern generation (AI session check removed).");

    setLoading(true);
    setGeneratedDesign(null);

    try {
      const imageUrl = await uploadImage(inputImage);

      const requestBody = {
        referenceImageUrl: imageUrl,
        designRequest,
        clothingType,
        imagePosition,
      };

      console.log("DEBUG: Invoking 'pattern-to-design' with body:", requestBody);

      const response = await lovableSupabase.functions.invoke(
        "pattern-to-design",
        { body: requestBody }
      );

      if (response.error) {
        let serverError = response.error.message;
        const status = (response.error as any).status || (response.error as any).context?.status;

        console.error("EDGE FUNCTION ERROR STATUS:", status);
        console.error("EDGE FUNCTION ERROR MESSAGE:", response.error.message);

        if ((response.error as any).context) {
          try {
            const body = await (response.error as any).context.json();
            console.error("EDGE FUNCTION SERVER DETAIL:", body);
            serverError = body.error || body.message || JSON.stringify(body);
          } catch (e) {
            try {
              const text = await (response.error as any).context.text();
              console.error("EDGE FUNCTION SERVER TEXT:", text);
              serverError = text;
            } catch (e2) { }
          }
        }

        console.error("EDGE FUNCTION FULL ERROR:", response.error);
        throw new Error(serverError || response.error.message);
      }

      console.log("EDGE FUNCTION SUCCESS:", response.data);
      const data = response.data;
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
      console.error("DEBUG: Generation catch block error:", err);

      if (err?.status === 401 || err?.code === 'auth_session_missing') {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth", { state: { from: "/ai-pattern-to-design" } });
        return;
      }

      toast.error(err.message || "Generation failed. Check console for details.");
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
    <div className="min-h-screen bg-white font-sans text-black selection:bg-accent-neon-lime selection:text-black relative overflow-hidden">
      {/* 🟢 Background Glow Accents */}
      <div className="absolute top-0 right-0 p-24 opacity-20 pointer-events-none z-0">
        <div className="w-[500px] h-[500px] bg-accent-neon-lime rounded-full blur-[120px]"></div>
      </div>
      <div className="absolute bottom-0 left-0 p-24 opacity-10 pointer-events-none z-0">
        <div className="w-[400px] h-[400px] bg-accent-neon-blue rounded-full blur-[100px]"></div>
      </div>

      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <header className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2 bg-accent-neon-lime text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-lg">
            <Zap className="w-4 h-4" />
            PATTERN TRANSFORMATION
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter uppercase italic">
            Texture → <span className="text-accent-neon-blue">Masterpiece</span>
          </h1>
          <p className="text-xl font-bold text-black/40 max-w-2xl mx-auto tracking-tight">
            Upload any pattern and let AI weave it into your fit.
          </p>
        </header>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">
          {/* LEFT */}
          <div className="space-y-8 relative z-10">
            <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl space-y-6">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest mb-3 block text-black/40">Reference Image</Label>
                <div className="mt-2 h-44 border-2 border-black border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-black/5 hover:bg-black/10 transition-colors">
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
                        className="absolute top-2 right-2 bg-black text-white rounded-full p-1 border-2 border-white shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center cursor-pointer group">
                      <Upload className="w-8 h-8 mb-2 text-black/40 group-hover:text-black transition-colors" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-black/60">
                        Upload Texture
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
                <Label className="text-[10px] font-black uppercase tracking-widest mb-3 block text-black/40">Design Request</Label>
                <Textarea
                  placeholder="Example: Create a bold typography design for the word ‘Rushabh’ using the same colors and textures..."
                  value={designRequest}
                  onChange={(e) =>
                    setDesignRequest(e.target.value)
                  }
                  className="mt-2 min-h-[140px] border-2 border-black rounded-xl font-bold p-4 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-3 block text-black/40">Apparel</Label>
                  <Select
                    value={clothingType}
                    onValueChange={(v) =>
                      setClothingType(v as ClothingType)
                    }
                  >
                    <SelectTrigger className="border-2 border-black h-12 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black rounded-xl font-bold">
                      <SelectItem value="t-shirt">T-Shirt</SelectItem>
                      <SelectItem value="hoodie">Hoodie</SelectItem>
                      <SelectItem value="polo">Polo</SelectItem>
                      <SelectItem value="tops">Tops</SelectItem>
                      <SelectItem value="sweatshirt">Sweatshirt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-3 block text-black/40">Position</Label>
                  <Select
                    value={imagePosition}
                    onValueChange={(v) =>
                      setImagePosition(v as ImagePosition)
                    }
                  >
                    <SelectTrigger className="border-2 border-black h-12 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black rounded-xl font-bold">
                      <SelectItem value="front">Front</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full h-20 text-2xl rounded-full bg-black text-white font-black uppercase tracking-tighter hover:bg-accent-neon-blue transition-all shadow-xl border-4 border-transparent hover:border-black ring-4 ring-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Tailoring...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-3" />
                    GENERATE DESIGN
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT */}
          <aside className="sticky top-24 z-10 h-fit">
            <div className="bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(204,255,0,0.2)] rounded-[2.5rem] min-h-[500px] flex flex-col">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-6">Mockup Preview</h2>

              <div className="relative aspect-square bg-black/5 rounded-[1.5rem] overflow-hidden border-2 border-black/5 flex-1">
                {baseImage && (
                  <img
                    src={baseImage}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {generatedDesign && overlay && (
                  <div className="animate-in fade-in zoom-in duration-500">
                    <img
                      src={generatedDesign}
                      className="absolute cursor-pointer border-2 border-black/5 shadow-xl rounded hover:scale-105 transition-transform"
                      style={{
                        width: `${overlay.widthPct}%`,
                        left: `${overlay.leftPct}%`,
                        top: `${overlay.topPct}%`,
                      }}
                      onClick={() => setLargePreview(true)}
                    />
                  </div>
                )}

                {!generatedDesign && !loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-black/20 text-center p-8">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-sm font-black uppercase tracking-widest">
                      Awaiting Masterpiece
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
                    <Loader2 className="w-12 h-12 animate-spin text-black mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest animate-pulse">Processing Patterns...</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />

      {/* Large Preview */}
      {largePreview && generatedDesign && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-8 backdrop-blur-sm"
          onClick={() => setLargePreview(false)}
        >
          <div className="relative max-w-5xl w-full aspect-square bg-white border-8 border-black shadow-[20px_20px_0px_0px_rgba(204,255,0,1)] rounded-3xl overflow-hidden">
            <img
              src={generatedDesign}
              className="w-full h-full object-contain"
            />
            <button className="absolute top-6 right-6 bg-black text-white p-2 rounded-full border-2 border-white shadow-xl">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
