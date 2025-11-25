import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, User, ShoppingCart, Heart, Sparkles, Loader2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { CartSidebar } from "@/components/CartSidebar";
import { AuthDialog } from "@/components/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRODUCT_WORDS = ["T-Shirt", "Hoodie", "POLO", "Top"];

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
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        display: "inline-block",
      }}
    >
      {words[i]}
    </span>
  );
};

const FREE_USER_LIMIT = 2;
const AUTHENTICATED_USER_LIMIT = 30;

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

type ClothingType = "t-shirt" | "polo" | "hoodie" | "tops";
type ImagePosition = "front" | "back";

const AIGenerator = () => {
  const [searchParams] = useSearchParams();
  const { cartCount } = useCart();
  const { user } = useAuth();
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

  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [surveyData, setSurveyData] = useState({
    preferredStyle: "",
    preferredColorScheme: "",
    preferredClothingType: "",
  });

  const [clothingType, setClothingType] = useState<ClothingType>("t-shirt");
  const [imagePosition, setImagePosition] = useState<ImagePosition>("front");

  // NEW: modal state for showing large design
  const [showLargeModal, setShowLargeModal] = useState(false);

  useEffect(() => {
    const urlPrompt = searchParams.get("prompt");
    if (urlPrompt) setPrompt(urlPrompt);

    const savedCount = localStorage.getItem("generation_count");
    if (savedCount) setGenerationCount(parseInt(savedCount, 10));

    const surveyDone = localStorage.getItem("survey_completed");
    if (surveyDone === "true") setSurveyCompleted(true);
  }, [searchParams]);

  useEffect(() => {
    if (clothingType === "polo") setImagePosition("back");
    else if (clothingType === "tops") setImagePosition("front");
    else {
      if (!["front", "back"].includes(imagePosition)) setImagePosition("front");
    }
  }, [clothingType]);

  // Close modal on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLargeModal(false);
    };
    if (showLargeModal) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLargeModal]);

  const handleGenerate = async () => {
    if (!user && generationCount >= FREE_USER_LIMIT) {
      toast.error(`You've reached the free generation limit of ${FREE_USER_LIMIT}. Please sign up to continue!`);
      setAuthOpen(true);
      return;
    }
    if (user && generationCount >= AUTHENTICATED_USER_LIMIT) {
      toast.error(`You've reached the generation limit of ${AUTHENTICATED_USER_LIMIT}. Please contact support for more.`);
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return toast.error("Please enter a design description");
    if (trimmedPrompt.length < 10) return toast.error("Prompt must be at least 10 characters");
    if (trimmedPrompt.length > 500) return toast.error("Prompt must be under 500 characters");

    setIsGenerating(true);
    setGeneratedImage(null);

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

      // Only include text if provided
      const trimmedText = designText.trim();
      if (trimmedText.length > 0) {
        body.text = trimmedText;
      }

      console.log("Invoking generate-tshirt-design with body:", body);

      const { data, error } = await supabase.functions.invoke("generate-tshirt-design", { body });

      console.log("generate-tshirt-design response:", { data, error });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image in response");

      setGeneratedImage(data.imageUrl);

      await (supabase as any).from("ai_generations").insert({
        user_id: user?.id || null,
        session_id: sessionId,
        image_url: data.imageUrl,
        prompt: trimmedPrompt,
        style,
        color_scheme: colorScheme,
        clothing_type: clothingType,
        image_position: imagePosition,
      });

      if (user) {
        const shortPrompt = trimmedPrompt.substring(0, 30);
        const titleExtra = trimmedText ? ` — "${trimmedText}"` : "";
        const mockProduct = {
          id: `ai_${Date.now()}`,
          title: `AI Generated: ${shortPrompt}${titleExtra}`,
          price: 1999,
          images: [data.imageUrl],
          category: "AI Generated",
          description: `Custom AI-generated design: ${trimmedPrompt}${trimmedText ? ` | Text: "${trimmedText}"` : ""}`,
        };
        addToWishlist(mockProduct as any);
        toast.success("Design generated and added to wishlist!");
      } else {
        toast.success("Design generated successfully!");
      }

      if (data?.includedText) {
        toast.success(`Text "${data.includedText}" included in design!`);
      }

      const newCount = generationCount + 1;
      setGenerationCount(newCount);

      if (!user) {
        localStorage.setItem("generation_count", newCount.toString());
      }

      const surveyAlreadyCompleted = localStorage.getItem("survey_completed") === "true";
      if (!surveyAlreadyCompleted && newCount === 1) {
        setTimeout(() => setShowSurvey(true), 1500);
      }

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
          } else if (parsed?.error) {
            message = parsed.error;
          }
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

  const handleDownload = () => {
    if (!generatedImage) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height + 60;
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, img.height, canvas.width, 60);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("tesoralifestyle", canvas.width / 2, img.height + 40);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tesoralifestyle-design-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Design downloaded with watermark!");
          }
        });
      }
    };
    img.src = generatedImage;
  };

  // NEW: direct original download (no watermark)
  const handleDownloadOriginal = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `tesora-design-${Date.now()}.png`;
    // In some cross-origin scenarios, this may open the image in a new tab instead of downloading.
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSurveySubmit = async () => {
    if (!surveyData.preferredStyle || !surveyData.preferredColorScheme || !surveyData.preferredClothingType) {
      return toast.error("Please answer all questions");
    }
    try {
      const sessionId = user?.id || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await (supabase as any).from("user_preferences").insert({
        user_id: user?.id || null,
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
  };

  const handleSurveySkip = () => {
    localStorage.setItem("survey_completed", "true");
    setSurveyCompleted(true);
    setShowSurvey(false);
  };

  const baseImageSrc = (() => {
    const mapping = BASE_IMAGES[clothingType];
    if (!mapping) return "/t-shirtFront.jpg";
    return (imagePosition === "back" ? mapping.back : mapping.front) ?? mapping.front;
  })();

  const overlayPreset =
    OVERLAY_PRESETS[clothingType]?.[imagePosition] ??
    OVERLAY_PRESETS[clothingType]?.front ??
    { widthPct: 55, leftPct: 22, topPct: 20 };

  const MockupPreview = () => (
    <div className="bg-card rounded-xl p-6 shadow-lg border border-border sticky top-24">
      <h2 className="text-2xl font-bold mb-6">Design Preview</h2>
      <div className="relative w-full rounded-lg overflow-hidden bg-muted" style={{ paddingTop: "100%" }}>
        <img
          src={baseImageSrc}
          alt={`${clothingType} mockup ${imagePosition}`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {generatedImage && (
          <img
            src={generatedImage}
            alt="generated design overlay"
            className="absolute cursor-pointer"
            style={{
              width: `${overlayPreset.widthPct}%`,
              left: `${overlayPreset.leftPct}%`,
              top: `${overlayPreset.topPct}%`,
              transform: `rotate(${overlayPreset.rotate ?? 0}deg)`,
              objectFit: "contain",
            }}
            draggable={false}
            crossOrigin="anonymous"
            onClick={() => setShowLargeModal(true)} // NEW: open modal on click
          />
        )}
        {!generatedImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6">
            <Sparkles className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-center">Your design will appear here</p>
          </div>
        )}
      </div>
      {generatedImage && (
        <div className="mt-6 space-y-3">
          <Button onClick={handleDownload} className="w-full" size="lg">
            <Download className="w-5 h-5 mr-2" />
            Download with Watermark
          </Button>
          <Button variant="outline" size="lg" onClick={() => setShowLargeModal(true)} className="w-full">
            View Larger
          </Button>
          <Button variant="ghost" size="lg" onClick={handleGenerate} className="w-full">
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
      <nav className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold tracking-wider">TESORA</Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="hover:text-accent transition-colors">Shop</Link>
              <Link to="/ai-generator" className="hover:text-accent transition-colors">AI Generator</Link>
            </div>
            <div className="flex items-center gap-4">
              <button className="hover:text-accent transition-colors"><Search className="w-5 h-5" /></button>
              <button className="hover:text-accent transition-colors"><User className="w-5 h-5" /></button>
              <button onClick={() => setCartOpen(true)} className="hover:text-accent transition-colors relative">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
              <Link to="/wishlist"><Button variant="ghost" size="icon"><Heart className="w-5 h-5" /></Button></Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-sale-blue text-white text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4" />
              AI-Powered Design
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Create Your Custom{" "}
              <span className="text-sale-blue">
                <SlideRotatingWords words={PRODUCT_WORDS} ms={2000} />
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Describe your vision and watch AI bring it to life.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6 order-2 lg:order-1">
              <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
                <h2 className="text-2xl font-bold mb-6">Design Settings</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt" className="text-base font-semibold mb-2 block">
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
                    <Label htmlFor="designText" className="text-base font-semibold mb-2 block">
                      Add Text to Design <span className="text-sm text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="designText"
                      placeholder="e.g., 'Live Loud', 'Dream Big'"
                      value={designText}
                      onChange={(e) => setDesignText(e.target.value)}
                      maxLength={120}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This text will be included in your design if provided.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="style" className="text-base font-semibold mb-2 block">Design Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger id="style"><SelectValue /></SelectTrigger>
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
                    <Label htmlFor="colorScheme" className="text-base font-semibold mb-2 block">Color Scheme</Label>
                    <Select value={colorScheme} onValueChange={setColorScheme}>
                      <SelectTrigger id="colorScheme"><SelectValue /></SelectTrigger>
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

                  <div>
                    <Label htmlFor="clothingType" className="text-base font-semibold mb-2 block">Clothing Type</Label>
                    <Select value={clothingType} onValueChange={(val) => setClothingType(val as ClothingType)}>
                      <SelectTrigger id="clothingType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="t-shirt">T-Shirt</SelectItem>
                        <SelectItem value="polo">Polo</SelectItem>
                        <SelectItem value="hoodie">Hoodie</SelectItem>
                        <SelectItem value="tops">Tops</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="imagePosition" className="text-base font-semibold mb-2 block">Position</Label>
                    <Select value={imagePosition} onValueChange={(val) => setImagePosition(val as ImagePosition)}>
                      <SelectTrigger id="imagePosition"><SelectValue /></SelectTrigger>
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

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-sale-blue hover:bg-sale-blue/90 text-white font-bold py-6 text-lg"
                    size="lg"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-5 h-5 mr-2" />Generate Design</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-muted rounded-xl p-6">
                <h3 className="font-bold mb-3">💡 Tips for Best Results</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Be specific about key elements, colors & mood</li>
                  <li>• Use the text field to add quotes or words to your design</li>
                  <li>• Try different styles for varied results</li>
                </ul>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <MockupPreview />
            </div>
          </div>
        </div>
      </div>

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />

      {showSurvey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button onClick={handleSurveySkip} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6">
              <div className="w-12 h-12 bg-sale-blue/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-sale-blue" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Help Us Personalize!</h3>
              <p className="text-muted-foreground">Tell us your preferences for better suggestions</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Preferred Style</Label>
                <Select value={surveyData.preferredStyle} onValueChange={(val) => setSurveyData({ ...surveyData, preferredStyle: val })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t-shirt">T-Shirt</SelectItem>
                    <SelectItem value="polo">Polo</SelectItem>
                    <SelectItem value="hoodie">Hoodie</SelectItem>
                    <SelectItem value="tops">Tops</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={handleSurveySkip} className="flex-1">Skip</Button>
              <Button onClick={handleSurveySubmit} className="flex-1 bg-sale-blue hover:bg-sale-blue/90">Submit</Button>
            </div>
          </div>
        </div>
      )}

{/* LARGE DESIGN MODAL - PERFECT MEDIUM SIZE */}
{showLargeModal && generatedImage && (
  <div
    className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
    aria-modal="true"
    role="dialog"
  >
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/70"
      onClick={() => setShowLargeModal(false)}
    />

    {/* Modal Container */}
    <div className="relative z-10 w-full max-w-[70vw] max-h-[80vh] flex flex-col items-center">
      {/* Close Button */}
      <button
        onClick={() => setShowLargeModal(false)}
        className="absolute -top-10 right-0 bg-card/90 backdrop-blur rounded-full p-2 hover:scale-105 transition"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Modal Content */}
      <div className="bg-card rounded-xl shadow-2xl p-4 w-full flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-3">
          <div className="text-sm text-muted-foreground">Preview</div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleDownloadOriginal} className="flex items-center gap-2">
              <Download className="w-4 h-4" /> Original
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDownload} className="flex items-center gap-2">
              <Download className="w-4 h-4" /> Watermark
            </Button>
          </div>
        </div>

        {/* Medium-sized Image */}
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
)}


    </div>
  );
};

export default AIGenerator;
