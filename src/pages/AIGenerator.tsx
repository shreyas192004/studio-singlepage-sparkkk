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

/* ---------- Portal modal that does NOT close on backdrop click + anti-flap guard ---------- */
type PortalModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
  disableBackdropClose?: boolean; // we'll set true
  antiFlapMs?: number; // guard window
};

function PortalModal({
  open,
  onClose,
  children,
  label = "modal",
  disableBackdropClose = true,
  antiFlapMs = 800,
}: PortalModalProps) {
  const openAtRef = useRef<number | null>(null);
  const closedQuicklyRef = useRef(false);
  const firstReopenDoneRef = useRef(false);

  useEffect(() => {
    if (open) {
      openAtRef.current = Date.now();
      closedQuicklyRef.current = false;
      firstReopenDoneRef.current = false;
      console.debug(`[PortalModal:${label}] opened at`, openAtRef.current);
    } else {
      // closed — check how soon after opening
      if (openAtRef.current) {
        const delta = Date.now() - openAtRef.current;
        console.debug(`[PortalModal:${label}] closed after ${delta}ms`);
        if (delta < antiFlapMs && !firstReopenDoneRef.current) {
          closedQuicklyRef.current = true;
          // reopen once after a tiny delay to avoid render loops
          setTimeout(() => {
            if (closedQuicklyRef.current && !firstReopenDoneRef.current) {
              console.debug(`[PortalModal:${label}] anti-flap reopening modal`);
              firstReopenDoneRef.current = true;
              // We call onClose? No — we need to set open state from parent.
              // To reopen, we dispatch a CustomEvent so parent can re-open.
              window.dispatchEvent(new CustomEvent(`reopen-modal-${label}`));
            }
          }, 60);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useEffect(() => {
    const onReopen = () => {
      // parent should listen to this event and set open = true when appropriate
    };
    window.addEventListener(`reopen-modal-${label}`, onReopen);
    return () => window.removeEventListener(`reopen-modal-${label}`, onReopen);
  }, [label]);

  if (!open) return null;

  const modal = (
    <div className={baseClass} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => disableBackdropClose && e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-md bg-card rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  // portal it
  return ReactDOM.createPortal(modal, document.body);
}

/* ---------- Inline special modals (Login + Limit) that use PortalModal and anti-flap reopen handling ---------- */
function LoginRequiredModal({
  open,
  onClose,
  onRequestReopen, // parent callback for anti-flap reopen
}: {
  open: boolean;
  onClose: () => void;
  onRequestReopen?: () => void;
}) {
  useEffect(() => {
    const handler = () => {
      // when PortalModal dispatches reopen event, call parent reopen
      onRequestReopen?.();
    };
    window.addEventListener("reopen-modal-login-required", handler);
    return () => window.removeEventListener("reopen-modal-login-required", handler);
  }, [onRequestReopen]);

  return (
    <PortalModal
      open={open}
      onClose={onClose}
      label="login-required"
      antiFlapMs={800}
      disableBackdropClose={true}
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
          <Link to="/auth" onClick={() => { /* don't auto-close; navigation will change route */ }} className="flex-1">
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
  onRequestReopen,
}: {
  open: boolean;
  onClose: () => void;
  generationCount: number;
  limit: number;
  onRequestReopen?: () => void;
}) {
  useEffect(() => {
    const handler = () => {
      onRequestReopen?.();
    };
    window.addEventListener("reopen-modal-generation-limit", handler);
    return () => window.removeEventListener("reopen-modal-generation-limit", handler);
  }, [onRequestReopen]);

  return (
    <PortalModal
      open={open}
      onClose={onClose}
      label="generation-limit"
      antiFlapMs={800}
      disableBackdropClose={true}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Generation Limit Reached</h3>
          <div className="text-sm text-muted-foreground">
            You have used {generationCount} of {limit} generations.
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          To continue generating more designs, please purchase additional credits or upgrade your plan.
        </p>

        <div className="flex gap-3">
          <Link to="/pricing" className="flex-1">
            <Button className="w-full bg-sale-blue">Upgrade</Button>
          </Link>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </PortalModal>
  );
}

/* ---------- your AIGenerator component (most code kept intact) ---------- */
type ClothingType = "t-shirt" | "polo" | "hoodie" | "tops";
type ImagePosition = "front" | "back";

const BASE_IMAGES: Record<string, { front?: string; back?: string }> = {
  "t-shirt": { front: "/t-shirtFront.jpg", back: "/t-shirtBack.jpg" },
  hoodie: { front: "/hoodieFront.jpg", back: "/hoodieBack.jpg" },
  polo: { front: "/poloBack.jpg", back: "/poloBack.jpg" },
  tops: { front: "/topFront.jpg", back: "/topFront.jpg" },
};

const OVERLAY_PRESETS: Record<
  string,
  {
    front?: { widthPct: number; leftPct: number; topPct: number; rotate?: number };
    back?: { widthPct: number; leftPct: number; topPct: number; rotate?: number };
  }
> = {
  "t-shirt": {
    front: { widthPct: 40, leftPct: 32, topPct: 30 },
    back: { widthPct: 40, leftPct: 30, topPct: 30 },
  },
  hoodie: {
    front: { widthPct: 30, leftPct: 35, topPct: 40 },
    back: { widthPct: 30, leftPct: 35, topPct: 40 },
  },
  polo: {
    back: { widthPct: 30, leftPct: 35, topPct: 35, rotate: 0 },
  },
  tops: {
    front: { widthPct: 25, leftPct: 37, topPct: 43 },
  },
};

export default function AIGenerator() {
  const [searchParams] = useSearchParams();
  const { cartCount, addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("modern");
  const [colorScheme, setColorScheme] = useState("vibrant");
  const [aspectRatio, setAspectRatio] = useState<"square" | "portrait" | "landscape">("square");
  const [quality, setQuality] = useState<"standard" | "high" | "ultra">("high");
  const [creativity, setCreativity] = useState(70);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [designText, setDesignText] = useState("");
  const [designRecord, setDesignRecord] = useState<any | null>(null);

  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [surveyData, setSurveyData] = useState({
    preferredStyle: "",
    preferredColorScheme: "",
    preferredClothingType: "",
  });

  const [clothingType, setClothingType] = useState<ClothingType>("t-shirt");
  const [imagePosition, setImagePosition] = useState<ImagePosition>("front");
  const [showLargeModal, setShowLargeModal] = useState(false);

  // Controlled modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // If parent/other code accidentally emits reopen events, we re-open once.
  useEffect(() => {
    const onReopenLogin = () => {
      console.debug("[AIGenerator] Reopen request for login modal");
      setShowLoginModal(true);
    };
    const onReopenLimit = () => {
      console.debug("[AIGenerator] Reopen request for limit modal");
      setShowLimitModal(true);
    };
    window.addEventListener("reopen-modal-login-required", onReopenLogin);
    window.addEventListener("reopen-modal-generation-limit", onReopenLimit);
    return () => {
      window.removeEventListener("reopen-modal-login-required", onReopenLogin);
      window.removeEventListener("reopen-modal-generation-limit", onReopenLimit);
    };
  }, []);

  const [userHasPurchased, setUserHasPurchased] = useState(false);
  const { user, signOut } = useAuth();

  // Variant modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantAction, setVariantAction] = useState<"cart" | "wishlist" | null>(null);
  const [availableSizes] = useState(["XS", "S", "M", "L", "XL", "XXL"]);
  const [availableColors] = useState(["Black", "White", "Navy Blue", "Pastel Pink"]);
  const [selectedSize, setSelectedSize] = useState<string | null>("M");
  const [selectedColor, setSelectedColor] = useState<string | null>("Black");

  const navigate = useNavigate();

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

    const surveyDone = localStorage.getItem("survey_completed");
    if (surveyDone === "true") setSurveyCompleted(true);

    // Check if user has purchased before (to reset generation limit)
    const checkUserStats = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("user_generation_stats")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (!error && data) {
            setGenerationCount(data.generation_count);
            setUserHasPurchased(data.has_purchased);
          } else {
            // Create user stats if not exists (best effort)
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
    if (clothingType === "polo") setImagePosition("back");
    else if (clothingType === "tops") setImagePosition("front");
    else {
      if (!["front", "back"].includes(imagePosition)) setImagePosition("front");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clothingType]);

  // Close modal on Esc for the large preview only (we handle inline modals separately)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLargeModal(false);
    };
    if (showLargeModal) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLargeModal]);

  // ---------- handleGenerate with early controlled modal opens ----------
  const handleGenerate = async () => {
    if (isGenerating) return;

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (generationCount >= AUTHENTICATED_USER_LIMIT && !userHasPurchased) {
      setShowLimitModal(true);
      return;
    }

    const trimmedPrompt = prompt.trim();
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

    setIsGenerating(true);
    setGeneratedImage(null);
    setDesignRecord(null);

    try {
      const sessionId = user?.id || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const body: Record<string, any> = {
        prompt: trimmedPrompt,
        style,
        colorScheme,
        aspectRatio,
        quality,
        creativity,
        clothingType,
        imagePosition,
      };

      const trimmedText = designText.trim();
      if (trimmedText.length > 0) body.text = trimmedText;

      const { data, error } = await supabase.functions.invoke("generate-tshirt-design", { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image in response");

      setGeneratedImage(data.imageUrl);

      const insertResp = await (supabase as any)
        .from("ai_generations")
        .insert({
          user_id: user?.id || null,
          session_id: sessionId,
          image_url: data.imageUrl,
          prompt: trimmedPrompt,
          style,
          color_scheme: colorScheme,
          clothing_type: clothingType,
          image_position: imagePosition,
          included_text: data?.includedText ?? null,
        })
        .select("*")
        .single();

      if (!insertResp.error) setDesignRecord(insertResp.data);

      toast.success("Design generated successfully!");

      if (data?.includedText) toast.success(`Text "${data.includedText}" included in design!`);

      const newCount = generationCount + 1;
      setGenerationCount(newCount);

      if (user) {
        try {
          await supabase
            .from("user_generation_stats")
            .upsert(
              {
                user_id: user.id,
                generation_count: newCount,
              } as any,
              { onConflict: "user_id" }
            );
        } catch (err) {
          console.error("Error updating generation count:", err);
        }
      } else {
        localStorage.setItem("generation_count", newCount.toString());
      }

      const surveyAlreadyCompleted = localStorage.getItem("survey_completed") === "true";
      if (!surveyAlreadyCompleted && newCount === 1) setTimeout(() => setShowSurvey(true), 1200);

      setDesignText("");
    } catch (err: any) {
      console.error("Generation error:", err);

      let message = "Failed to generate design. Please try again.";

      const rawBody = err?.context?.body ?? err?.body;
      if (rawBody) {
        try {
          const parsed = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
          if (parsed?.details && Array.isArray(parsed.details)) {
            const detailMsgs = parsed.details.map((d: any) => d?.message || JSON.stringify(d));
            message = detailMsgs.join("; ");
          } else if (parsed?.error) message = parsed.error;
        } catch (parseErr) {
          console.error("Failed to parse error body:", parseErr);
        }
      }

      const status = err?.context?.status ?? err?.status;
      if (status === 402) message = "Payment required, please add funds to your AI workspace.";
      if (status === 429) message = "Rate limits exceeded, please try again shortly.";

      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  /* ---------- rest of your helpers & UI (upload/create product, handlers, preview component, etc) ---------- */
  // For brevity I keep the unchanged functions & UI identical to your previous file.
  // Paste your previously provided helper functions (uploadImageToStorage, createProductFromDesign, handleAddToCart, handleAddToWishlist, handleConfirmVariant, handleBuy)
  // ... (I'll paste them verbatim to keep behaviour identical)

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
      const description = payload.description ?? `AI-generated design. Prompt: ${prompt.slice(0, 120)}`;
      const price = payload.price ?? 1999;
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

  const handleAddToWishlist = async () => {
    if (!generatedImage) return toast.error("No design to add to wishlist");
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setVariantAction("wishlist");
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
      price: 1999,
      ai_generation_id: designRecord?.id ?? null,
      selected_size: selectedSize,
      selected_color: selectedColor,
    };

    try {
      toast.loading("Saving design and creating product...");
      const { product } = await createProductFromDesign(generatedImage, payload as any);

      if (variantAction === "cart") {
        addToCart({
          id: product.id,
          name: product.title,
          price: product.price,
          image: (product.images && product.images[0]) || generatedImage,
          quantity: 1,
          selected_size: selectedSize,
          selected_color: selectedColor,
        } as any);
        toast.success("Added custom design to cart");
      } else if (variantAction === "wishlist") {
        addToWishlist({
          id: product.id,
          name: product.title,
          price: product.price,
          image: (product.images && product.images[0]) || generatedImage,
          selected_size: selectedSize,
          selected_color: selectedColor,
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

  /* ---------- UI rendering (kept the same structure as your file) ---------- */
  const baseImageSrc = (() => {
    const mapping = BASE_IMAGES[clothingType];
    if (!mapping) return "/t-shirtFront.jpg";
    return (imagePosition === "back" ? mapping.back : mapping.front) ?? mapping.front;
  })();

  const overlayPreset =
    OVERLAY_PRESETS[clothingType]?.[imagePosition] ??
    OVERLAY_PRESETS[clothingType]?.front ?? { widthPct: 55, leftPct: 22, topPct: 20 };

  const MockupPreview = () => (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border sticky top-24 relative">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Design Preview</h2>
          <div className="text-sm text-muted-foreground">Live mockup of your design</div>
        </div>
        {generatedImage && (
          <Button onClick={() => setShowLargeModal(true)} variant="ghost" size="sm" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Preview</span>
          </Button>
        )}
      </div>

      <div className="relative w-full rounded-lg overflow-hidden bg-muted" style={{ paddingTop: "100%" }}>
        <img src={baseImageSrc} alt={`${clothingType} mockup ${imagePosition}`} className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {generatedImage ? (
          <img
            src={generatedImage}
            alt="generated design overlay"
            className="absolute cursor-pointer transition-transform duration-150 hover:scale-105"
            style={{
              width: `${overlayPreset.widthPct}%`,
              left: `${overlayPreset.leftPct}%`,
              top: `${overlayPreset.topPct}%`,
              transform: `rotate(${overlayPreset.rotate ?? 0}deg)`,
              objectFit: "contain",
            }}
            draggable={false}
            crossOrigin="anonymous"
            onClick={() => setShowLargeModal(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6">
            <Sparkles className="w-12 h-12 mb-3 opacity-60" />
            <p className="text-center">
              Describe your idea and hit <span className="font-semibold">Generate</span>
            </p>
          </div>
        )}
      </div>

      {generatedImage && (
        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleAddToWishlist} className="p-2 rounded-md hover:bg-muted/60 transition" aria-label="Add to wishlist">
            <Heart className="w-5 h-5 text-muted-foreground" />
          </button>

          <Button onClick={handleAddToCart} variant="outline" size="sm" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="sr-only">Add to cart</span>
          </Button>

          <Button onClick={handleBuy} className="ml-auto bg-sale-blue hover:bg-sale-blue/95 text-white font-semibold py-2 px-4">
            Buy
          </Button>

          <Button variant="ghost" size="sm" onClick={handleGenerate} className="text-muted-foreground">
            Regenerate
          </Button>
        </div>
      )}

      {!user && generationCount > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {generationCount}/{FREE_USER_LIMIT} free generations used
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-primary/90 text-primary-foreground backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg md:text-xl font-bold tracking-wider">
              <img className="w-24 h-10 object-contain cursor-pointer" src={Logo} alt="Tesora Logo" />
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
                  <DropdownMenuContent align="end" className="w-48 bg-background border border-border">
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
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth" className="p-2 rounded-md hover:bg-primary-foreground/6">
                  <User className="w-5 h-5" />
                </Link>
              )}

              <button onClick={() => setCartOpen(true)} className="relative p-2 rounded-md hover:bg-muted/60 transition">
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
              AI-Powered Design
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Create your custom{" "}
              <span className="text-sale-blue">
                <SlideRotatingWords words={PRODUCT_WORDS} ms={2000} />
              </span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">Minimal, fast, and focused — design prints for apparel using AI.</p>
          </header>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <section className="space-y-6 order-2 lg:order-1">
              <form className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-semibold">Design Settings</h2>
                  <div className="text-sm text-muted-foreground">Quick options</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt" className="text-sm font-semibold mb-2 block">
                      Describe Your Design
                    </Label>
                    <Textarea
                      id="prompt"
                      placeholder="E.g., A futuristic robot playing guitar under neon lights..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="designText" className="text-sm font-semibold mb-2 block">
                      Add Text <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input id="designText" placeholder="e.g., 'Live Loud'" value={designText} onChange={(e) => setDesignText(e.target.value)} maxLength={120} />
                    <p className="text-xs text-muted-foreground mt-1">This text will be included in your design if provided.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Style</Label>
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
                      <Label className="text-sm font-semibold mb-2 block">Color Scheme</Label>
                      <Select value={colorScheme} onValueChange={setColorScheme}>
                        <SelectTrigger id="colorScheme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="vibrant">Vibrant</SelectItem>
                          <SelectItem value="pastel">Pastel</SelectItem>
                          <SelectItem value="monochrome">Monochrome</SelectItem>
                          <SelectItem value="neon">Neon</SelectItem>
                          <SelectItem value="earth-tones">Earth Tones</SelectItem>
                          <SelectItem value="black-white">Black & White</SelectItem>
                          <SelectItem value="cool">Cool Tones</SelectItem>
                          <SelectItem value="warm">Warm Tones</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Clothing Type</Label>
                      <Select value={clothingType} onValueChange={(val) => setClothingType(val as ClothingType)}>
                        <SelectTrigger id="clothingType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="t-shirt">T-Shirt</SelectItem>
                          <SelectItem value="polo">Polo</SelectItem>
                          <SelectItem value="hoodie">Hoodie</SelectItem>
                          <SelectItem value="tops">Tops</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Position</Label>
                      <Select value={imagePosition} onValueChange={(val) => setImagePosition(val as ImagePosition)}>
                        <SelectTrigger id="imagePosition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(clothingType === "t-shirt" || clothingType === "hoodie") && (
                            <>
                              <SelectItem value="front">Front</SelectItem>
                              <SelectItem value="back">Back</SelectItem>
                            </>
                          )}
                          {clothingType === "polo" && <SelectItem value="back">Back</SelectItem>}
                          {clothingType === "tops" && <SelectItem value="front">Front</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-sale-blue hover:bg-sale-blue/90 text-white font-bold py-4 text-base">
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Design
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              <div className="bg-muted rounded-2xl p-5 text-sm text-muted-foreground">
                <h3 className="font-medium mb-2">Tips for better results</h3>
                <ul className="space-y-2 list-none">
                  <li>• Use clear descriptors (objects, colors, mood)</li>
                  <li>• Add exact text in the text field if you want it included</li>
                  <li>• Try different styles for varied outputs</li>
                </ul>
              </div>
            </section>

            <aside className="order-1 lg:order-2">
              <MockupPreview />
            </aside>
          </div>
        </div>
      </main>

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Variant modal for selecting size/color before saving product */}
      {variantModalOpen && (
        <div className="fixed inset-0 z-[10000000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setVariantModalOpen(false)} />

          <div className="relative z-10 bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Choose size & color</h3>
                <div className="text-sm text-muted-foreground">Select a size and color for your product</div>
              </div>
              <button onClick={() => setVariantModalOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 ">
              <div>
                <Label className="text-sm font-semibold mb-2 block z-[10000000]" >Size</Label>
                <Select value={selectedSize ?? undefined} onValueChange={(v) => setSelectedSize(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000001]">
                    {availableSizes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block ">Color</Label>
                <Select value={selectedColor ?? undefined} onValueChange={(v) => setSelectedColor(v)}>
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

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setVariantModalOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-sale-blue" onClick={handleConfirmVariant}>
                Confirm & Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSurvey && (
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
              <h3 className="text-lg font-semibold mb-1">Help us personalize</h3>
              <p className="text-sm text-muted-foreground">Choose a few preferences to improve recommendations.</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Preferred Style</Label>
                <Select value={surveyData.preferredStyle} onValueChange={(val) => setSurveyData({ ...surveyData, preferredStyle: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
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
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Preferred Colors</Label>
                <Select value={surveyData.preferredColorScheme} onValueChange={(val) => setSurveyData({ ...surveyData, preferredColorScheme: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                    <SelectItem value="pastel">Pastel</SelectItem>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                    <SelectItem value="neon">Neon</SelectItem>
                    <SelectItem value="earth-tones">Earth Tones</SelectItem>
                    <SelectItem value="black-white">Black & White</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Preferred Clothing</Label>
                <Select value={surveyData.preferredClothingType} onValueChange={(val) => setSurveyData({ ...surveyData, preferredClothingType: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t-shirt">T-Shirt</SelectItem>
                    <SelectItem value="polo">Polo</SelectItem>
                    <SelectItem value="hoodie">Hoodie</SelectItem>
                    <SelectItem value="tops">Tops</SelectItem>
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
                    const sessionId = user?.id || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    await (supabase as any).from("user_preferences").insert({
                      user_id: user?.id ?? null,
                      session_id: sessionId,
                      preferred_style: surveyData.preferredStyle,
                      preferred_color_scheme: surveyData.preferredColorScheme,
                      preferred_clothing_type: surveyData.preferredClothingType,
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
      )}

      {showLargeModal && generatedImage && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowLargeModal(false)} />

          <div className="relative z-10 w-full max-w-[70vw] max-h-[80vh] flex flex-col items-center">
            <button onClick={() => setShowLargeModal(false)} className="absolute -top-10 right-0 bg-card/90 backdrop-blur rounded-full p-2 hover:scale-105 transition">
              <X className="w-5 h-5" />
            </button>

            <div className="bg-card rounded-xl shadow-2xl p-4 w-full flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-3">
                <div className="text-sm text-muted-foreground">Preview</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddToCart} className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Add to Cart
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleAddToWishlist} className="flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Wishlist
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center w-full">
                <img src={generatedImage} alt="Large generated design" className="object-contain max-w-[65vw] max-h-[65vh] rounded-md" draggable={false} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Portal-based modals (more robust vs layout re-renders) */}
      <LoginRequiredModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onRequestReopen={() => setShowLoginModal(true)}
      />
      <GenerationLimitModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        generationCount={generationCount}
        limit={AUTHENTICATED_USER_LIMIT}
        onRequestReopen={() => setShowLimitModal(true)}
      />
    </div>
  );
}
