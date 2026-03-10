import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
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
import {
  Loader2,
  Sparkles,
  Upload,
  ArrowLeft,
  Image as ImageIcon,
  X,
  Wand2,
  Download,
  ShoppingCart,
  CreditCard,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { supabase, lovableSupabase, clearStaleSessions } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

const AUTHENTICATED_USER_LIMIT = 20;

type ClothingType = "Classic t-shirt" | "OverSized t-shirt" | "hoodie" | "sweatshirt";

const CLOTHING_PRICES: Record<ClothingType, number> = {
  "Classic t-shirt": 799,
  "OverSized t-shirt": 999,
  "hoodie": 1499,
  "sweatshirt": 1299,
};


const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function AIClothConverter() {

  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);


  type DesignSide = "front" | "back" | "both";
  const [designSide, setDesignSide] = useState<DesignSide>("both");

  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, loading: authLoading } = useAuth();

  // BUG 5 FIX: track generation count so the limit is enforced here too
  const [generationCount, setGenerationCount] = useState(0);

  // BUG 23 FIX: redirect to /auth if not logged in
  useEffect(() => {
    if (user === null) return; // still loading
    // We wait for auth to settle before checking
  }, [user]);

  // Load generation count from DB when user is available
  useEffect(() => {
    if (!user) return;
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

  // Input States
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [targetClothingTypes, setTargetClothingTypes] =
    useState<ClothingType[]>(["Classic t-shirt"]);

  // Output States
  const [loading, setLoading] = useState(false);
  type GeneratedResult = {
    clothingType: ClothingType;
    front: string;
    back?: string | null;
  };

  const [generatedResults, setGeneratedResults] =
    useState<GeneratedResult[]>([]);

  // Cart/Modal States
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("M");

  /* ---------------- Upload helper (Uses AI Supabase) ---------------- */
  const uploadToStorage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(7)}-${Date.now()}.${fileExt}`;

    const path = fileName;

    // PROJECT MISMATCH FIX: Upload to lovableSupabase (AI Project)
    const { error } = await lovableSupabase.storage
      .from("ai-inputs")
      .upload(path, file, {
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error("DEBUG: Upload error:", error);
      throw error;
    }

    const { data } = lovableSupabase.storage.from("ai-inputs").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ---------------- Generate Handler ---------------- */
  const handleGenerate = async () => {
    // BUG 23 FIX: require login — but wait for session to resolve first
    if (authLoading) return;
    if (!user) {
      toast.error("Please sign in to generate designs.");
      navigate("/auth", { state: { from: "/ai-cloth-converter" } });
      return;
    }

    // BUG 5 FIX: enforce the same 20-generation limit as AIGenerator
    if (generationCount >= AUTHENTICATED_USER_LIMIT) {
      toast.error(`You've reached the ${AUTHENTICATED_USER_LIMIT}-generation limit. Place an order to unlock more.`);
      navigate("/products");
      return;
    }

    // PART 6: SAFETY VALIDATION
    if (!frontImage) return toast.error("Front image is required");
    if (!instruction || instruction.trim().length < 10)
      return toast.error("Instruction must be at least 10 characters");
    if (!targetClothingTypes || targetClothingTypes.length === 0)
      return toast.error("Select at least one clothing type");

    // BUG 3/9 FIX: Remove the blocking AI session gate – edge functions work
    // with the anon key. Only a main-project user session is required.

    setLoading(true);
    setGeneratedResults([]);

    try {
      // PART 3 & 4: UPLOAD & VERIFY URL
      const frontUrl = await uploadToStorage(frontImage);
      const backUrl = backImage ? await uploadToStorage(backImage) : null;

      if (!frontUrl) throw new Error("Failed to generate accessible image URL");

      const results: GeneratedResult[] = [];

      for (const clothingType of targetClothingTypes) {
        const requestBody = {
          frontImageUrl: designSide !== "back" ? frontUrl : null,
          backImageUrl: designSide !== "front" ? backUrl || frontUrl : null,
          instruction,
          targetClothingType: clothingType,
          designSide,
        };

        const response = await lovableSupabase.functions.invoke(
          "convert-cloth-design",
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

        const data = response.data;

        results.push({
          clothingType,
          front: data?.frontImageUrl || data?.imageUrl,
          back: data?.backImageUrl || null,
        });
      }

      setGeneratedResults(results);
      toast.success("All designs generated successfully!");
    } catch (err: any) {
      console.error("DEBUG: Generation catch block error:", err);

      toast.error(err?.message || "AI Generation failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };


  /* ---------------- Cart Logic ---------------- */
  const handleAddToCartClick = () => {
    if (!user) return toast.error("Please login to save your design");
    setVariantModalOpen(true);
  };

  /* Helper: upload generated image & save to analytics */
  const saveGeneratedDesign = async (item: GeneratedResult) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || !item.front) return;

      let storedUrl = item.front;
      if (item.front.startsWith("data:")) {
        const imgRes = await fetch(item.front);
        const blob = await imgRes.blob();
        const fileName = `AI-Design_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.png`;
        const { data: upData, error: upErr } = await supabase.storage
          .from("ai-designs").upload(fileName, blob, { contentType: "image/png", cacheControl: "3600" });
        if (!upErr && upData) {
          const { data: pubUrl } = supabase.storage.from("ai-designs").getPublicUrl(fileName);
          storedUrl = pubUrl.publicUrl;
        }
      }
      await supabase.from("ai_generations").insert({
        user_id: currentUser.id,
        session_id: crypto.randomUUID(),
        image_url: storedUrl,
        prompt: instruction,
        style: "cloth-converter",
        color_scheme: "reference",
        clothing_type: item.clothingType,
        image_position: "front",
      });
    } catch (e) { console.warn("Failed to save generation:", e); }
  };

  const confirmAddToCart = async () => {
    if (generatedResults.length === 0) return;

    // Save all designs to storage & analytics
    for (const item of generatedResults) {
      await saveGeneratedDesign(item);
    }

    generatedResults.forEach((item) => {
      addToCart({
        id: crypto.randomUUID(),
        name: `AI Custom ${item.clothingType.toUpperCase()}`,
        price: CLOTHING_PRICES[item.clothingType],
        image: item.front,
        quantity: 1,
        size: selectedSize,
        clothing_type: item.clothingType,
        is_ai_generated: true,
      } as any);
    });

    toast.success("All designs added to cart");
    setVariantModalOpen(false);
  };

  /* ---------------- Buy Now Logic ---------------- */
  const handleBuyNow = async () => {
    if (!user) {
      toast.error("Please login to proceed to checkout");
      return;
    }
    if (generatedResults.length === 0) {
      toast.error("Please generate a design first");
      return;
    }

    const activeResult = generatedResults[activeResultIndex];

    // Save design to storage & analytics on buy
    await saveGeneratedDesign(activeResult);

    navigate("/checkout-ai", {
      state: {
        clothingType: activeResult.clothingType,
        front: activeResult.front,
        back: activeResult.back,
        price: CLOTHING_PRICES[activeResult.clothingType],
        selectedSize: selectedSize,
        is_ai_generated: true,
      },
    });
  };


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
      <div className="h-[110px]" />

      <main className="max-w-[1400px] mx-auto p-6 lg:p-10">
        <BackButton />
        <div className="grid lg:grid-cols-[360px_1.6fr] gap-10">

          {/* LEFT: Controls */}
          <div className="space-y-8">
            <section className="space-y-4 relative z-10 mb-8">
              <div className="inline-flex items-center gap-2 bg-accent-neon-blue text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                <Zap className="w-3 h-3" />
                MAGIC MODE ACTIVE
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter italic">Reimagine <span className="text-accent-neon-blue">Design</span></h2>
              <p className="text-lg font-bold text-black/40 tracking-tight leading-tight">Upload concept and target clothing style.</p>
            </section>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-black/40">Front Reference</Label>
                  <UploadZone
                    preview={frontPreview}
                    onFileSelect={(f) => { setFrontImage(f); setFrontPreview(f ? URL.createObjectURL(f) : null); }}
                    onRemove={() => { setFrontImage(null); setFrontPreview(null); }}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[5px] font-black uppercase tracking-widest text-black/40">Back (Optional)</Label>
                  <UploadZone
                    preview={backPreview}
                    onFileSelect={(f) => { setBackImage(f); setBackPreview(f ? URL.createObjectURL(f) : null); }}
                    onRemove={() => { setBackImage(null); setBackPreview(null); }}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Choose Your Apparel</Label>

                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(CLOTHING_PRICES) as ClothingType[]).map((type) => {
                      const active = targetClothingTypes.includes(type);

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setTargetClothingTypes((prev) =>
                              active ? prev.filter((t) => t !== type) : [...prev, type]
                            )
                          }
                          className={`h-11 rounded-xl border-2 font-semibold capitalize transition-all
            ${active
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-muted hover:border-blue-300"}
          `}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    You can select multiple clothing types
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Design Position </Label>

                  <div className="flex gap-3">
                    {(["front", "back", "both"] as DesignSide[]).map((side) => (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setDesignSide(side)}
                        className={`px-4 h-11 rounded-xl border-2 font-semibold capitalize transition-all
          ${designSide === side
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-muted hover:border-blue-300"
                          }
        `}
                      >
                        {side}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    Choose where the design should appear
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Modification Prompt</Label>
                  <Textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Describe textures, color changes, or graphic placement..."
                    className="min-h-[120px] bg-muted/30 border-none resize-none p-4 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Tailoring Design...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" /> Generate Mockup</>
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT: Display Area */}
          <div className="relative group sticky top-24 z-10 flex flex-col gap-4">
            <div className={`
  min-h-[520px] rounded-[3rem] border-4 border-black flex flex-col items-center justify-center p-8 transition-all duration-500
  ${loading ? 'bg-black/5' : 'bg-white shadow-[12px_12px_0px_0px_rgba(37,99,235,0.2)]'}
`}>
              {generatedResults.length === 0 && !loading && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-accent-neon-blue/10 rounded-2xl flex items-center justify-center mx-auto ring-2 ring-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <ImageIcon className="w-8 h-8 text-black" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic">Ready for Innovation</h3>
                  <p className="text-sm font-bold text-black/40 max-w-[240px]">
                    Configure your design on the left to generate your custom mockup.
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-1 w-48 bg-muted rounded-full overflow-hidden relative">
                    <div className="h-full bg-blue-500 animate-[loading_1.5s_ease-in-out_infinite] absolute top-0 left-0 w-1/3" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground animate-pulse">AI is crafting your garment...</span>
                </div>
              )}

              {/* GENERATED IMAGES */}
              {generatedResults.length > 0 && !loading && (
                <div className="w-full flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-700">

                  {/* ACTIVE IMAGE */}
                  <div className="w-full">
                    <ResultView
                      label={`${generatedResults[activeResultIndex].clothingType} Design`}
                      url={
                        designSide === "back"
                          ? generatedResults[activeResultIndex].back!
                          : generatedResults[activeResultIndex].front
                      }
                      onClick={(url) => setPreviewImage(url)}
                    />
                  </div>

                  {/* SLIDER CONTROLS */}
                  {generatedResults.length > 1 && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeResultIndex === 0}
                        onClick={() => setActiveResultIndex((i) => Math.max(i - 1, 0))}
                      >
                        ←
                      </Button>
                      {generatedResults.map((result, index) => (
                        <button
                          key={result.clothingType}
                          onClick={() => setActiveResultIndex(index)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                            ${index === activeResultIndex
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-muted hover:border-blue-300"
                            }`}
                        >
                          {result.clothingType}
                        </button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeResultIndex === generatedResults.length - 1}
                        onClick={() => setActiveResultIndex((i) => Math.min(i + 1, generatedResults.length - 1))}
                      >
                        →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS — outside the card, always visible */}
            {generatedResults.length > 0 && !loading && (
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={handleAddToCartClick}
                  className="flex-1 h-12 border-4 border-black rounded-full font-black uppercase tracking-tighter text-sm hover:bg-black hover:text-white transition-all shadow-lg"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  className="flex-1 h-12 bg-black text-white rounded-full font-black uppercase tracking-tighter text-sm hover:bg-accent-neon-lime hover:text-black transition-all shadow-lg border-4 border-black"
                  onClick={handleBuyNow}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Buy Now
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Size Selection Modal */}
      {variantModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setVariantModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative z-10 bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-2xl w-full max-w-md p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Choose size</h3>
                <div className="text-xs font-bold text-black/40 uppercase tracking-widest mt-1">
                  Select a size for your designs
                </div>
              </div>
              <button
                onClick={() => setVariantModalOpen(false)}
                className="text-black hover:scale-110 transition-transform"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest mb-3 block text-black/40">
                  Size
                </Label>
                <Select
                  value={selectedSize}
                  onValueChange={(v) => setSelectedSize(v)}
                >
                  <SelectTrigger className="border-2 border-black h-12 rounded-xl font-bold">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent className="z-[101] border-2 border-black rounded-xl">
                    {AVAILABLE_SIZES.map((s) => (
                      <SelectItem key={s} value={s} className="font-bold">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={confirmAddToCart}
                className="w-full h-14 bg-black text-white rounded-full font-black uppercase tracking-tighter hover:bg-accent-neon-lime hover:text-black transition-all shadow-lg border-4 border-black"
              >
                Confirm & Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW POPUP */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={() => setPreviewImage(null)}
          />

          <div className="relative max-w-[90vw] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
            <img
              src={previewImage}
              alt="Design Preview"
              className="w-full h-full object-contain"
            />

            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 hover:scale-110 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>

      <Footer />
    </div>
  );
}

/* ---------------- Sub-Components ---------------- */

function UploadZone({ preview, onFileSelect, onRemove }: any) {
  return (
    <div className={`relative h-40 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden ${preview ? 'border-blue-500/50 bg-blue-50/5' : 'border-muted hover:border-blue-500/30'}`}>
      {preview ? (
        <>
          <img src={preview} alt="Upload" className="w-full h-full object-cover" />
          <button onClick={onRemove} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:scale-110 shadow-lg">
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors">
          <Upload className="w-5 h-5 text-muted-foreground mb-2" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Upload</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileSelect(e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}

function ResultView({ label, url, onClick, }: { label: string; url: string; onClick?: (url: string) => void; }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => {
            const link = document.createElement("a");
            link.href = url;
            link.download = `ai-design-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <Download className="w-4 h-4" />
        </Button>

      </div>
      <div className="aspect-[4/3] rounded-[2rem] overflow-hidden border shadow-lg bg-muted group/img relative">
        <img
          src={url}
          alt={label}
          onClick={() => onClick?.(url)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110 cursor-zoom-in"
        />
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors pointer-events-none" />
      </div>
    </div>
  );
}