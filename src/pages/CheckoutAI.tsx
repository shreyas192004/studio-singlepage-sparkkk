import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const COLOR_OPTIONS = ["white", "black", "red", "blue", "green", "yellow"];

type LocationState = {
  imageUrl?: string;
  prompt?: string;
  style?: string;
  colorScheme?: string;
  clothingType?: string;
  imagePosition?: string;
  ai_generation_id?: string | null;
};

const CheckoutAI: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // payload passed from AIGenerator via navigate("/checkout-ai", { state: payload })
  const payload = (location.state ?? {}) as LocationState;

  const [imageUrl, setImageUrl] = useState<string | null>(payload.imageUrl ?? null);
  const [prompt, setPrompt] = useState<string>(payload.prompt ?? "");
  const [clothingType, setClothingType] = useState<string>(payload.clothingType ?? "t-shirt");
  const [imagePosition, setImagePosition] = useState<string>(payload.imagePosition ?? "front");
  const [aiGenerationId, setAiGenerationId] = useState<string | null>(payload.ai_generation_id ?? null);

  const [size, setSize] = useState<string>("M");
  const [color, setColor] = useState<string>("black");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(1999); // base price, change as needed
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      toast.error("No design found. Please generate a design first.");
      navigate("/ai-generator");
    }
  }, [imageUrl, navigate]);

  // ---------- helpers ----------
  const escapeHtml = (s?: string) => {
    if (!s) return "";
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
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

  // ---------- invoice HTML generators ----------
  const generateInvoiceHTML = (orderNumber: string, aiDesignPublicUrl?: string) => {
    const invoiceDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const total = (price * quantity).toFixed(2);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice #${orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 36px; color: #222; }
          .header { text-align:center; border-bottom:2px solid #000; padding-bottom:14px; margin-bottom:18px; }
          h1 { margin:0; font-size:28px; }
          .section { margin-bottom:14px; }
          table { width:100%; border-collapse: collapse; margin-top:12px; }
          th { text-align:left; background:#f5f5f5; padding:10px; border-bottom:1px solid #ddd; }
          td { padding:10px; border-bottom:1px solid #eee; vertical-align:top; }
          .right { text-align:right; }
          .totals { width:320px; margin-left:auto; margin-top:10px; }
          .total-row { font-weight:700; border-top:2px solid #000; padding-top:8px; }
          .footer { margin-top:36px; text-align:center; color:#666; font-size:13px; border-top:1px solid #eee; padding-top:12px; }
          a { color:#0b69ff; text-decoration:none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoice</h1>
          <div>Order #${orderNumber}</div>
          <div>${invoiceDate}</div>
        </div>

        <div class="section">
          <strong>Bill To:</strong><br/>
          ${user?.email ?? "—"}<br/>
        </div>

        <div class="section">
          <strong>Item</strong>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Details</th>
                <th class="right">Qty</th>
                <th class="right">Unit</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Custom AI ${escapeHtml(clothingType)}</td>
                <td>
                  ${prompt ? `Prompt: ${escapeHtml(prompt)}<br/>` : ""}
                  Position: ${escapeHtml(imagePosition)}<br/>
                  Size: ${escapeHtml(size)}<br/>
                  Color: ${escapeHtml(color)}
                </td>
                <td class="right">${quantity}</td>
                <td class="right">Rs ${Number(price).toFixed(2)}</td>
                <td class="right">Rs ${(price * quantity).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="right">Rs ${(price * quantity).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Shipping:</td>
              <td class="right">Free</td>
            </tr>
            <tr class="total-row">
              <td>Total:</td>
              <td class="right">Rs ${total}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <strong>Design:</strong><br/>
          ${aiDesignPublicUrl ? `<a href="${aiDesignPublicUrl}">View Uploaded Design</a>` : (imageUrl ? `<a href="${imageUrl}">View Original Design</a>` : "—")}
        </div>

        <div class="footer">
          Thank you for your purchase! If you have questions, contact support.
        </div>
      </body>
      </html>
    `;
  };

  const generatePurchaseInvoiceHTML = (orderNumber: string, aiDesignPublicUrl?: string) => {
    const invoiceDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Manufacturing Order #${orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 36px; color:#222; }
          .header { text-align:center; margin-bottom:18px; }
          h1 { margin:0; font-size:24px; }
          .section { margin-bottom:14px; }
          table { width:100%; border-collapse:collapse; }
          th { background:#f5f5f5; padding:10px; text-align:left; }
          td { padding:8px; border-bottom:1px solid #eee; }
          .right { text-align:right; }
          .small { font-size:13px; color:#555; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MANUFACTURING ORDER</h1>
          <div>Order #${orderNumber} — ${invoiceDate}</div>
        </div>

        <div class="section">
          <strong>Buyer:</strong><br/>
          ${user?.email ?? "—"}
        </div>

        <div class="section">
          <h3>Production Details</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Cloth Type</th>
                <th>Size</th>
                <th>Color</th>
                <th class="right">Qty</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Custom AI ${escapeHtml(clothingType)}</td>
                <td>${escapeHtml(clothingType)}</td>
                <td>${escapeHtml(size)}</td>
                <td>${escapeHtml(color)}</td>
                <td class="right">${quantity}</td>
              </tr>
            </tbody>
          </table>

          <p class="small">
            AI Design reference: ${aiDesignPublicUrl ? `<a href="${aiDesignPublicUrl}">Design link</a>` : (imageUrl ? `<a href="${imageUrl}">Original design</a>` : "—")}<br/>
            Prompt: ${prompt ? escapeHtml(prompt) : "—"}
          </p>
        </div>

        <div class="section small">
          Please follow the size & color breakdown above. Confirm fabric availability and lead time before production.
        </div>
      </body>
      </html>
    `;
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

    try {
      // 1) generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
      const total = price * quantity;

      // 2) upload generated image into 'ai-designs' bucket under folder for this order (if available)
      let aiDesignPublicUrl: string | null = null;
      if (imageUrl) {
        try {
          const imgBlob = await fetchImageAsBlob(imageUrl);
          const ext = (imgBlob.type && imgBlob.type.split("/")[1]) || "png";
          const designPath = `${orderNumber}/design.${ext}`; // we'll upload into bucket root folder orderNumber
          const { error: uploadErr } = await supabase.storage
            .from("ai-designs")
            .upload(designPath, imgBlob, { contentType: imgBlob.type, upsert: true });

          if (uploadErr) {
            console.warn("ai-design upload error:", uploadErr);
          } else {
            const { data } = supabase.storage.from("ai-designs").getPublicUrl(designPath);
            aiDesignPublicUrl = data?.publicUrl ?? null;
          }
        } catch (err) {
          console.warn("Failed to upload ai-design to storage:", err);
          // continue — invoices will reference original imageUrl if upload failed
        }
      }

      // 3) generate invoices (customer + purchase), include aiDesignPublicUrl when available
      const invoiceHTML = generateInvoiceHTML(orderNumber, aiDesignPublicUrl ?? imageUrl ?? undefined);
      const purchaseHTML = generatePurchaseInvoiceHTML(orderNumber, aiDesignPublicUrl ?? imageUrl ?? undefined);

      // 4) upload invoices to storage:
      //    - customer invoice -> bucket "invoices"
      //    - manufacturer (purchase) invoice -> bucket "purchase-invoice" (as you requested)
      const invoicePath = `${orderNumber}.html`;
      const purchasePath = `${orderNumber}.html`;

      const invoiceBlob = new Blob([invoiceHTML], { type: "text/html" });
      const purchaseBlob = new Blob([purchaseHTML], { type: "text/html" });

      const { error: uploadInvoiceErr } = await supabase.storage
        .from("invoices")
        .upload(invoicePath, invoiceBlob, { contentType: "text/html", upsert: true });

      if (uploadInvoiceErr) {
        console.warn("invoice upload error:", uploadInvoiceErr);
      }

      const { error: uploadPurchaseErr } = await supabase.storage
        .from("purchase-invoice")
        .upload(purchasePath, purchaseBlob, { contentType: "text/html", upsert: true });

      if (uploadPurchaseErr) {
        console.warn("purchase invoice upload error:", uploadPurchaseErr);
      }

      // 5) get public URLs (if buckets are public)
      const { data: invoiceUrlData } = supabase.storage.from("invoices").getPublicUrl(invoicePath);
      const invoicePublicUrl = invoiceUrlData?.publicUrl ?? null;

      const { data: purchaseUrlData } = supabase.storage.from("purchase-invoice").getPublicUrl(purchasePath);
      const purchasePublicUrl = purchaseUrlData?.publicUrl ?? null;

      // 6) create order row and save invoice URLs (we won't put invoice data into order_items)
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
          invoice_url: invoicePublicUrl,
        //   purchase_invoice_url: purchasePublicUrl,
          notes: aiDesignPublicUrl ? `AI design uploaded: ${aiDesignPublicUrl}` : (imageUrl ? `Original design: ${imageUrl}` : null),
        })
        .select("id, order_number")
        .single();

      if (orderError || !orderData) {
        throw new Error(orderError?.message || "Failed to create order");
      }

      // 7) insert order_item(s) WITHOUT storing invoice content — only product info + design ref
    //   const { error: itemError } = await supabase
    //     .from("order_items")
    //     .insert({
    //       order_id: orderData.id,
    //       product_id: null,
    //       product_name: `Custom AI ${clothingType}`,
    //       product_image: aiDesignPublicUrl ?? imageUrl,
    //       quantity,
    //       unit_price: price,
    //       total_price: total,
    //       size,
    //       color,
    //       item_type: "custom_ai",
    //       design_id: aiGenerationId ?? null,
    //       cloth_type: clothingType,
    //       // metadata intentionally excludes invoice URLs; keep only prompt/design ref
    //       metadata: {
    //         prompt,
    //         image_position: imagePosition,
    //         ai_design_url: aiDesignPublicUrl ?? imageUrl ?? null,
    //       },
    //     });

    //   if (itemError) {
    //     throw new Error(itemError.message || "Failed to create order item");
    //   }

      // 8) success: auto-download customer invoice and navigate to confirmation
      // Auto-download both invoices
        setTimeout(() => {
        // download customer invoice
        const customerBlob = new Blob([invoiceHTML], { type: "text/html" });
        downloadBlob(customerBlob, `Invoice_${orderNumber}.html`);

        // download purchase/manufacturer invoice
        const purchaseBlob = new Blob([purchaseHTML], { type: "text/html" });
        downloadBlob(purchaseBlob, `Purchase_Invoice_${orderNumber}.html`);
        }, 700);


      toast.success("Order placed — design uploaded and invoices created.");
      navigate(`/order-confirmation/${orderData.order_number ?? orderNumber}`, { replace: true });
    } catch (err: any) {
      console.error("Place order error:", err);
      toast.error(err?.message || "Failed to place order. Try again.");
    } finally {
      setIsPlacing(false);
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

              <div className="mt-4 text-sm text-muted-foreground">
                <div><strong>Prompt:</strong> {prompt ?? "—"}</div>
                <div className="mt-1"><strong>Position:</strong> {imagePosition}</div>
                <div className="mt-1"><strong>Design ID:</strong> {aiGenerationId ?? "—"}</div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Price</div>
                      <div className="text-xl font-bold">₹{price.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-xl font-bold">₹{(price * quantity).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Button onClick={placeOrder} className="w-full bg-sale-blue hover:bg-sale-blue/95 text-white" disabled={isPlacing}>
                    {isPlacing ? "Placing order..." : `Place Order — ₹${(price * quantity).toLocaleString()}`}
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
