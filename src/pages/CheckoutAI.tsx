// src/pages/CheckoutAI.tsx  (AI Checkout with Razorpay)

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";  // Add Textarea import
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Tag, Percent } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
// @ts-ignore – html2pdf doesn't ship perfect TS types
import html2pdf from "html2pdf.js";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const COLOR_OPTIONS = ["white", "black", "red", "blue", "green", "yellow"];

// 💰 Same price map as in AIGenerator
const CLOTHING_PRICES: Record<string, number> = {
  "t-shirt": 799,
  hoodie: 1499,
  polo: 999,
  tops: 899,
  sweatshirt: 1299,
};

type LocationState = {
  imageUrl?: string;
  prompt?: string;
  style?: string;
  colorScheme?: string;
  clothingType?: string;
  imagePosition?: string;
  ai_generation_id?: string | number | null;
  productId?: string | null; // if AIGenerator already created product (UUID)
  price?: number; // 👈 price passed from AIGenerator
  // 👇 Fields from AIClothConverter
  front?: string; // front design image from AIClothConverter
  back?: string | null; // back design image from AIClothConverter
  selectedSize?: string; // pre-selected size from AIClothConverter
  is_ai_generated?: boolean; // flag from AIClothConverter
};

// Razorpay global type
declare global {
  interface Window {
    Razorpay: any;
  }
}

