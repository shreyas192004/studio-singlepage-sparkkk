// src/pages/AIGenerator.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  User,
  ShoppingCart,
  Heart,
  Sparkles,
  Loader2,
  X,
  Eye,
  SlidersHorizontal,
  LogOut,
  Code2,
  CloudLightning,
  Download,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { CartSidebar } from "@/components/CartSidebar";
import { AuthDialog } from "@/components/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Logo from "../../public/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { lovableSupabase } from "@/integrations/supabase/lovableClient";

/* ---------- constants & small helpers ---------- */
const PRODUCT_WORDS = ["T-Shirt", "Hoodie", "POLO", "Top"];
const FREE_USER_LIMIT = 2;
const AUTHENTICATED_USER_LIMIT = 20;

const baseClass = "fixed inset-0 z-[10000] flex items-center justify-center p-4";

/* ---------- rotating words component (unchanged) ---------- */
const SlideRotatingWords = ({ words, ms = 2000 }: { words: string[]; ms?: number }) => {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fade = 300;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((n) => (n + 1) % words.length);
        setVisible(true);
      }, fade);
    }, ms);
    return () => clearInterval(id);
  }, [words.length, ms]);

  return (
    <span
      style={{
        transition: "opacity 300ms ease, transform 300ms ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-6px)",
        display: "inline-block",
      }}
      className="font-semibold"
    >
      {words[i]}
    </span>
  );
};

/* ---------- Portal modal that stays open ---------- */
type PortalModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
};

function PortalModal({
  open,
  onClose,
  children,
  label = "modal",
}: PortalModalProps) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div className={baseClass} role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-md bg-card rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

/* ---------- Inline special modals (Login + Limit) ---------- */
function LoginRequiredModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <PortalModal
      open={open}
      onClose={onClose}
      label="login-required"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Login Required</h3>
          <div className="text-sm text-muted-foreground">Please login or create an account to generate AI designs.</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You need to be signed in to continue. You can sign in or create an account.
        </p>
        <div className="flex gap-3">
          <Link to="/auth" className="flex-1">
            <Button className="w-full bg-sale-blue">Sign in / Sign up</Button>
          </Link>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </PortalModal>
  );
}

function GenerationLimitModal({
  open,
  onClose,
  generationCount,
  limit,
}: {
  open: boolean;
  onClose: () => void;
  generationCount: number;
  limit: number;
}) {
  const navigate = useNavigate();

  return (
    <PortalModal open={open} onClose={onClose} label="generation-limit">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Generation Limit Reached</h3>
          <div className="text-sm text-muted-foreground">
            You have used {generationCount} of {limit} free generations.
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Place an order to continue generating more custom designs.
        </p>

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-sale-blue"
            onClick={() => {
              onClose();
              navigate("/");
            }}
          >
            Place Order
          </Button>

          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </PortalModal>
  );
}

/* ---------- types, base images, prices ---------- */
type ClothingType =
  | "t-shirt"
  // | "polo"
  | "hoodie"
  // | "pullover"
  | "oversized-tshirt"
  | "sweatshirt";

type ImagePosition = "front" | "back";

const BASE_IMAGES: Record<string, { front?: string; back?: string }> = {
  "t-shirt": { front: "/t-shirtFront.jpg", back: "/t-shirtBack.jpg" },
  hoodie: { front: "/hoodieFront.jpg", back: "/hoodieBack.jpg" },
  // polo: { front: "/poloBack.jpg", back: "/poloBack.jpg" },
  // tops: { front: "/topFront.jpg", back: "/topFront.jpg" },
  "oversized-tshirt": { front: "/t-shirtFront.jpg", back: "/t-shirtBack.jpg" }, // Using t-shirt images as fallback
  sweatshirt: { front: "/sweatshirtFront.png", back: "/sweatshirtBack.png" },
};

// 🎯 Unified centered positioning for all apparel types
// widthPct: 35 for all (consistent design size)
// leftPct: 32-33 (horizontally centered)
// topPct: 32-35 (vertically centered on chest area)
const OVERLAY_PRESETS: Record<
  string,
  {
    front?: { widthPct: number; leftPct: number; topPct: number; rotate?: number };
    back?: { widthPct: number; leftPct: number; topPct: number; rotate?: number };
  }
> = {
  "t-shirt": {
    front: { widthPct: 35, leftPct: 32, topPct: 32 },
    back: { widthPct: 35, leftPct: 32, topPct: 32 },
  },
  hoodie: {
    front: { widthPct: 35, leftPct: 32, topPct: 35 },
    back: { widthPct: 35, leftPct: 32, topPct: 35 },
  },
  // polo: {
  //   back: { widthPct: 35, leftPct: 32, topPct: 33, rotate: 0 },
  // },
  "oversized-tshirt": {
    front: { widthPct: 35, leftPct: 32, topPct: 32 },
    back: { widthPct: 35, leftPct: 32, topPct: 32 },
  },
  sweatshirt: {
    front: { widthPct: 35, leftPct: 32, topPct: 35 },
    back: { widthPct: 35, leftPct: 32, topPct: 35 },
  },
  tops: {
    front: { widthPct: 35, leftPct: 32, topPct: 40 },
  },

};

