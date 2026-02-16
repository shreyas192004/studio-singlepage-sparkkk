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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovableSupabase } from "@/integrations/supabase/lovableClient";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

type ClothingType = "t-shirt" | "polo" | "hoodie" | "tops" | "sweatshirt";

const CLOTHING_PRICES: Record<ClothingType, number> = {
  "t-shirt": 799,
  polo: 999,
  hoodie: 1499,
  tops: 899,
  sweatshirt: 1299,
};


const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function AIClothConverter() {

  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);


  type DesignSide = "front" | "back" | "both";
  const [designSide, setDesignSide] = useState<DesignSide>("both");

  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  // Input States
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [targetClothingTypes, setTargetClothingTypes] =
    useState<ClothingType[]>(["t-shirt"]);

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

  /* ---------------- Upload helper (Uses standard supabase) ---------------- */
  const uploadToStorage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(7)}-${Date.now()}.${fileExt}`;

    // FIX: Just use fileName. DO NOT use `ai-inputs/${fileName}`
    const path = fileName;

    const { error } = await supabase.storage
      .from("ai-inputs")
      .upload(path, file, {
        upsert: true,
        contentType: file.type
      });

    if (error) throw error;

    const { data } = supabase.storage.from("ai-inputs").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ---------------- Generate Handler ---------------- */
  const handleGenerate = async () => {
    if (!frontImage) return toast.error("Front image is required");
    if (instruction.trim().length < 10)
      return toast.error("Instruction must be at least 10 characters");
    if (targetClothingTypes.length === 0)
      return toast.error("Select at least one clothing type");

    setLoading(true);
    setGeneratedResults([]);

    try {
      // Upload images once
      const frontUrl = await uploadToStorage(frontImage);
      const backUrl = backImage ? await uploadToStorage(backImage) : null;

      const results: GeneratedResult[] = [];

      for (const clothingType of targetClothingTypes) {
        const { data, error } =
          await lovableSupabase.functions.invoke("convert-cloth-design", {
            body: {
              frontImageUrl: designSide !== "back" ? frontUrl : null,
              backImageUrl: designSide !== "front" ? backUrl || frontUrl : null,
              instruction,
              targetClothingType: clothingType,
              designSide,
            },

          });

        if (error) throw error;

        results.push({
          clothingType,
          front: data?.frontImageUrl || data?.imageUrl,
          back: data?.backImageUrl || null,
        });
      }

      // Upload generated images to storage and save to ai_generations for analytics
      const { data: { user } } = await supabase.auth.getUser();
      for (const item of results) {
        if (item.front && user) {
          try {
            let storedUrl = item.front;
            if (item.front.startsWith("data:")) {
              const imgRes = await fetch(item.front);
              const blob = await imgRes.blob();
              const fileName = `convert_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.png`;
              const { data: upData, error: upErr } = await supabase.storage
                .from("ai-designs").upload(fileName, blob, { contentType: "image/png", cacheControl: "3600" });
              if (!upErr && upData) {
                const { data: pubUrl } = supabase.storage.from("ai-designs").getPublicUrl(fileName);
                storedUrl = pubUrl.publicUrl;
              }
            }
            await supabase.from("ai_generations").insert({
              user_id: user.id,
              session_id: crypto.randomUUID(),
              image_url: storedUrl,
              prompt: instruction,
              style: "cloth-converter",
              color_scheme: "reference",
              clothing_type: item.clothingType,
              image_position: "front",
            });
          } catch (e) { console.warn("Failed to save generation:", e); }
        }
      }

      setGeneratedResults(results);
      toast.success("All designs generated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "AI Generation failed");
    } finally {
      setLoading(false);
    }
  };


  /* ---------------- Cart Logic ---------------- */
  const handleAddToCartClick = () => {
    if (!user) return toast.error("Please login to save your design");
    setVariantModalOpen(true);
  };

  const confirmAddToCart = () => {
    if (generatedResults.length === 0) return;

    generatedResults.forEach((item) => {
      addToCart({
        id: crypto.randomUUID(), // Generate proper UUID format
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
  const handleBuyNow = () => {
    // Check if user is logged in
    if (!user) {
      toast.error("Please login to proceed to checkout");
      return;
    }

    // Ensure at least one design is generated
    if (generatedResults.length === 0) {
      toast.error("Please generate a design first");
      return;
    }

    // Get the active result
    const activeResult = generatedResults[activeResultIndex];

    // Navigate to checkout with complete state
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
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#09090b] text-foreground">
      {/* Header */}
      <nav className="border-b bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">AI Design Studio</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Beta Version</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Pro Mode Active</span>
          </div>
        </div>
      </nav>
      <main className="max-w-[1400px] mx-auto p-6 lg:p-10">
        <div className="grid lg:grid-cols-[400px_1fr] gap-10">

          {/* LEFT: Controls */}
          <div className="space-y-8">
            <section className="space-y-1">
              <h2 className="text-2xl font-semibold">Reimagine Design</h2>
              <p className="text-sm text-muted-foreground">Upload concept and target clothing style.</p>
            </section>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-tighter font-bold text-muted-foreground">Front Reference</Label>
                  <UploadZone
                    preview={frontPreview}
                    onFileSelect={(f) => { setFrontImage(f); setFrontPreview(f ? URL.createObjectURL(f) : null); }}
                    onRemove={() => { setFrontImage(null); setFrontPreview(null); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-tighter font-bold text-muted-foreground">Back (Optional)</Label>
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
          <div className="relative group">
            <div className={`
              min-h-[600px] h-full rounded-[2.5rem] border border-muted-foreground/10 flex flex-col items-center justify-center p-8 transition-all duration-500
              ${loading ? 'bg-muted/20' : 'bg-white dark:bg-muted/5 shadow-2xl shadow-black/[0.02]'}
            `}>
              {generatedResults.length === 0 && !loading && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-border shadow-inner">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">Ready for Innovation</h3>
                  <p className="text-sm text-muted-foreground max-w-[240px]">
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
                <div className="w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">

                  {/* ACTIVE IMAGE */}
                  <div className="w-full max-w-md">
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
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      disabled={activeResultIndex === 0}
                      onClick={() =>
                        setActiveResultIndex((i) => Math.max(i - 1, 0))
                      }
                    >
                      ←
                    </Button>

                    {generatedResults.map((result, index) => (
                      <button
                        key={result.clothingType}
                        onClick={() => setActiveResultIndex(index)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition
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
                      disabled={activeResultIndex === generatedResults.length - 1}
                      onClick={() =>
                        setActiveResultIndex((i) =>
                          Math.min(i + 1, generatedResults.length - 1)
                        )
                      }
                    >
                      →
                    </Button>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleAddToCartClick}
                      disabled={generatedResults.length === 0}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add All to Cart
                    </Button>

                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleBuyNow}
                      disabled={generatedResults.length === 0}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
          <div className="relative z-10 bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Choose size</h3>
                <div className="text-sm text-muted-foreground">
                  Select a size for your designs
                </div>
              </div>
              <button
                onClick={() => setVariantModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Size
                </Label>
                <Select
                  value={selectedSize}
                  onValueChange={(v) => setSelectedSize(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent className="z-[101]">
                    {AVAILABLE_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={confirmAddToCart}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Add to Cart
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
      <div className="aspect-[3/4] rounded-[2rem] overflow-hidden border shadow-lg bg-muted group/img relative">
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