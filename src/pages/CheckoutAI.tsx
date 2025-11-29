// src/pages/CheckoutAI.tsx  (updated)
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Tag, Percent } from "lucide-react";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const COLOR_OPTIONS = ["white", "black", "red", "blue", "green", "yellow"];

type LocationState = {
  imageUrl?: string;
  prompt?: string;
  style?: string;
  colorScheme?: string;
  clothingType?: string;
  imagePosition?: string;
  ai_generation_id?: string | number | null;
  productId?: string | null; // if AIGenerator already created product (UUID)
};

const CheckoutAI: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const payload = (location.state ?? {}) as LocationState;

  const [imageUrl, setImageUrl] = useState<string | null>(payload.imageUrl ?? null);
  const [prompt, setPrompt] = useState<string>(payload.prompt ?? "");
  const [clothingType, setClothingType] = useState<string>(payload.clothingType ?? "t-shirt");
  const [imagePosition, setImagePosition] = useState<string>(payload.imagePosition ?? "front");
  const [aiGenerationId, setAiGenerationId] = useState<string | number | null>(payload.ai_generation_id ?? null);
  const [existingProductId] = useState<string | null>(payload.productId ?? null);

  const [size, setSize] = useState<string>("M");
  const [color, setColor] = useState<string>("black");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(1999); // base price, change as needed
  const [isPlacing, setIsPlacing] = useState(false);

  // Coupon and discount states
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [firstOrderDiscount, setFirstOrderDiscount] = useState<number>(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    // Try to restore design from sessionStorage if not passed via state
    if (!imageUrl) {
      const savedDesign = sessionStorage.getItem("ai_design_data");
      if (savedDesign) {
        try {
          const parsed = JSON.parse(savedDesign);
          setImageUrl(parsed.imageUrl);
          setPrompt(parsed.prompt || "");
          setClothingType(parsed.clothingType || "t-shirt");
          setImagePosition(parsed.imagePosition || "front");
          setAiGenerationId(parsed.ai_generation_id || null);
        } catch (e) {
          console.error("Failed to parse saved design:", e);
          toast.error("No design found. Please generate a design first.");
          navigate("/ai-generator");
        }
      } else {
        toast.error("No design found. Please generate a design first.");
        navigate("/ai-generator");
      }
    } else {
      // Save current design to sessionStorage
      sessionStorage.setItem("ai_design_data", JSON.stringify({
        imageUrl,
        prompt,
        clothingType,
        imagePosition,
        ai_generation_id: aiGenerationId,
      }));
    }

    // Check if this is user's first order
    const checkFirstOrder = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("user_order_stats")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (error || !data) {
            setIsFirstOrder(true);
          } else {
            setIsFirstOrder(data.order_count === 0 && !data.first_order_discount_used);
          }
        } catch (err) {
          console.error("Error checking first order:", err);
          setIsFirstOrder(false);
        }
      }
    };

    checkFirstOrder();
  }, [imageUrl, navigate, user]);

  // Calculate first order discount (5% on orders > 4000)
  useEffect(() => {
    const subtotal = price * quantity;
    if (isFirstOrder && subtotal > 4000) {
      setFirstOrderDiscount(Math.round(subtotal * 0.05));
    } else {
      setFirstOrderDiscount(0);
    }
  }, [price, quantity, isFirstOrder]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    setApplyingCoupon(true);
    try {
      const { data, error } = await supabase
        .from("coupon_codes")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Invalid coupon code");
        return;
      }

      const coupon = data as any;
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now < validFrom || now > validUntil) {
        toast.error("Coupon has expired or is not yet valid");
        return;
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast.error("Coupon usage limit reached");
        return;
      }

      const subtotal = price * quantity;
      if (subtotal < coupon.min_order_amount) {
        toast.error(`Minimum order amount is ₹${coupon.min_order_amount} for this coupon`);
        return;
      }

      setAppliedCoupon({
        code: coupon.code,
        discount: Number(coupon.discount_amount),
      });
      toast.success(`Coupon applied! ₹${coupon.discount_amount} discount`);
    } catch (err) {
      console.error("Error applying coupon:", err);
      toast.error("Failed to apply coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.success("Coupon removed");
  };

  // Calculate totals
  const subtotal = price * quantity;
  const totalDiscount = (appliedCoupon?.discount || 0) + firstOrderDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  // ---------- helpers ----------
  const escapeHtml = (s?: string) => {
    if (!s) return "";
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // fetch remote image and return Blob (may fail due to CORS)
  const fetchImageAsBlob = async (url: string) => {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    return await res.blob();
  };

  const generateInvoiceHTML = (orderNumber: string, aiDesignPublicUrl?: string) => {
    const invoiceDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const total = (price * quantity).toFixed(2);
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Invoice #${orderNumber}</title><style>
      body{font-family:Arial;margin:36px;color:#222} .header{text-align:center;border-bottom:2px solid #000;padding-bottom:14px;margin-bottom:18px}
      h1{margin:0;font-size:28px} table{width:100%;border-collapse:collapse;margin-top:12px} th{background:#f5f5f5;padding:10px;text-align:left} td{padding:10px;border-bottom:1px solid #eee}
      .right{text-align:right}.totals{width:320px;margin-left:auto;margin-top:10px}.total-row{font-weight:700;border-top:2px solid #000;padding-top:8px}
      .footer{margin-top:36px;text-align:center;color:#666;font-size:13px;border-top:1px solid #eee;padding-top:12px}
      .detail-badge{background:#e3f2fd;padding:3px 8px;border-radius:4px;font-weight:600;margin-right:8px;display:inline-block;margin-bottom:4px}
    </style></head><body>
      <div class="header"><h1>Invoice</h1><div>Order #${orderNumber}</div><div>${invoiceDate}</div></div>
      <div><strong>Bill To:</strong><br/>${user?.email ?? "—"}</div>
      <div style="margin-top:12px"><strong>Item</strong>
        <table><thead><tr><th>Product</th><th>Details</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr></thead>
        <tbody><tr><td>Custom AI Design</td>
        <td>
          <span class="detail-badge">Cloth: ${escapeHtml(clothingType)}</span>
          <span class="detail-badge">Size: ${escapeHtml(size)}</span>
          <span class="detail-badge">Color: ${escapeHtml(color)}</span>
          <br/><small>Position: ${escapeHtml(imagePosition)}</small>
          ${prompt ? `<br/><small>Prompt: ${escapeHtml(prompt)}</small>` : ""}
        </td>
        <td class="right">${quantity}</td><td class="right">Rs ${Number(price).toFixed(2)}</td><td class="right">Rs ${(price * quantity).toFixed(2)}</td></tr></tbody></table>
      </div>
      <div class="totals"><table><tr><td>Subtotal:</td><td class="right">Rs ${(price * quantity).toFixed(2)}</td></tr><tr><td>Shipping:</td><td class="right">Free</td></tr>
      <tr class="total-row"><td>Total:</td><td class="right">Rs ${total}</td></tr></table></div>
      <div style="margin-top:12px"><strong>Design:</strong><br/>${aiDesignPublicUrl ? `<a href="${aiDesignPublicUrl}">View Uploaded Design</a>` : (imageUrl ? `<a href="${imageUrl}">View Original Design</a>` : "—")}</div>
      <div class="footer">Thank you for your purchase! If you have questions, contact support.</div>
    </body></html>`;
  };

  const generatePurchaseInvoiceHTML = (orderNumber: string, aiDesignPublicUrl?: string) => {
    const invoiceDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Manufacturing Order #${orderNumber}</title><style>
      body{font-family:Arial;margin:36px;color:#222}.header{text-align:center;margin-bottom:18px}h1{margin:0;font-size:24px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:10px;text-align:left}td{padding:8px;border-bottom:1px solid #eee}.right{text-align:right}.small{font-size:13px;color:#555}
      .highlight{background:#fff3cd;padding:4px 10px;border-radius:4px;font-weight:bold}
    </style></head><body><div class="header"><h1>MANUFACTURING ORDER</h1><div>Order #${orderNumber} — ${invoiceDate}</div></div>
      <div><strong>Buyer:</strong><br/>${user?.email ?? "—"}</div>
      <div style="margin-top:12px"><h3>Production Details</h3><table><thead><tr><th>Product</th><th>Cloth Type</th><th>Size</th><th>Color</th><th class="right">Qty</th></tr></thead>
      <tbody><tr>
        <td>Custom AI Design</td>
        <td><span class="highlight">${escapeHtml(clothingType)}</span></td>
        <td><span class="highlight">${escapeHtml(size)}</span></td>
        <td><span class="highlight">${escapeHtml(color)}</span></td>
        <td class="right"><strong>${quantity}</strong></td>
      </tr></tbody></table>
      <p class="small">AI Design reference: ${aiDesignPublicUrl ? `<a href="${aiDesignPublicUrl}">Design link</a>` : (imageUrl ? `<a href="${imageUrl}">Original design</a>` : "—")}<br/>Image Position: ${escapeHtml(imagePosition)}<br/>Prompt: ${prompt ? escapeHtml(prompt) : "—"}</p>
      <div class="small">Please follow the size & color breakdown above. Confirm fabric availability and lead time before production.</div></body></html>`;
  };

  /**
   * Upload arbitrary Blob/File to a bucket and return publicUrl & path.
   * Uses File wrapper for better browser behavior.
   */
  const uploadToBucket = async (bucket: string, path: string, blob: Blob | File, contentType?: string) => {
    try {
      const file = blob instanceof File ? blob : new File([blob], path.split("/").pop() || "file", { type: contentType || (blob as Blob).type || "application/octet-stream" });
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: true });
      if (uploadErr) {
        console.error(`[uploadToBucket] upload error bucket=${bucket} path=${path}`, uploadErr);
        throw uploadErr;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { publicUrl: data?.publicUrl ?? null, path };
    } catch (err) {
      console.error("[uploadToBucket] error", err);
      throw err;
    }
  };

  /**
   * Create a product row in `products` table for this AI design.
   * Returns inserted product row (product) and uploaded image publicUrl/path.
   */
  const createProductForAiDesign = async (aiImageUrl: string, opts?: { title?: string; description?: string; price?: number; ai_generation_id?: string | number | null }) => {
    if (!user) throw new Error("User required to create product");

    // 1) fetch remote image blob
    const blob = await fetchImageAsBlob(aiImageUrl);
    const ext = blob.type?.split("/")?.[1] ?? "png";
    const sku = `AI-${Date.now()}`;
    const filename = `${sku}.${ext}`;
    const storagePath = `products/${sku}/${filename}`;

    // 2) upload to ai-designs bucket
    const { publicUrl } = await uploadToBucket("ai-designs", storagePath, blob, blob.type);

    // 3) insert product row (single object insert to satisfy TS overload)
    const productRow = {
      sku,
      title: opts?.title ?? `AI Generated — ${prompt?.slice(0, 40) || sku}`,
      description: opts?.description ?? `AI generated design — prompt: ${prompt?.slice(0, 120)}`,
      price: opts?.price ?? price,
      currency: "INR",
      images: [publicUrl],
      images_generated_by_users: 0,
      designer_id: null,
      created_by: user.id,
      visibility: "public",
      date_added: new Date().toISOString(),
      ai_generation_id: opts?.ai_generation_id?.toString() ?? aiGenerationId?.toString() ?? null,
      category: "AI Generated",
      is_ai_generated: true,
      clothing_type: clothingType,
      image_position: imagePosition,
      sizes: size ? [size] : [],
      colors: color ? [color] : [],
      inventory: { total: 1, bySize: {} },
    };

    const { data: product, error } = await supabase
      .from("products")
      .insert(productRow as any)
      .select("*")
      .single();

    if (error) {
      console.error("[createProductForAiDesign] product insert error:", error);
      throw error;
    }

    return { product, publicUrl, storagePath };
  };

  // ---------- main place order ----------
  const placeOrder = async () => {
    if (!user) {
      toast.error("Please sign in to place the order.");
      return;
    }
    if (!size || !color) {
      toast.error("Please select size and color.");
      return;
    }

    setIsPlacing(true);
    toast.loading("Placing order...");

    try {
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
      const total = finalTotal; // Use discounted total

      // 1) If product already exists (passed from generator), use it. Otherwise create product now.
      let productIdToUse: string | null = existingProductId ?? null;
      let aiDesignPublicUrl: string | null = null;

      if (!productIdToUse) {
        if (!imageUrl) throw new Error("No image to create product from.");
        try {
          const { product, publicUrl } = await createProductForAiDesign(imageUrl, {
            title: `AI Design — ${prompt?.slice(0, 30)}`,
            description: `Custom AI design — prompt: ${prompt}`,
            price,
            ai_generation_id: aiGenerationId ?? null,
          });
          productIdToUse = product.id;
          aiDesignPublicUrl = publicUrl;
        } catch (err: any) {
          console.warn("Could not create product; attempting to continue with imageUrl for order_items:", err?.message || err);
          // If product creation fails due to storage/RLS, we'll still create the order and order_item using the design URL.
          aiDesignPublicUrl = imageUrl;
        }
      } else {
        // If product existed, try to fetch its images for linking
        const { data: existingProduct } = await supabase.from("products").select("id, images").eq("id", productIdToUse).single();
        aiDesignPublicUrl = existingProduct?.images?.[0] ?? imageUrl;
      }

      // 2) Generate invoices HTML
      const invoiceHTML = generateInvoiceHTML(orderNumber, aiDesignPublicUrl ?? imageUrl ?? undefined);
      const purchaseHTML = generatePurchaseInvoiceHTML(orderNumber, aiDesignPublicUrl ?? imageUrl ?? undefined);

      // 3) Upload invoices to storage as files (invoices, purchase-invoice)
      const invoiceBlob = new Blob([invoiceHTML], { type: "text/html" });
      const purchaseBlob = new Blob([purchaseHTML], { type: "text/html" });

      try {
        await uploadToBucket("invoices", `${orderNumber}.html`, invoiceBlob, "text/html");
      } catch (e) {
        console.warn("Invoice upload failed:", e);
      }
      try {
        await uploadToBucket("purchase-invoice", `${orderNumber}.html`, purchaseBlob, "text/html");
      } catch (e) {
        console.warn("Purchase invoice upload failed:", e);
      }

      // 4) Create order row
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          total_amount: total,
          currency: "INR",
          status: "processing",
          payment_method: "wallet",
          payment_status: "paid",
          shipping_address_id: null,
          billing_address_id: null,
          invoice_url: `/invoices/${orderNumber}.html`,
          notes: aiDesignPublicUrl ? `AI design uploaded: ${aiDesignPublicUrl}` : (imageUrl ? `Original design: ${imageUrl}` : null),
        } as any)
        .select("id, order_number")
        .single();

      if (orderError || !orderData) {
        console.error("Order insert error:", orderError);
        throw new Error(orderError?.message || "Failed to create order");
      }

      // 5) Insert order_item record referencing product when available
      const orderItemRow: any = {
        order_id: orderData.id,
        product_id: productIdToUse ?? null,
        product_name: `Custom AI ${clothingType}`,
        product_image: aiDesignPublicUrl ?? imageUrl,
        quantity,
        unit_price: price,
        total_price: price * quantity,
        size,
        color,
      };

      const { error: itemError } = await supabase.from("order_items").insert(orderItemRow as any);

      if (itemError) {
        console.error("order_items insert error:", itemError);
        throw new Error(itemError.message || "Failed to create order item");
      }

      // 6) Auto-download invoices locally for user convenience
      setTimeout(() => {
        try {
          downloadBlob(new Blob([invoiceHTML], { type: "text/html" }), `Invoice_${orderNumber}.html`);
          downloadBlob(new Blob([purchaseHTML], { type: "text/html" }), `PurchaseInvoice_${orderNumber}.html`);
        } catch (e) {
          console.warn("Failed to auto-download invoices:", e);
        }
      }, 600);

      toast.success("Order placed — design uploaded and invoices created.");
      navigate(`/order-confirmation/${orderData.order_number ?? orderNumber}`, { replace: true });
    } catch (err: any) {
      console.error("Place order error:", err);
      toast.error(err?.message || "Failed to place order. Try again.");
    } finally {
      setIsPlacing(false);
      toast.dismiss();
    }
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Checkout — Custom AI {clothingType}</h1>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Design</h2>
              <div className="rounded-md overflow-hidden bg-muted p-4">
                {imageUrl ? (
                  <img src={imageUrl} alt="ai design" className="w-full h-auto object-contain" />
                ) : (
                  <div className="text-muted-foreground">No design available</div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
                  <span className="font-semibold text-primary">Cloth Type:</span>
                  <span className="capitalize">{clothingType || "T-Shirt"}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div><strong>Prompt:</strong> {prompt ?? "—"}</div>
                  <div className="mt-1"><strong>Image Position:</strong> {imagePosition}</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Select Size, Color & Quantity</h2>

              <div className="space-y-4">
                <div>
                  <Label className="mb-2">Size</Label>
                  <Select value={size} onValueChange={(v) => setSize(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2">Color</Label>
                  <Select value={color} onValueChange={(v) => setColor(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                    <Input value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || "1")))} className="w-20 text-center" />
                    <Button variant="outline" onClick={() => setQuantity(quantity + 1)}>+</Button>
                  </div>
                </div>

                <div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Subtotal</div>
                        <div className="text-lg font-semibold">₹{subtotal.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Coupon Code */}
                    <div className="border-t pt-4">
                      <Label className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4" /> Coupon Code
                      </Label>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-md">
                          <span className="text-green-700 font-medium">{appliedCoupon.code} (-₹{appliedCoupon.discount})</span>
                          <Button variant="ghost" size="sm" onClick={removeCoupon}>Remove</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter code (e.g. TESORA100)"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="flex-1"
                          />
                          <Button onClick={applyCoupon} disabled={applyingCoupon} variant="outline">
                            {applyingCoupon ? "..." : "Apply"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* First Order Discount */}
                    {isFirstOrder && subtotal > 4000 && (
                      <div className="flex items-center justify-between text-green-600 bg-green-50 p-2 rounded-md">
                        <span className="flex items-center gap-2">
                          <Percent className="w-4 h-4" /> First Order (5% off)
                        </span>
                        <span>-₹{firstOrderDiscount}</span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t pt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-xl font-bold">₹{finalTotal.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Button onClick={placeOrder} className="w-full bg-sale-blue hover:bg-sale-blue/95 text-white" disabled={isPlacing}>
                    {isPlacing ? "Placing order..." : `Place Order — ₹${finalTotal.toLocaleString()}`}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mt-3">
                  This checkout will create order records, upload the AI design into the <code>ai-designs</code> bucket, and generate invoices in <code>invoices</code> and <code>purchase-invoice</code> buckets.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutAI;