const CheckoutAI: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isGift, setIsGift] = useState(false);

  const payload = (location.state ?? {}) as LocationState;

  const initialClothingType = payload.clothingType ?? "t-shirt";
  const initialPrice =
    payload.price ??
    CLOTHING_PRICES[initialClothingType] ??
    1999;

  // Handle both AIGenerator (imageUrl) and AIClothConverter (front/back) formats
  const initialImageUrl = payload.imageUrl ?? payload.front ?? null;
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(payload.back ?? null);
  const [prompt, setPrompt] = useState<string>(payload.prompt ?? "");
  const [clothingType, setClothingType] = useState<string>(initialClothingType);
  const [imagePosition, setImagePosition] = useState<string>(
    payload.imagePosition ?? "front"
  );
  const [aiGenerationId, setAiGenerationId] = useState<string | number | null>(
    payload.ai_generation_id ?? null
  );
  const [existingProductId] = useState<string | null>(payload.productId ?? null);

  // Initialize size from payload if provided (from AIClothConverter)
  const initialSize = payload.selectedSize ?? "M";
  const [sizes, setSizes] = useState<string[]>([initialSize]);
  const [colors, setColors] = useState<string[]>(["black"]);
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(initialPrice);
  const [note, setNote] = useState<string>("");
  const [isPlacing, setIsPlacing] = useState(false);

  // Address form state
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    address: "",
    city: "",
    pincode: "",
    phone: "",
    specialInstructions: "",
  });

  // Coupon and discount states
  const [couponCode, setCouponCode] = useState<string>("");

  // Coupon with percentage discount
  type AppliedCoupon = {
    code: string;
    discountPercent: number;      // Percentage value (0-100)
    calculatedDiscount: number;   // Calculated ₹ amount
  };

  const [appliedCoupon, setAppliedCoupon] =
    useState<AppliedCoupon | null>(null);

  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [firstOrderDiscount, setFirstOrderDiscount] = useState<number>(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Order success modal
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    // Try to restore design from sessionStorage if not passed via state
    if (!imageUrl) {
      const savedDesign = sessionStorage.getItem("ai_design_data");
      if (savedDesign) {
        try {
          const parsed = JSON.parse(savedDesign);
          setImageUrl(parsed.imageUrl);
          setPrompt(parsed.prompt || "");

          const ct = parsed.clothingType || "t-shirt";
          setClothingType(ct);
          setImagePosition(parsed.imagePosition || "front");
          setAiGenerationId(parsed.ai_generation_id || null);

          const priceFromStorage =
            parsed.price ??
            CLOTHING_PRICES[ct] ??
            1999;
          setPrice(priceFromStorage);
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
      // Save current design to sessionStorage (include price)
      sessionStorage.setItem(
        "ai_design_data",
        JSON.stringify({
          imageUrl,
          prompt,
          clothingType,
          imagePosition,
          ai_generation_id: aiGenerationId,
          price,
        })
      );
    }

    // Check if this is user's first order
    const checkFirstOrder = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("user_order_stats")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) {
            console.error("Error checking first order:", error);
            setIsFirstOrder(false);
            return;
          }

          if (!data) {
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
  }, [imageUrl, navigate, user, aiGenerationId, clothingType, imagePosition, prompt, price]);

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

      // ✅ Safe date validation
      const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if (validFrom && now < validFrom) {
        toast.error("Coupon not yet active");
        return;
      }

      if (validUntil && now > validUntil) {
        toast.error("Coupon has expired");
        return;
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast.error("Coupon usage limit reached");
        return;
      }

      const subtotal = price * quantity;
      const minOrder = Number(coupon.min_order_amount ?? 0);

      if (subtotal < minOrder) {
        toast.error(`Minimum order is ₹${minOrder}`);
        return;
      }

      // ✅ PERCENTAGE: discount_amount is a percentage (0-100)
      const discountPercent = Number(coupon.discount_amount ?? 0);

      // Validate percentage range
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        toast.error("Invalid coupon configuration");
        return;
      }

      // Calculate discount as percentage of order total
      const calculatedDiscount = Math.round((subtotal * discountPercent) / 100);

      if (calculatedDiscount <= 0) {
        toast.error("Invalid discount amount");
        return;
      }

      setAppliedCoupon({
        code: coupon.code,
        discountPercent,
        calculatedDiscount,
      });

      toast.success(
        `${discountPercent}% OFF applied (-₹${calculatedDiscount})`
      );
    } catch (err) {
      console.error("Coupon apply error:", err);
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
  const totalDiscount =
    (appliedCoupon?.calculatedDiscount || 0) + firstOrderDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  // ---------- helpers ----------
  const escapeHtml = (s?: string) => {
    if (!s) return "";
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  const downloadPdfFromHtml = (html: string, filename: string) => {
    const opt = {
      margin: 8,
      filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    };

    // @ts-ignore
    html2pdf()
      .set(opt)
      .from(html)
      .save()
      .catch((err: any) => {
        console.error("PDF download failed:", err);
      });
  };

  // fetch remote image and return Blob (may fail due to CORS)
  const fetchImageAsBlob = async (url: string) => {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    return await res.blob();
  };

  const generateInvoiceHTML = (orderNumber: string, aiDesignPublicUrl?: string) => {
    const invoiceDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const total = finalTotal.toFixed(2);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice #${orderNumber}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    color: #222;
    line-height: 1.5;
    font-size: 12px;
  }
  .page {
    width: 750px;
    margin: 24px auto 40px;
  }
  .header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  h1 {
    margin: 0;
    font-size: 26px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
  }
  th {
    background: #f5f5f5;
    padding: 10px;
    text-align: left;
    font-weight: bold;
  }
  td {
    padding: 10px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }
  .right { text-align: right; }
  .totals {
    width: 320px;
    margin-left: auto;
    margin-top: 16px;
  }
  .total-row {
    font-weight: 700;
    border-top: 2px solid #000;
    padding-top: 8px;
  }
  .footer {
    margin-top: 36px;
    text-align: center;
    color: #666;
    font-size: 11px;
    border-top: 1px solid #eee;
    padding-top: 12px;
  }
  .detail-badge {
    background: #e3f2fd;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
    display: inline-block;
    margin-right: 8px;
    margin-bottom: 6px;
  }
  .address-box {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
  }
  .label {
    font-weight: 600;
  }
  .section-title {
    margin-top: 18px;
    font-weight: 600;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>Invoice</h1>
    <div>Order #${orderNumber}</div>
    <div>${invoiceDate}</div>
  </div>

  <div class="address-box">
    <div class="label">
  ${isGift ? "Gift Recipient:" : "Ship To:"}
</div>
    ${escapeHtml(formData.name)}<br/>
    ${escapeHtml(formData.address)}<br/>
    ${escapeHtml(formData.city)}, ${escapeHtml(formData.pincode)}<br/>
    Phone: ${escapeHtml(formData.phone)}<br/>
    Email: ${escapeHtml(formData.email)}
  </div>

  <div class="section-title">Item</div>
  <table>
    <thead>
      <tr>
        <th style="width: 22%">Product</th>
        <th style="width: 48%">Details</th>
        <th style="width: 10%" class="right">Qty</th>
        <th style="width: 10%" class="right">Unit</th>
        <th style="width: 10%" class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Custom AI Design</td>
        <td>
          <div>
            <span class="detail-badge">Cloth&nbsp;${escapeHtml(clothingType)}</span>
            <span class="detail-badge">Size&nbsp;${escapeHtml(sizes.join(", "))}</span>
            <span class="detail-badge">Color&nbsp;${escapeHtml(colors.join(", "))}}</span>
          </div>
          <div style="font-size:11px;margin-top:4px;">
            Position: ${escapeHtml(imagePosition)}<br/>
            ${prompt
        ? `Prompt: ${escapeHtml(prompt)}`
        : ""
      }
          </div>
        </td>
        <td class="right">${quantity}</td>
        <td class="right">Rs ${Number(price).toFixed(2)}</td>
        <td class="right">Rs ${(price * quantity).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Subtotal</td>
      <td class="right">Rs ${(price * quantity).toFixed(2)}</td>
    </tr>
    ${appliedCoupon
        ? `<tr>
             <td>
                Coupon (${appliedCoupon.code}) — ₹${appliedCoupon.calculatedDiscount} OFF
              </td>
              <td class="right">
                -Rs ${appliedCoupon.calculatedDiscount.toFixed(2)}
              </td>
           </tr>`
        : ""
      }
    ${firstOrderDiscount > 0
        ? `<tr>
             <td>First Order (5%)</td>
             <td class="right">-Rs ${firstOrderDiscount.toFixed(2)}</td>
           </tr>`
        : ""
      }
    <tr>
      <td>Shipping</td>
      <td class="right">Free</td>
    </tr>
    <tr class="total-row">
      <td>Total</td>
      <td class="right">Rs ${total}</td>
    </tr>
  </table>

  <div class="section-title" style="margin-top:20px;">Design</div>
  <div style="font-size:11px;">
    AI Design reference:&nbsp;${aiDesignPublicUrl
        ? `<a href="${aiDesignPublicUrl}">View uploaded design</a>`
        : imageUrl
          ? `<a href="${imageUrl}">View original design</a>`
          : "—"
      }
  </div>

  <div class="footer">
    Thank you for your purchase! If you have questions, contact support.
  </div>
</div>
</body>
</html>`;
  };

  const generatePurchaseInvoiceHTML = (orderNumber: string, aiDesignPublicUrl?: string) => {
    const invoiceDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return `
    <!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Manufacturing Order #${orderNumber}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    color: #222;
    line-height: 1.5;
    font-size: 12px;
    background: #fff;
  }
  .page {
    /* Reduced width from 750px to 700px to ensure it fits A4 margins */
    width: 700px;
    margin: 20px auto;
    /* Added internal padding as a safe gutter for PDF printers */
    padding: 15px;
  }
  .header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  h1 {
    margin: 0;
    font-size: 24px;
    letter-spacing: 1px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
    /* Forces the table to stay within the 700px container */
    table-layout: fixed;
  }
  th {
    background: #f5f5f5;
    padding: 10px;
    text-align: left;
    font-weight: bold;
    border-bottom: 2px solid #ddd;
  }
  td {
    padding: 8px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
    word-wrap: break-word; /* Prevents long text from pushing the table wider */
  }
  .right { 
    text-align: right; 
    /* Extra padding on the right to prevent clipping of numbers */
    padding-right: 10px; 
  }
  .small { font-size: 11px; color: #555; }
  .highlight {
    background: #fff3cd;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: bold;
    display: inline-block;
    border: 1px solid #ffeeba;
  }
  .address-box {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
    border: 1px solid #e9ecef;
  }
  .section-title {
    margin-top: 18px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    color: #666;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>MANUFACTURING ORDER</h1>
    <div style="margin-top: 5px;">Order #${orderNumber} — ${invoiceDate}</div>
  </div>

  <div class="address-box">
    <div class="small" style="font-weight:600; margin-bottom: 5px;">📍 SHIP TO:</div>
    <div style="font-weight:600; font-size: 14px;">${escapeHtml(formData.name)}</div>
    <div style="margin-top: 4px;">
      ${escapeHtml(formData.address)}<br/>
      ${escapeHtml(formData.city)}, ${escapeHtml(formData.pincode)}<br/>
      <strong>📞 Phone:</strong> ${escapeHtml(formData.phone)}
    </div>
  </div>

  <div class="section-title">Production Details</div>
  <table>
    <thead>
      <tr>
        <th style="width: 25%">Product</th>
        <th style="width: 25%">Cloth Type</th>
        <th style="width: 15%">Size</th>
        <th style="width: 20%">Color</th>
        <th style="width: 15%" class="right">Qty</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Custom AI Design</td>
        <td><span class="highlight">${escapeHtml(clothingType)}</span></td>
        <td><span class="highlight">${escapeHtml(sizes.join(", "))}</span></td>
        <td><span class="highlight">${escapeHtml(colors.join(", "))}</span></td>
        <td class="right"><strong>${quantity}</strong></td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
    <div class="section-title" style="margin-top: 0;">Design & Reference</div>
    <p class="small" style="line-height: 1.6;">
      <strong>AI Design Reference:</strong>&nbsp;${aiDesignPublicUrl
        ? `<a href="${aiDesignPublicUrl}">Design link</a>`
        : imageUrl
          ? `<a href="${imageUrl}">Original design</a>`
          : "—"
      }<br/>
      <strong>Image Position:</strong> ${escapeHtml(imagePosition)}<br/>
      <strong>Design Prompt:</strong> ${prompt ? escapeHtml(prompt) : "—"}
    </p>
  </div>

  <div class="small" style="margin-top: 25px; font-style: italic; color: #888; text-align: center;">
    Please follow the size &amp; color breakdown above. Confirm fabric availability and lead time before production.
  </div>
</div>
</body>
</html>
`;
  };

  /**
   * Upload arbitrary Blob/File to a bucket and return publicUrl & path.
   */
  const uploadToBucket = async (
    bucket: string,
    path: string,
    blob: Blob | File,
    contentType?: string
  ) => {
    try {
      const file =
        blob instanceof File
          ? blob
          : new File([blob], path.split("/").pop() || "file", {
            type: contentType || (blob as Blob).type || "application/octet-stream",
          });

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: true });

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
   */
  const createProductForAiDesign = async (
    aiImageUrl: string,
    opts?: {
      title?: string;
      description?: string;
      price?: number;
      ai_generation_id?: string | number | null;
    }
  ) => {
    if (!user) throw new Error("User required to create product");

    // 1) fetch remote image blob
    const blob = await fetchImageAsBlob(aiImageUrl);
    const ext = blob.type?.split("/")?.[1] ?? "png";
    const sku = `AI-${Date.now()}`;
    const filename = `${sku}.${ext}`;
    const storagePath = `products/${sku}/${filename}`;

    // 2) upload to ai-designs bucket
    const { publicUrl } = await uploadToBucket("ai-designs", storagePath, blob, blob.type);

    // 3) insert product row
    const productRow = {
      sku,
      title: opts?.title ?? `AI Generated — ${prompt?.slice(0, 40) || sku}`,
      description:
        opts?.description ??
        `AI generated design — prompt: ${prompt?.slice(0, 120)}`,
      price: opts?.price ?? price,
      currency: "INR",
      images: [publicUrl],
      images_generated_by_users: 0,
      designer_id: null,
      created_by: user.id,
      visibility: "public",
      date_added: new Date().toISOString(),
      ai_generation_id:
        opts?.ai_generation_id?.toString() ?? aiGenerationId?.toString() ?? null,
      category: "AI Generated",
      is_ai_generated: true,
      clothing_type: clothingType,
      image_position: imagePosition,
      sizes,
      colors,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  /**
   * Create order in Supabase AFTER Razorpay payment is verified
   */
  const createOrderInSupabase = async (
    orderNumber: string,
    razorpayPaymentId: string,
    razorpayOrderId: string
  ) => {
    if (quantity > 1 && !formData.specialInstructions.trim()) {
      throw new Error(
        "Special instructions required for multiple quantity orders"
      );
    }

    const total = finalTotal;

    // 0) Create shipping address
    const { data: addressData, error: addressError } = await supabase
      .from("addresses")
      .insert({
        user_id: user!.id,
        address_type: "shipping",
        full_name: formData.name,
        phone: formData.phone,
        address_line1: formData.address,
        city: formData.city,
        state: formData.city,
        postal_code: formData.pincode,
        country: "India",
      })
      .select()
      .single();

    if (addressError) {
      console.error("Address creation error:", addressError);
      throw new Error("Failed to save shipping address");
    }

    // 1) Ensure product exists
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
        console.warn(
          "Could not create product; attempting to continue with imageUrl for order_items:",
          err?.message || err
        );
        aiDesignPublicUrl = imageUrl;
      }
    } else {
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id, images")
        .eq("id", productIdToUse)
        .single();
      aiDesignPublicUrl = existingProduct?.images?.[0] ?? imageUrl;
    }

    // 2) Generate invoices HTML
    const invoiceHTML = generateInvoiceHTML(
      orderNumber,
      aiDesignPublicUrl ?? imageUrl ?? undefined
    );
    const purchaseHTML = generatePurchaseInvoiceHTML(
      orderNumber,
      aiDesignPublicUrl ?? imageUrl ?? undefined
    );

    // 3) Upload invoices
    const invoiceBlob = new Blob([invoiceHTML], { type: "text/html" });
    const purchaseBlob = new Blob([purchaseHTML], { type: "text/html" });

    let publicInvoiceUrl: string | null = null;

    try {
      const { publicUrl } = await uploadToBucket(
        "invoices",
        `${orderNumber}.html`,
        invoiceBlob,
        "text/html"
      );
      publicInvoiceUrl = publicUrl;
    } catch (e) {
      console.warn("Invoice upload failed:", e);
    }

    try {
      await uploadToBucket(
        "purchase-invoice",
        `${orderNumber}.html`,
        purchaseBlob,
        "text/html"
      );
    } catch (e) {
      console.warn("Purchase invoice upload failed:", e);
    }

    // 4) Create order row (paid via Razorpay)
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user!.id,
        order_number: orderNumber,
        total_amount: total,
        currency: "INR",
        status: "processing",
        payment_method: "razorpay",
        payment_status: "paid",
        shipping_address_id: addressData.id,
        billing_address_id: addressData.id,
        invoice_url: publicInvoiceUrl,
        notes: [
          isGift ? "🎁 This order is a gift" : null,
          formData.specialInstructions.trim()
            ? `Special Instructions: ${formData.specialInstructions.trim()}`
            : null,
          appliedCoupon
            ? `Coupon: ${appliedCoupon.code} (-₹${appliedCoupon.calculatedDiscount})`
            : null,
          firstOrderDiscount > 0
            ? `First Order Discount (-₹${firstOrderDiscount})`
            : null,
          quantity > 1
            ? `Sizes: ${sizes.join(", ")} | Colors: ${colors.join(", ")} | Mapping: ${formData.specialInstructions}`
            : null,
          `RP_OID: ${razorpayOrderId}`,
          `RP_PID: ${razorpayPaymentId}`
        ].filter(Boolean).join(" | "),

      } as any)
      .select("id, order_number")
      .single();

    if (orderError || !orderData) {
      console.error("Order insert error:", orderError);
      throw new Error(orderError?.message || "Failed to create order");
    }

    // 5) Insert order_item
    const orderItemRow: any = {
      order_id: orderData.id,
      product_id: productIdToUse ?? null,
      product_name: `Custom AI ${clothingType}`,
      product_image: aiDesignPublicUrl ?? imageUrl,
      quantity,
      unit_price: price,
      total_price: price * quantity,
      size: sizes.join(", "),
      color: colors.join(", "),
    };


    const { error: itemError } = await supabase.from("order_items").insert(orderItemRow as any);

    if (itemError) {
      console.error("order_items insert error:", itemError);
      throw new Error(itemError.message || "Failed to create order item");
    }

    // 6) RESET AI GENERATION COUNT IF >= 20
    try {
      const { data: genStats, error: genError } = await supabase
        .from("user_generation_stats")
        .select("generation_count")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!genError && genStats && genStats.generation_count >= 20) {
        await supabase
          .from("user_generation_stats")
          .update({
            generation_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user!.id);
      }
    } catch (err) {
      console.error("Error resetting generation count after AI checkout:", err);
    }

    // 7) Auto-download invoices as PDF
    setTimeout(() => {
      try {
        downloadPdfFromHtml(invoiceHTML, `Invoice_${orderNumber}.pdf`);
        downloadPdfFromHtml(purchaseHTML, `PurchaseInvoice_${orderNumber}.pdf`);
      } catch (e) {
        console.warn("Failed to auto-download PDF invoices:", e);
      }
    }, 600);

    // 8) Show success modal (no navigation)
    setOrderNumber(orderNumber);
    setOrderPlaced(true);
    toast.success("Order placed — payment successful and invoices created.");
  };

  /**
   * Main: click "Place Order" → validate → Razorpay → verify → create order
   */
  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("Please sign in to place the order.");
      return;
    }
    if (quantity > 1) {
      if (sizes.length === 0 || colors.length === 0) {
        toast.error("Please select sizes and colors for multiple quantity orders.");
        return;
      }

      if (!formData.specialInstructions.trim()) {
        toast.error(
          "Please specify size–color mapping in Special Instructions."
        );
        return;
      }
    }
    if (
      !formData.name ||
      !formData.email ||
      !formData.address ||
      !formData.city ||
      !formData.pincode ||
      !formData.phone
    ) {
      toast.error("Please fill in all address fields.");
      return;
    }

    setIsPlacing(true);

    try {
      const orderNumber = `ORDAI${Date.now().toString().slice(-8)}`;

      // 1️⃣ Create Razorpay order via Edge Function
      const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
        body: {
          amount: finalTotal, // rupees
          currency: "INR",
        },
      });

      if (error || !data) {
        console.error("razorpay-create-order error:", error, data);
        toast.error("Failed to start payment");
        setIsPlacing(false);
        return;
      }

      const { orderId, keyId, amount, currency } = data as any;

      // 2️⃣ Open Razorpay Checkout
      const options = {
        key: keyId,
        amount, // in paise
        currency,
        name: "Tesora Lifestyle",
        description: `AI Order ${orderNumber}`,
        order_id: orderId,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#111827",
        },
        handler: async (response: any) => {
          try {
            // 3️⃣ Verify payment via Edge Function
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "razorpay-verify-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );

            if (verifyError || !verifyData || !(verifyData as any).success) {
              console.error("razorpay-verify-payment error:", verifyError, verifyData);
              toast.error("Payment verification failed");
              setIsPlacing(false);
              return;
            }

            // 4️⃣ Payment verified → create order in Supabase
            await createOrderInSupabase(
              orderNumber,
              response.razorpay_payment_id,
              response.razorpay_order_id
            );
          } catch (err: any) {
            console.error("Error after payment:", err);
            toast.error(
              err?.message || "Something went wrong after payment. Please contact support."
            );
          } finally {
            setIsPlacing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPlacing(false);
            toast.message("Payment cancelled");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Error starting Razorpay:", error);
      toast.error("Failed to start payment. Please try again.");
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
          <h1 className="text-2xl font-bold">
            Checkout — Custom AI {clothingType}
          </h1>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Design</h2>
              <div className="rounded-md overflow-hidden bg-muted p-4">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="ai design"
                    className="w-full h-auto object-contain"
                  />
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
                  <div>
                    <strong>Prompt:</strong> {prompt ?? "—"}
                  </div>
                  <div className="mt-1">
                    <strong>Image Position:</strong> {imagePosition}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">
                Select Size, Color & Quantity
              </h2>

              <div className="space-y-4">
                <div>
                  <Label className="mb-2">Size</Label>

                  {quantity > 1 ? (
                    <div className="flex flex-wrap gap-2">
                      {SIZE_OPTIONS.map((s) => (
                        <Button
                          key={s}
                          type="button"
                          variant={sizes.includes(s) ? "default" : "outline"}
                          onClick={() =>
                            setSizes((prev) =>
                              prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                            )
                          }
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Select
                      value={sizes[0]}
                      onValueChange={(v) => setSizes([v])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label className="mb-2">Color</Label>

                  {quantity > 1 ? (
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map((c) => (
                        <Button
                          key={c}
                          type="button"
                          variant={colors.includes(c) ? "default" : "outline"}
                          onClick={() =>
                            setColors((prev) =>
                              prev.includes(c)
                                ? prev.filter((x) => x !== c)
                                : [...prev, c]
                            )
                          }
                        >
                          {c}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Select
                      value={colors[0]}
                      onValueChange={(v) => setColors([v])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <Input
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, parseInt(e.target.value || "1")))
                      }
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* 💰 Show price per item */}
                <div className="pt-2">
                  <div className="text-sm text-muted-foreground">
                    Price per item
                  </div>
                  <div className="text-lg font-semibold">
                    ₹{price.toLocaleString()}
                  </div>
                </div>

                {/* Gift Option */}
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isGift"
                    checked={isGift}
                    onChange={(e) => setIsGift(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isGift" className="cursor-pointer">
                    Is this a gift?
                  </Label>
                </div>


                {/* Shipping Address Form */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-4">
                    {isGift ? "Gift Recipient Details" : "Shipping Address"}
                  </h3>

                  {isGift && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Please enter the recipient’s delivery details.
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Street address, apartment, etc."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pincode">PIN Code *</Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          placeholder="XXXXXX"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Subtotal
                        </div>
                        <div className="text-lg font-semibold">
                          ₹{subtotal.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Coupon Code */}
                    <div className="border-t pt-4">
                      <Label className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4" /> Coupon Code
                      </Label>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-md">
                          <span className="text-green-700 font-medium">
                            {appliedCoupon.code} (₹{appliedCoupon.calculatedDiscount} OFF)
                          </span>
                          <Button variant="ghost" size="sm" onClick={removeCoupon}>
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter code (e.g. TESORA100)"
                            value={couponCode}
                            onChange={(e) =>
                              setCouponCode(e.target.value.toUpperCase())
                            }
                            className="flex-1"
                          />
                          <Button
                            onClick={applyCoupon}
                            disabled={applyingCoupon}
                            variant="outline"
                          >
                            {applyingCoupon ? "..." : "Apply"}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Special Instructions */}
                    {/* Special Instructions */}
                    <div className="border-t pt-4">
                      <Label className="mb-2 block">
                        Special Instructions {quantity > 1 && <span className="text-red-500">*</span>}
                      </Label>

                      <Textarea
                        value={formData.specialInstructions}
                        onChange={(e) =>
                          setFormData({ ...formData, specialInstructions: e.target.value })
                        }
                        rows={4}
                        placeholder="Explain how sizes and colors should be applied..."
                        className={`resize-none ${quantity > 1 && !formData.specialInstructions.trim()
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                          }`}
                      />

                      {quantity > 1 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <strong className="text-foreground">
                            Required for quantity &gt; 1.
                          </strong>{" "}
                          Please clearly specify size–color mapping.
                          <br /><br />
                          <strong>Examples:</strong>
                          <br />• 2 × Black (Size M), 1 × White (Size L)
                          <br />• Size M → Black (2 pcs), Blue (1 pc)
                          <br />• Color Red → Size S (1 pc), Size M (2 pcs)
                        </p>
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
                      <div className="text-xl font-bold">
                        ₹{finalTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Button
                    onClick={handlePlaceOrder}
                    className="w-full bg-sale-blue hover:bg-sale-blue/95 text-white"
                    disabled={isPlacing}
                  >
                    {isPlacing
                      ? "Processing payment..."
                      : `Pay & Place Order — ₹${finalTotal.toLocaleString()}`}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mt-3">
                  This checkout will process payment via Razorpay, create order
                  records, upload the AI design into the{" "}
                  <code>ai-designs</code> bucket, and generate invoices in{" "}
                  <code>invoices</code> and <code>purchase-invoice</code>{" "}
                  buckets. PDFs will also be downloaded to your device
                  automatically after placing the order.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Placed Modal */}
      <Dialog open={orderPlaced} onOpenChange={setOrderPlaced}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Placed Successfully!</DialogTitle>
            <DialogDescription>
              {orderNumber
                ? `Your order ${orderNumber} has been placed successfully.`
                : "Your order has been placed successfully."}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground mb-4">
            Your payment is confirmed and invoices have been generated. You can
            generate more AI designs or continue shopping.
          </p>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setOrderPlaced(false);
                navigate("/ai-generator");
              }}
            >
              Generate More
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setOrderPlaced(false);
                navigate("/");
              }}
            >
              Shop More
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutAI;