// 💰 Clothing prices per type
const CLOTHING_PRICES: Record<ClothingType, number> = {
  "t-shirt": 799,
  hoodie: 1499,
  // polo: 999,
  // pullover: 1299,
  "oversized-tshirt": 999,
  sweatshirt: 1299,
};


export default function AIGenerator() {
  const [searchParams] = useSearchParams();
  const { cartCount, addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [colorScheme, setColorScheme] = useState("normal");
  const [aspectRatio, setAspectRatio] = useState<"square" | "portrait" | "landscape">("square");
  const [quality, setQuality] = useState<"standard" | "high" | "ultra">("high");
  const [creativity, setCreativity] = useState(70);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [artworkImage, setArtworkImage] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [designText, setDesignText] = useState("");
  const [designRecord, setDesignRecord] = useState<any | null>(null);

  // const [showSurvey, setShowSurvey] = useState(false);
  // const [surveyCompleted, setSurveyCompleted] = useState(false);
  // const [surveyData, setSurveyData] = useState({
  //   preferredStyle: "",
  //   preferredColorScheme: "",
  //   preferredClothingType: "",
  // });

  const [clothingType, setClothingType] = useState<ClothingType>("t-shirt");
  const [imagePosition, setImagePosition] = useState<ImagePosition>("front");
  const [showLargeModal, setShowLargeModal] = useState(false);

  // Controlled modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const { user, signOut } = useAuth();

  // Variant modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantAction, setVariantAction] = useState<"cart" | "wishlist" | null>(null);
  // const [availableSizes] = useState(["XS", "S", "M", "L", "XL", "XXL"]);
  const [availableColors] = useState(["Black", "White", "Navy Blue", "Pastel Pink"]);
  const [selectedSize, setSelectedSize] = useState<string | null>("M");
  const [selectedColor, setSelectedColor] = useState<string | null>("Black");
  const [customNote, setCustomNote] = useState("");

  type SizeCategory = "Men" | "Women" | "Kids";

  const sizeMap: Record<SizeCategory, string[]> = {
    Men: ["S", "M", "L", "XL", "XXL"],
    Women: ["XS", "S", "M", "L", "XL"],
    Kids: ["XS", "S"],
  };

  const [sizeCategory, setSizeCategory] = useState<SizeCategory>("Men");

  const navigate = useNavigate();

  const currentPrice = CLOTHING_PRICES[clothingType];

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  useEffect(() => {
    const urlPrompt = searchParams.get("prompt");
    if (urlPrompt) setPrompt(urlPrompt);

    const savedCount = localStorage.getItem("generation_count");
    if (savedCount) setGenerationCount(parseInt(savedCount, 10));


    const checkUserStats = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("user_generation_stats")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!error && data) {
            setGenerationCount(data.generation_count);
          } else {
            await supabase.from("user_generation_stats").insert({
              user_id: user.id,
              generation_count: 0,
              has_purchased: false,
            } as any);
          }
        } catch (err) {
          console.error("Error fetching user stats:", err);
        }
      }
    };

    checkUserStats();
  }, [searchParams, user]);

  useEffect(() => {
    if ((clothingType as string) === "polo") setImagePosition("back");
    else if ((clothingType as string) === "tops") setImagePosition("front");
    else {
      if (!["front", "back"].includes(imagePosition)) setImagePosition("front");
    }
  }, [clothingType, imagePosition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLargeModal(false);
    };
    if (showLargeModal) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLargeModal]);

  const handleGenerate = async () => {
    if (isGenerating) return;

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (generationCount >= AUTHENTICATED_USER_LIMIT) {
      setShowLimitModal(true);
      return;
    }

    const trimmedPrompt = prompt.trim();
    const trimmedText = designText.trim();

    if (!trimmedPrompt) {
      toast.error("Please enter a design description");
      return;
    }

    if (trimmedPrompt.length < 10) {
      toast.error("Prompt must be at least 10 characters");
      return;
    }

    if (trimmedPrompt.length > 500) {
      toast.error("Prompt must be under 500 characters");
      return;
    }

    // Validation removed for size/color as they are selected after generation


    setIsGenerating(true);
    setGeneratedImage(null);
    setArtworkImage(null);
    setIsFlipped(false);
    setDesignRecord(null);

    try {
      // 🔒 NORMALIZE VALUES TO MATCH BACKEND ZOD
      // 🔒 MAP FRONTEND TYPES TO BACKEND SUPPORTED TYPES
      const safeClothingTypeMap: Record<string, string> = {
        "t-shirt": "t-shirt",
        "polo": "polo",
        "hoodie": "hoodie",
        "sweatshirt": "sweatshirt",

        // 👇 MAP UNSUPPORTED TO CLOSEST MATCH
        "pullover": "sweatshirt",
        "oversized-tshirt": "t-shirt",
        "tops": "tops",
      };

      const safeClothingType =
        safeClothingTypeMap[clothingType] || "t-shirt";


      const safeImagePosition = imagePosition === "back" ? "back" : "front";

      const safeStyle = [
        "modern", "vintage", "minimalist", "abstract", "retro",
        "graffiti", "anime", "geometric", "organic", "grunge", "realistic"
      ].includes(style)
        ? style
        : "realistic";

      const safeColorScheme = [
        "normal", "vibrant", "pastel", "monochrome", "neon",
        "earth-tones", "black-white", "cool", "warm", "gradient"
      ].includes(colorScheme)
        ? colorScheme
        : "normal";

      console.log("SAFE PAYLOAD:", {
        prompt: trimmedPrompt,
        style: safeStyle,
        colorScheme: safeColorScheme,
        quality,
        creativity,
        clothingType: safeClothingType,
        imagePosition: safeImagePosition,
        color: selectedColor,
        text: trimmedText,
      });

      const { data, error } = await lovableSupabase.functions.invoke(
        "generate-tshirt-design",
        {
          body: {
            prompt: trimmedPrompt,
            style: safeStyle,
            colorScheme: safeColorScheme,
            quality,
            creativity,
            clothingType: safeClothingType,
            imagePosition: safeImagePosition,
            color: selectedColor?.toLowerCase() || "black",
            text: trimmedText || undefined,
          },
        }
      );

      if (error) {
        // Try to extract the error message from the edge function response
        let msg = "Generation failed. Please try again.";
        try {
          const errBody = (error as any)?.context ? await (error as any).context.json?.() : null;
          if (errBody?.error) msg = errBody.error;
        } catch { /* ignore parse errors */ }
        if (data?.error) msg = data.error;
        throw new Error(msg);
      }
      // Edge function returned 200 but with an error message (soft fail for content issues)
      if (data?.error) {
        toast.info(data.error);
        return;
      }
      if (!data?.imageUrl) throw new Error("No image returned — please try a different prompt");

      setGeneratedImage(data.imageUrl);
      setArtworkImage(data.artworkUrl || null);
      setIsFlipped(false); // Always show mockup first after new generation

      // ---------------------------------------------------------
      // 💾 CLIENT-SIDE PERSISTENCE (Bypass Edge Function DB insert)
      // ---------------------------------------------------------
      const { data: insertedRecord, error: insertError } = await supabase
        .from("ai_generations")
        .insert({
          user_id: user.id,
          session_id: crypto.randomUUID(), // tracking session
          image_url: data.imageUrl,
          prompt: trimmedPrompt,
          style: safeStyle,
          color_scheme: safeColorScheme,
          clothing_type: safeClothingType,
          image_position: safeImagePosition,
          included_text: trimmedText || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to save generation to DB:", insertError);
        toast.error("Image generated but failed to save to history.");
      } else {
        console.log("Design saved to DB:", insertedRecord);
        setDesignRecord(insertedRecord);
        toast.success("Design generated and saved!");
      }

      const newCount = generationCount + 1;
      setGenerationCount(newCount);

      if (user) {
        await supabase
          .from("user_generation_stats")
          .upsert(
            { user_id: user.id, generation_count: newCount } as any,
            { onConflict: "user_id" }
          );
      } else {
        localStorage.setItem("generation_count", newCount.toString());
      }

      setDesignText("");
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(err?.message || "Failed to generate design");
    } finally {
      setIsGenerating(false);
    }
  };


  // -------------------
  // Helpers for saving design -> product
  // -------------------
  const uploadImageToStorage = async (imageUrl: string) => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("Failed to fetch generated image for upload");
      const blob = await res.blob();

      const filename = `ai_${user?.id ?? "anon"}_${Date.now()}.png`;
      const bucket = "ai-designs";
      const path = `${filename}`;

      const upload = await supabase.storage.from(bucket).upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: blob.type || "image/png",
      });

      if (upload.error) {
        throw upload.error;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      if (!urlData?.publicUrl) throw new Error("Failed to get public URL");

      return { publicUrl: urlData.publicUrl, path };
    } catch (err: any) {
      console.error("uploadImageToStorage error:", err);
      throw err;
    }
  };

  const createProductFromDesign = async (
    imageUrl: string,
    payload: {
      title?: string;
      description?: string;
      price?: number;
      ai_generation_id?: any;
      selected_size?: string | null;
      selected_color?: string | null;
    }
  ) => {
    try {
      const { publicUrl, path } = await uploadImageToStorage(imageUrl);

      const sku = `AI-${Date.now()}`;
      const title = payload.title ?? `AI Generated Design`;
      const description =
        payload.description ??
        `AI-generated design. Prompt: ${prompt.slice(0, 120)}`;
      const price = payload.price ?? currentPrice;
      const images = [publicUrl];

      const productInsertRow: any = {
        sku,
        title,
        description,
        price,
        compare_at_price: null,
        currency: "INR",
        images,
        images_generated_by_users: 0,
        category: "AI Generated",
        sub_category: null,
        tags: [],
        colors: payload.selected_color ? [payload.selected_color] : [],
        sizes: payload.selected_size ? [payload.selected_size] : [],
        material: null,
        brand: null,
        designer_id: null,
        inventory: { total: 1, bySize: {} },
        weight: null,
        dimensions: null,
        created_by: user?.id ?? null,
        visibility: "public",
        structured_card_data: null,
        filter_requirements: null,
        popularity: 0,
        date_added: new Date().toISOString(),
        clothing_type: clothingType,
        image_position: imagePosition,
        ai_generation_id: payload.ai_generation_id ?? null,
        is_ai_generated: true,
      };

      const { data: product, error } = await supabase
        .from("products")
        .insert(productInsertRow as any)
        .select("*")
        .single();

      if (error) {
        console.error("createProductFromDesign insert error:", error);
        throw error;
      }

      return { product, storagePath: path, publicUrl };
    } catch (err) {
      console.error("createProductFromDesign error:", err);
      throw err;
    }
  };

  // -------------------
  // New flows: Add to cart / wishlist / buy
  // -------------------
  const handleAddToCart = async () => {
    if (!generatedImage) return toast.error("No design to add to cart");
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setVariantAction("cart");
    setVariantModalOpen(true);
  };


  const handleConfirmVariant = async () => {
    if (!generatedImage) return toast.error("No design to save");
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setVariantModalOpen(false);
    const payload = {
      title: `AI Design — ${prompt.slice(0, 30)}`,
      description: `AI design | Prompt: ${prompt}`,
      price: currentPrice,
      ai_generation_id: designRecord?.id ?? null,
      selected_size: selectedSize,
      selected_color: selectedColor,
      note: customNote, // Pass note to payload if needed by referenced function
    };

    try {
      toast.loading("Saving design and creating product...");
      const { product } = await createProductFromDesign(
        generatedImage,
        payload as any
      );

      if (variantAction === "cart") {
        addToCart({
          id: product.id,
          name: product.title,
          price: product.price,
          image: (product.images && product.images[0]) || generatedImage,
          quantity: 1,
          size: selectedSize,
          color: selectedColor,
          clothing_type: clothingType,
          is_ai_generated: true,
          note: customNote,
        } as any);
        toast.success("Added custom design to cart");
      } else if (variantAction === "wishlist") {
        addToWishlist({
          id: product.id,
          name: product.title,
          price: product.price,
          image: (product.images && product.images[0]) || generatedImage,
        } as any);
        toast.success("Added design to wishlist");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save design");
    } finally {
      toast.dismiss();
      setVariantAction(null);
      setSelectedSize("M");
      setSelectedColor("Black");
      setCustomNote("");
    }
  };

  const handleBuy = async () => {
    if (!generatedImage) return toast.error("Generate a design before buying.");
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const designData = {
      imageUrl: generatedImage,
      prompt,
      style,
      colorScheme,
      clothingType,
      imagePosition,
      price: currentPrice,
      ai_generation_id: designRecord?.id ?? null,
    };
    sessionStorage.setItem("ai_design_data", JSON.stringify(designData));

    navigate("/checkout-ai", {
      state: {
        ...designData,
        productId: null,
      },
    });
  };

  /* ---------- preview helpers ---------- */
  const baseImageSrc = (() => {
    const mapping = BASE_IMAGES[clothingType];
    if (!mapping) return "/t-shirtFront.jpg";
    return (imagePosition === "back" ? mapping.back : mapping.front) ?? mapping.front;
  })();

  const overlayPreset =
    OVERLAY_PRESETS[clothingType]?.[imagePosition] ??
    OVERLAY_PRESETS[clothingType]?.front ?? {
      widthPct: 55,
      leftPct: 22,
      topPct: 20,
    };

  //   const MockupPreview = () => (
  //     <div
  //       className="
  //       bg-card rounded-2xl p-4 shadow-md border border-border

  //       /* 📱 Mobile: fixed under header */
  //       fixed top-[64px] left-0 right-0 mx-auto
  //       w-[94vw] max-w-[420px]
  //       z-30

  //       /* 💻 Desktop: sticky sidebar */
  //       lg:static
  //       lg:sticky lg:top-24
  //       lg:w-full
  //       lg:max-w-none
  //       lg:z-auto
  //     "
  //     >




  //       <div className="flex items-start justify-between gap-4 mb-4">
  //         <div>
  //           <h2 className="text-lg font-semibold">Design Preview</h2>
  //           <div className="text-sm text-muted-foreground">
  //             See How Your Design Looks
  //           </div>
  //         </div>
  //         {generatedImage && (
  //           <Button
  //             onClick={() => setShowLargeModal(true)}
  //             variant="ghost"
  //             size="sm"
  //             className="flex items-center gap-2"
  //           >
  //             <Eye className="w-4 h-4" />
  //             <span className="hidden sm:inline text-sm">Preview</span>
  //           </Button>
  //         )}
  //       </div>

  //       <div
  //   className="
  //     relative
  //     w-full
  //     min-h-[600px]
  //     h-full
  //     rounded-[2.5rem]
  //     border
  //     border-muted-foreground/10
  //     bg-white
  //     dark:bg-muted/5
  //     shadow-2xl
  //     shadow-black/[0.02]
  //     overflow-hidden
  //     flex
  //     items-center
  //     justify-center
  //     p-6
  //   "
  // >

  //         <img
  //           src={baseImageSrc}
  //           alt={`${clothingType} mockup ${imagePosition}`}
  //           className="absolute inset-0 w-full h-full object-cover"
  //           draggable={false}
  //         />

  //         {generatedImage ? (
  //           <img
  //             src={generatedImage}
  //             alt="generated design overlay"
  //             className="absolute cursor-pointer transition-transform duration-150 hover:scale-105"
  //             style={{
  //               width: `${overlayPreset.widthPct}%`,
  //               left: `${overlayPreset.leftPct}%`,
  //               top: `${overlayPreset.topPct}%`,
  //               transform: `rotate(${overlayPreset.rotate ?? 0}deg)`,
  //               objectFit: "contain",
  //             }}
  //             draggable={false}
  //             crossOrigin="anonymous"
  //             onClick={() => setShowLargeModal(true)}
  //           />
  //         ) : (
  //           <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6">
  //             <Sparkles className="w-12 h-12 mb-3 opacity-60" />
  //             <p className="text-center">
  //               Start with one idea,{" "}
  //               <span className="font-semibold">anything works</span>
  //             </p>
  //           </div>
  //         )}
  //       </div>

  //       {generatedImage && (
  //         <div className="mt-4 flex items-center gap-3">
  //           <Button
  //             onClick={handleAddToCart}
  //             variant="outline"
  //             size="sm"
  //             className="flex items-center gap-2"
  //           >
  //             <ShoppingCart className="w-4 h-4" />
  //             <span className="sr-only">Add to cart</span>
  //           </Button>

  //           <Button
  //             onClick={handleBuy}
  //             className="ml-auto bg-sale-blue hover:bg-sale-blue/95 text-white font-semibold py-2 px-4"
  //           >
  //             Buy
  //           </Button>

  //           <Button
  //             variant="ghost"
  //             size="sm"
  //             onClick={handleGenerate}
  //             className="text-muted-foreground"
  //           >
  //             Regenerate
  //           </Button>
  //         </div>
  //       )}

  //       {!user && generationCount > 0 && (
  //         <div className="mt-4 text-center text-sm text-muted-foreground">
  //           {generationCount}/{FREE_USER_LIMIT} free generations used
  //         </div>
  //       )}
  //     </div>
  //   );

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-[60] bg-primary/90 text-primary-foreground backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg md:text-xl font-bold tracking-wider">
              <img
                className="w-24 h-10 object-contain cursor-pointer"
                src={Logo}
                alt="Tesora Logo"
              />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="hover:text-accent transition">
                Shop
              </Link>
              <Link to="/ai-generator" className="hover:text-accent transition">
                AI Generator
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-md hover:bg-muted/60 transition">
                <Search className="w-4 h-4" />
              </button>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-md hover:bg-primary-foreground/6">
                      <User className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-background border border-border"
                  >
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/ai-generator" className="cursor-pointer">
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        AI Generator
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/auth"
                  className="p-2 rounded-md hover:bg-primary-foreground/6"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}

              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-md hover:bg-muted/60 transition"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {cartCount}
                  </span>
                )}
              </button>
              <Link to="/wishlist">
                <Button variant="ghost" size="icon">
                  <Heart className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-sale-blue text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-4 h-4" />
              Your Design Assistant
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Design Your Own{" "}
              <span className="text-sale-blue">
                <SlideRotatingWords words={PRODUCT_WORDS} ms={2000} />
              </span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Minimal, fast, and focused — design prints for apparel using AI.
            </p>
          </header>

          <div className="grid lg:grid-cols-2 gap-8 items-start">


            <section className="space-y-6 order-2 lg:order-1 relative z-50">

              <form
                className="bg-card rounded-2xl p-6 shadow-sm border border-border"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerate();
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-semibold">Bring your idea to life</h2>
                  <Link to="/ai-cloth-converter">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <CloudLightning className="w-4 h-4" />
                      <span className="hidden sm:inline text-sm">Hidden Feature</span>
                    </Button>
                  </Link>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="prompt"
                      className="text-sm font-semibold mb-2 block"
                    >
                      How Do You Want Your Design ?
                    </Label>
                    <Textarea
                      id="prompt"
                      placeholder={`• Minimal Tiger in Black & Gold
• Check our Prompt Library on our Instagram Page for ideas`}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />

                  </div>

                  <div>
                    <Label
                      htmlFor="designText"
                      className="text-sm font-semibold mb-2 block"
                    >
                      Add Words or Quotes Here{" "}
                      <span className="text-muted-foreground text-xs">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="designText"
                      placeholder={`• Live Loud • Kaleshi Aurat • Main character Energy • Main Apni Favourite Hoon`}
                      value={designText}
                      onChange={(e) => setDesignText(e.target.value)}
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This Text Will Be Included In The Design.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        Your Vibe
                      </Label>
                      <Select value={style} onValueChange={setStyle}>
                        <SelectTrigger id="style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">Modern</SelectItem>
                          <SelectItem value="vintage">Vintage</SelectItem>
                          <SelectItem value="minimalist">Minimalist</SelectItem>
                          <SelectItem value="abstract">Abstract</SelectItem>
                          <SelectItem value="retro">Retro</SelectItem>
                          <SelectItem value="graffiti">Graffiti</SelectItem>
                          <SelectItem value="anime">Anime</SelectItem>
                          <SelectItem value="geometric">Geometric</SelectItem>
                          <SelectItem value="organic">Organic</SelectItem>
                          <SelectItem value="grunge">Grunge</SelectItem>
                          <SelectItem value="realistic">Realistic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        Color Mood
                      </Label>
                      <Select
                        value={colorScheme}
                        onValueChange={setColorScheme}
                      >
                        <SelectTrigger id="colorScheme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="vibrant">Vibrant</SelectItem>
                          <SelectItem value="pastel">Pastel</SelectItem>
                          <SelectItem value="monochrome">
                            Monochrome
                          </SelectItem>
                          <SelectItem value="neon">Neon</SelectItem>
                          <SelectItem value="earth-tones">
                            Earth Tones
                          </SelectItem>
                          <SelectItem value="black-white">
                            Black & White
                          </SelectItem>
                          <SelectItem value="cool">Cool Tones</SelectItem>
                          <SelectItem value="warm">Warm Tones</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* ----- PRODUCT CONTROLS: ALWAYS VISIBLE ----- */}
                <div className="space-y-6 pt-6 border-t border-border mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Customize Your Product</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        Select Apparel Type
                      </Label>
                      <Select
                        value={clothingType}
                        onValueChange={(val) =>
                          setClothingType(val as ClothingType)
                        }
                      >
                        <SelectTrigger id="clothingType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="t-shirt">Classic T-Shirt</SelectItem>
                          {/* <SelectItem value="polo">Polo T-Shirt</SelectItem> */}
                          <SelectItem value="hoodie">Hoodie</SelectItem>
                          {/* <SelectItem value="pullover">Pullover</SelectItem> */}
                          <SelectItem value="oversized-tshirt">Oversized Tshirt</SelectItem>
                          <SelectItem value="sweatshirt">
                            Sweatshirt
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {/* 💰 Show price for selected clothing */}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Price: <span className="font-semibold">₹{currentPrice} (No Hidden Charges)</span>
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        Design Placement
                      </Label>
                      <Select
                        value={imagePosition}
                        onValueChange={(val) => {
                          if (val === "front-back") {
                            navigate("/ai-cloth-converter");
                            return;
                          }

                          setImagePosition(val as ImagePosition);
                        }}
                      >
                        <SelectTrigger id="imagePosition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(clothingType === "t-shirt" ||
                            clothingType === "hoodie" ||
                            clothingType === "sweatshirt") && (
                              <>
                                <SelectItem value="front">Front</SelectItem>
                                <SelectItem value="back">Back</SelectItem>
                                <SelectItem value="front-back">Front & Back</SelectItem>
                              </>
                            )}
                          {(clothingType as string) === "polo" && (
                            <SelectItem value="back">Back</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        Size Category
                      </Label>
                      <Select
                        value={sizeCategory}
                        onValueChange={(category: SizeCategory) => {
                          setSizeCategory(category);
                          // Reset to first available size in the new category
                          const newSizes = sizeMap[category];
                          if (newSizes.length > 0) {
                            setSelectedSize(newSizes[0]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Men">Men</SelectItem>
                          <SelectItem value="Women">Women</SelectItem>
                          <SelectItem value="Kids">Kids</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">
                        Size
                      </Label>
                      <Select
                        value={selectedSize ?? undefined}
                        onValueChange={(v) => setSelectedSize(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {sizeMap[sizeCategory].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">

                    <div className="sm:col-span-2">
                      <Label className="text-sm font-semibold mb-2 block">
                        Color
                      </Label>
                      <Select
                        value={selectedColor ?? undefined}
                        onValueChange={(v) => setSelectedColor(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full bg-sale-blue hover:bg-sale-blue/90 text-white font-bold py-4 text-base"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create My Outift
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>



              <div className="bg-muted rounded-2xl p-5 text-sm text-muted-foreground space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Want a Better First Design?</h3>
                  <ul className="space-y-2 list-none">
                    <li>• Be Descriptive - Mention objects, colours or mood.</li>
                    <li>• Add Text only if you want words in design.</li>
                    <li>•  Try different Vibes and Moods for fresher looks.</li>
                    <li>• Don't forget to wishlist.</li>
                    <li>• We design it to look good when worn.</li>
                    <li>• You can generate as many times you want before buying.</li>
                  </ul>
                </div>
              </div>

            </section>

            {/* <aside className="order-1 lg:order-2">
              <MockupPreview />
            </aside> */}

            <aside className="order-1 lg:order-2">
              <div className="min-h-[650px] h-full rounded-[2.5rem] border border-muted-foreground/10 flex flex-col items-center justify-center p-8 bg-white dark:bg-muted/5 shadow-2xl shadow-black/[0.02]">

                {/* LOADING ANIMATION */}
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
                    <div className="relative w-24 h-24">
                      {/* Outer spinning ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-muted animate-spin" style={{ borderTopColor: 'hsl(var(--sale-blue))', animationDuration: '1.5s' }} />
                      {/* Inner pulsing circle */}
                      <div className="absolute inset-3 rounded-full bg-sale-blue/10 animate-pulse flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-sale-blue animate-bounce" style={{ animationDuration: '1.8s' }} />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-semibold text-foreground">Creating your design...</p>
                      <p className="text-xs text-muted-foreground max-w-[250px]">
                        Our AI is crafting a unique mockup just for you. This usually takes 15–30 seconds ✨
                      </p>
                    </div>
                    {/* Animated progress dots */}
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-sale-blue/60 animate-pulse"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* EMPTY STATE */}
                {!generatedImage && !isGenerating && (
                  <div className="text-center space-y-4">
                    <Sparkles className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Generate a design to see preview
                    </p>
                  </div>
                )}

                {/* FLIP CARD PREVIEW */}
                {generatedImage && !isGenerating && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                    
                    {/* Preview container */}
                    <div
                      className="relative w-full max-w-[520px] aspect-[3/4] rounded-2xl overflow-hidden shadow-xl bg-muted/20 group cursor-pointer"
                      onClick={() => setShowLargeModal(true)}
                    >
                      {/* Mockup image - always visible */}
                      <img
                        src={generatedImage}
                        alt="AI Generated Mockup"
                        className="absolute inset-0 w-full h-full object-contain transition-all duration-700"
                        style={{
                          opacity: isFlipped ? 0 : 1,
                          transform: isFlipped ? "scale(0.95)" : "scale(1)",
                        }}
                        crossOrigin="anonymous"
                      />

                      {/* Artwork zoom - shown when "View Artwork" is active */}
                      {artworkImage && (
                        <img
                          src={artworkImage}
                          alt="Isolated Artwork"
                          className="absolute inset-0 w-full h-full object-contain p-4 transition-all duration-700"
                          style={{
                            opacity: isFlipped ? 1 : 0,
                            transform: isFlipped ? "scale(1)" : "scale(0.7)",
                          }}
                          crossOrigin="anonymous"
                        />
                      )}

                      {!artworkImage && isFlipped && (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-white">
                          <p className="text-sm">Artwork not available</p>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                      <div className="absolute top-3 left-3 bg-card/80 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full border border-border">
                        {isFlipped ? "🎨 Print-Ready Artwork" : "👕 Mockup Preview"}
                      </div>
                    </div>

                    {/* CONTROLS */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-700 delay-300">
                      {/* Flip button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="shadow-sm border"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(!isFlipped);
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {isFlipped ? "View Mockup" : "View Artwork"}
                      </Button>

                      {/* Download */}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="shadow-sm border"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = isFlipped && artworkImage ? artworkImage : generatedImage;
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `ai-${isFlipped ? "artwork" : "mockup"}-${Date.now()}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {isFlipped ? "Download Artwork" : "Download Mockup"}
                      </Button>

                      <Button variant="outline" size="sm" onClick={() => setShowLargeModal(true)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                )}


                {generatedImage && !isGenerating && (
                  <div className="flex gap-4 pt-6">
                    <Button variant="outline" onClick={handleAddToCart}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>

                    <Button className="bg-sale-blue" onClick={handleBuy}>
                      Buy Now
                    </Button>
                  </div>
                )}
              </div>
            </aside>

          </div>
        </div>
      </main >

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Variant modal for selecting size/color before saving product */}
      {
        variantModalOpen && (
          <div className="fixed inset-0 z-[10000000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setVariantModalOpen(false)}
            />

            <div className="relative z-10 bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Choose size & color</h3>
                  <div className="text-sm text-muted-foreground">
                    Select a size and color for your product
                  </div>
                </div>
                <button
                  onClick={() => setVariantModalOpen(false)}
                  className="text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 ">
                <div>
                  <Label className="text-sm font-semibold mb-2 block z-[10000000]">
                    Size Category
                  </Label>
                  <Select
                    value={sizeCategory}
                    onValueChange={(category: SizeCategory) => {
                      setSizeCategory(category);
                      // Reset to first available size in the new category
                      const newSizes = sizeMap[category];
                      if (newSizes.length > 0) {
                        setSelectedSize(newSizes[0]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[10000001]">
                      <SelectItem value="Men">Men</SelectItem>
                      <SelectItem value="Women">Women</SelectItem>
                      <SelectItem value="Kids">Kids</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block z-[10000000]">
                    Size
                  </Label>
                  <Select
                    value={selectedSize ?? undefined}
                    onValueChange={(v) => setSelectedSize(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000001]">
                      {sizeMap[sizeCategory].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block ">
                    Color
                  </Label>
                  <Select
                    value={selectedColor ?? undefined}
                    onValueChange={(v) => setSelectedColor(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent className="z-[10000001]">
                      {availableColors.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-sm font-semibold mb-2 block">
                  Add a Note <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  placeholder="Special instructions or details..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setVariantModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-sale-blue"
                  onClick={handleConfirmVariant}
                >
                  Confirm & Save
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* {showSurvey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                localStorage.setItem("survey_completed", "true");
                setShowSurvey(false);
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-4">
              <div className="w-10 h-10 bg-sale-blue/10 rounded-full flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-sale-blue" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                Help us personalize
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose a few preferences to improve recommendations.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Preferred Style
                </Label>
                <Select
                  value={surveyData.preferredStyle}
                  onValueChange={(val) =>
                    setSurveyData({ ...surveyData, preferredStyle: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="z-[99990]">
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                    <SelectItem value="retro">Retro</SelectItem>
                    <SelectItem value="graffiti">Graffiti</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                    <SelectItem value="geometric">Geometric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Preferred Colors
                </Label>
                <Select
                  value={surveyData.preferredColorScheme}
                  onValueChange={(val) =>
                    setSurveyData({
                      ...surveyData,
                      preferredColorScheme: val,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="z-[99990]">
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                    <SelectItem value="pastel">Pastel</SelectItem>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                    <SelectItem value="neon">Neon</SelectItem>
                    <SelectItem value="earth-tones">Earth Tones</SelectItem>
                    <SelectItem value="black-white">
                      Black & White
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Preferred Clothing
                </Label>
                <Select
                  value={surveyData.preferredClothingType}
                  onValueChange={(val) =>
                    setSurveyData({
                      ...surveyData,
                      preferredClothingType: val,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="z-[99990]">
                    <SelectItem value="t-shirt">T-Shirt</SelectItem>
                    <SelectItem value="polo">Polo</SelectItem>
                    <SelectItem value="hoodie">Hoodie</SelectItem>
                    <SelectItem value="tops">Tops</SelectItem>
                    <SelectItem value="sweatshirt">Sweatshirt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.setItem("survey_completed", "true");
                  setShowSurvey(false);
                }}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const sessionId =
                      user?.id ||
                      `anon_${Date.now()}_${Math.random()
                        .toString(36)
                        .substr(2, 9)}`;
                    await (supabase as any)
                      .from("user_preferences")
                      .insert({
                        user_id: user?.id ?? null,
                        session_id: sessionId,
                        preferred_style: surveyData.preferredStyle,
                        preferred_color_scheme:
                          surveyData.preferredColorScheme,
                        preferred_clothing_type:
                          surveyData.preferredClothingType,
                      });
                    localStorage.setItem("survey_completed", "true");
                    setSurveyCompleted(true);
                    setShowSurvey(false);
                    toast.success("Thank you for your feedback!");
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to save preferences");
                  }
                }}
                className="flex-1 bg-sale-blue hover:bg-sale-blue/90"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )} */}

      {
        showLargeModal && generatedImage && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setShowLargeModal(false)}
            />

            <div className="relative z-10 w-full max-w-[70vw] max-h-[80vh] flex flex-col items-center">
              <button
                onClick={() => setShowLargeModal(false)}
                className="absolute -top-10 right-0 bg-card/90 backdrop-blur rounded-full p-2 hover:scale-105 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="bg-card rounded-xl shadow-2xl p-4 w-full flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="text-sm text-muted-foreground">Preview</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddToCart}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center w-full">
                  <img
                    src={generatedImage}
                    alt="Large generated design"
                    className="object-contain max-w-[65vw] max-h-[65vh] rounded-md"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      }

      <LoginRequiredModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      <GenerationLimitModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        generationCount={generationCount}
        limit={AUTHENTICATED_USER_LIMIT}
      />
    </div >
  );
}


function ResultView({ label, url, onClick }: { label: string; url: string; onClick?: (url: string) => void; }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>

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

