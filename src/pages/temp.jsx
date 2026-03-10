import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 ArrowLeft,
 Eye,
 Download,
 FileText,
 Package,
 Search,
 Home,
} from "lucide-react";
import { toast } from "sonner";
// @ts-ignore - html2pdf has no perfect TS types
import html2pdf from "html2pdf.js";

interface OrderItem {
 id: string;
 order_id: string;
 product_id: string;
 product_name: string;
 product_image: string | null;
 quantity: number;
 unit_price: number;
 total_price: number;
 size: string | null;
 color: string | null;
 clothing_type?: string | null;
 image_position?: string | null;
}

interface Address {
 full_name: string;
 phone: string;
 address_line1: string;
 address_line2: string | null;
 city: string;
 state: string;
 postal_code: string;
 country: string;
}

interface Order {
 id: string;
 order_number: string;
 status: string;
 total_amount: number;
 currency: string;
 payment_status: string;
 created_at: string;
 user_id: string;
 notes: string | null;
 order_items: OrderItem[];
 shipping_address: Address | null;
}

const statusColors: Record<string, string> = {
 pending: "bg-yellow-100 text-yellow-800",
 processing: "bg-blue-100 text-blue-800",
 shipped: "bg-purple-100 text-purple-800",
 delivered: "bg-green-100 text-green-800",
 cancelled: "bg-red-100 text-red-800",
};

const statusOptions = ["pending", "delivered", "cancelled"];

// -------- date filter helper --------
const isWithinDateFilter = (createdAt: string, filter: string): boolean => {
 if (filter === "all") return true;

 const orderDate = new Date(createdAt);
 const now = new Date();

 const startOfToday = new Date(
   now.getFullYear(),
   now.getMonth(),
   now.getDate()
 );
 const msInDay = 24 * 60 * 60 * 1000;

 if (filter === "today") {
   return orderDate >= startOfToday;
 }

 let days = 0;
 if (filter === "last7") days = 7;
 if (filter === "last15") days = 15;
 if (filter === "last30") days = 30;

 const cutoff = new Date(startOfToday.getTime() - days * msInDay);
 return orderDate >= cutoff;
};

const AdminAIGeneratedOrders = () => {
 const { user, isAdmin, loading } = useAdmin();
 const navigate = useNavigate();
 const [orders, setOrders] = useState<Order[]>([]);
 const [loadingOrders, setLoadingOrders] = useState(true);
 const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
 const [detailsOpen, setDetailsOpen] = useState(false);
 const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

 // ---- filters ----
 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [dateFilter, setDateFilter] = useState<string>("all");

 useEffect(() => {
   if (!loading && !isAdmin) {
     navigate("/admin/login");
   }
 }, [isAdmin, loading, navigate]);

 useEffect(() => {
   if (user && isAdmin) {
     fetchAIGeneratedOrders();
   }
 }, [user, isAdmin]);

 const fetchAIGeneratedOrders = async () => {
   try {
     setLoadingOrders(true);

     // Fetch AI-generated products
     const { data: products } = await supabase
       .from("products")
       .select("id, title, clothing_type, image_position, sizes, colors")
       .eq("is_ai_generated", true);

     const productIds = products?.map((p) => p.id) || [];

     if (productIds.length === 0) {
       setOrders([]);
       return;
     }

     // Get order items for those products - include size and color directly from order_items
     const { data: orderItems } = await supabase
       .from("order_items")
       .select(
         "id, order_id, product_id, product_name, product_image, quantity, unit_price, total_price, size, color, created_at"
       )
       .in("product_id", productIds)
       .order("created_at", { ascending: false });

     if (!orderItems || orderItems.length === 0) {
       setOrders([]);
       return;
     }

     // Combine product data into order items - size and color come from order_items directly
     const itemsWithAI = orderItems.map((item: any) => {
       const product = products?.find((p: any) => p.id === item.product_id);
       return {
         id: item.id,
         order_id: item.order_id,
         product_id: item.product_id,
         product_name: item.product_name || product?.title || "",
         product_image: item.product_image || null,
         quantity: item.quantity,
         unit_price: item.unit_price,
         total_price: item.total_price,
         size: item.size || null,
         color: item.color || null,
         clothing_type: product?.clothing_type || null,
         image_position: product?.image_position || null,
       } as OrderItem;
     });

     // unique order ids
     const orderIds = [...new Set(itemsWithAI.map((it) => it.order_id))];

     // fetch orders
     const { data: ordersData } = await supabase
       .from("orders")
       .select(
         "*, shipping_address_id, created_at, notes, status, payment_status, order_number"
       )
       .in("id", orderIds)
       .order("created_at", { ascending: false });

     // fetch addresses
     const addressIds =
       ordersData?.map((o: any) => o.shipping_address_id).filter(Boolean) ||
       [];
     const { data: addresses } = await supabase
       .from("addresses")
       .select("*")
       .in("id", addressIds);

     // build enriched orders
     const enriched: Order[] = (ordersData || []).map((o: any) => {
       const items = itemsWithAI.filter((it) => it.order_id === o.id);
       const addr =
         addresses?.find((a: any) => a.id === o.shipping_address_id) || null;
       return {
         ...o,
         order_items: items,
         shipping_address: addr,
       };
     });

     setOrders(enriched);
   } catch (error) {
     console.error("Error fetching AI orders:", error);
     toast.error("Failed to load AI orders");
   } finally {
     setLoadingOrders(false);
   }
 };

 const escapeHtml = (v: string | number | null | undefined) =>
   v === null || v === undefined
     ? ""
     : String(v)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;");

 // helper to safely produce an encoded URL for embedding in HTML
 const safeUrl = (url: string | null) => {
   if (!url) return "";
   try {
     return encodeURI(url);
   } catch {
     return url;
   }
 };

 // Common PDF options
 const pdfOptions = (filename: string) => ({
   margin: 8,
   filename,
   image: { type: "jpeg", quality: 0.98 },
   html2canvas: { scale: 2, useCORS: true },
   jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
 });

 // ---------- INVOICE HTML (PDF-friendly) ----------
 const generateInvoiceHTML = (order: Order) => {
   const invoiceDate = new Date(order.created_at).toLocaleDateString("en-IN", {
     day: "2-digit",
     month: "short",
     year: "numeric",
   });

   const itemsHTML = order.order_items
     .map(
       (item) => `
     <tr>
       <td>
         <strong>${escapeHtml(item.product_name)}</strong><br/>
         ${
           item.clothing_type
             ? `<span class="pill">Cloth: ${escapeHtml(
                 item.clothing_type
               )}</span><br/>`
             : ""
         }
         ${
           item.size
             ? `<span class="pill">Size: ${escapeHtml(item.size)}</span>`
             : ""
         }
         ${
           item.color
             ? `<span class="pill">Color: ${escapeHtml(item.color)}</span>`
             : ""
         }
         ${
           item.image_position
             ? `<br/><span class="muted">Img Pos: ${escapeHtml(
                 item.image_position
               )}</span>`
             : ""
         }
       </td>
       <td class="right">${item.quantity}</td>
       <td class="right">₹${(item.unit_price || 0).toFixed(2)}</td>
       <td class="right">₹${(item.total_price || 0).toFixed(2)}</td>
     </tr>`
     )
     .join("");

   const itemsTotal = order.order_items.reduce(
     (s, it) => s + (it.total_price || 0),
     0
   );

   return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>AI Invoice - ${escapeHtml(order.order_number)}</title>
<style>
 * { box-sizing: border-box; }
 body {
   margin: 0;
   padding: 0;
   font-family: Arial, sans-serif;
   color: #333;
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
 .header h1 {
   margin: 0;
   font-size: 26px;
 }
 .header p {
   margin: 3px 0;
   color: #666;
 }
 .section-title {
   font-size: 13px;
   font-weight: 600;
   color: #666;
   text-transform: uppercase;
   margin-bottom: 6px;
 }
 .info-row {
   display: flex;
   justify-content: space-between;
   gap: 40px;
   margin-bottom: 18px;
 }
 .info-block {
   font-size: 12px;
 }
 table {
   width: 100%;
   border-collapse: collapse;
   margin-top: 8px;
 }
 th {
   background: #f5f5f5;
   padding: 10px;
   border-bottom: 2px solid #ddd;
   text-align: left;
   font-weight: 600;
 }
 td {
   padding: 10px;
   border-bottom: 1px solid #eee;
   vertical-align: top;
 }
 .right { text-align: right; }
 .pill {
   display: inline-block;
   margin: 2px 4px 0 0;
   padding: 2px 6px;
   border-radius: 4px;
   background: #e3f2fd;
   font-size: 11px;
   font-weight: 600;
 }
 .muted { font-size: 11px; color: #666; }
 .totals {
   width: 280px;
   margin-left: auto;
   margin-top: 16px;
 }
 .totals td {
   border: none;
   padding: 6px 8px;
 }
 .total-row {
   font-weight: 700;
   border-top: 2px solid #000;
   padding-top: 6px;
 }
 .footer {
   margin-top: 32px;
   font-size: 11px;
   text-align: center;
   color: #666;
   border-top: 1px solid #ddd;
   padding-top: 10px;
 }
</style>
</head>
<body>
 <div class="page">
   <div class="header">
     <h1>AI DESIGN INVOICE</h1>
     <p>Order #${escapeHtml(order.order_number)}</p>
     <p>${escapeHtml(invoiceDate)}</p>
   </div>

   <div class="info-row">
     <div>
       <div class="section-title">Bill / Ship To</div>
       ${
         order.shipping_address
           ? `<div class="info-block">
               <strong>${escapeHtml(order.shipping_address.full_name)}</strong><br/>
               ${escapeHtml(order.shipping_address.address_line1)}<br/>
               ${
                 order.shipping_address.address_line2
                   ? escapeHtml(order.shipping_address.address_line2) + "<br/>"
                   : ""
               }
               ${escapeHtml(order.shipping_address.city)}, ${escapeHtml(
               order.shipping_address.state
             )} ${escapeHtml(order.shipping_address.postal_code)}<br/>
               Phone: ${escapeHtml(order.shipping_address.phone)}
             </div>`
           : `<div class="info-block">No shipping address on record.</div>`
       }
     </div>
     <div>
       <div class="section-title">Order Info</div>
       <div class="info-block">
         <div>Status: <strong>${escapeHtml(order.status)}</strong></div>
         <div>Payment: ${escapeHtml(order.payment_status)}</div>
         <div>Items: ${order.order_items.length}</div>
         <div>Currency: ${escapeHtml(order.currency)}</div>
       </div>
     </div>
   </div>

   <div class="section-title">Line Items</div>
   <table>
     <thead>
       <tr>
         <th style="width: 50%;">Product</th>
         <th style="width: 10%;" class="right">Qty</th>
         <th style="width: 20%;" class="right">Unit</th>
         <th style="width: 20%;" class="right">Total</th>
       </tr>
     </thead>
     <tbody>
       ${itemsHTML}
     </tbody>
   </table>

   <table class="totals">
     <tr>
       <td>Items Total:</td>
       <td class="right">₹${itemsTotal.toFixed(2)}</td>
     </tr>
     <tr>
       <td>Order Total:</td>
       <td class="right">₹${(order.total_amount || itemsTotal).toFixed(2)}</td>
     </tr>
     <tr class="total-row">
       <td>Amount Due:</td>
       <td class="right">₹${(order.total_amount || itemsTotal).toFixed(2)}</td>
     </tr>
   </table>

   <div class="footer">
     This invoice is for AI-generated custom apparel. If you have any questions, please contact support.
   </div>
 </div>
</body>
</html>`;
 };

 // ---------- PURCHASE ORDER HTML (PDF-friendly) ----------
 const generatePurchaseOrderHTML = (order: Order) => {
   const poDate = new Date(order.created_at).toLocaleDateString("en-IN", {
     day: "2-digit",
     month: "short",
     year: "numeric",
   });

   const itemsHTML = order.order_items
     .map((item) => {
       const imgUrl = safeUrl(item.product_image);
       const imageCell = item.product_image
         ? `<img src="${imgUrl}" alt="${escapeHtml(
             item.product_name
           )}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #ddd;display:block;margin-bottom:6px;"/>
          <a href="${imgUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:4px 8px;font-size:11px;border-radius:4px;background:#007bff;color:#fff;text-decoration:none;">Open Design</a>`
         : "No image";

       return `
     <tr>
       <td>
         <strong>${escapeHtml(item.product_name)}</strong><br/>
         ${
           item.clothing_type
             ? `<span class="pill">Cloth: ${escapeHtml(
                 item.clothing_type
               )}</span><br/>`
             : ""
         }
         ${
           item.size
             ? `<span class="pill">Size: ${escapeHtml(item.size)}</span>`
             : ""
         }
         ${
           item.color
             ? `<span class="pill">Color: ${escapeHtml(item.color)}</span>`
             : ""
         }
         ${
           item.image_position
             ? `<br/><span class="muted">Image Position: ${escapeHtml(
                 item.image_position
               )}</span>`
             : ""
         }
       </td>
       <td class="center"><strong>${item.quantity}</strong></td>
       <td class="center">${imageCell}</td>
     </tr>`;
     })
     .join("");

   const totalQty = order.order_items.reduce(
     (sum, i) => sum + (i.quantity || 0),
     0
   );

   return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Purchase Order - ${escapeHtml(order.order_number)}</title>
<style>
 * { box-sizing: border-box; }
 body {
   margin: 0;
   padding: 0;
   font-family: Arial, sans-serif;
   color: #333;
   font-size: 12px;
   line-height: 1.5;
 }
 .page {
   width: 750px;
   margin: 24px auto 40px;
 }
 .header {
   background: #1a1a1a;
   color: #fff;
   padding: 18px 20px;
   margin-bottom: 10px;
 }
 .header h1 {
   margin: 0 0 6px;
   font-size: 24px;
   letter-spacing: 0.5px;
 }
 .header p {
   margin: 0;
   font-size: 12px;
   opacity: 0.85;
 }
 .from-block {
   margin: 6px 0 18px;
   font-size: 12px;
 }
 .from-block strong {
   font-size: 13px;
 }
 .urgent-banner {
   background: #dc3545;
   color: #fff;
   padding: 10px 14px;
   text-align: center;
   font-weight: 600;
   font-size: 13px;
   border-radius: 4px;
   margin-bottom: 18px;
 }
 .grid {
   display: flex;
   gap: 18px;
   margin-bottom: 18px;
 }
 .card {
   flex: 1;
   background: #f8f9fa;
   padding: 14px 16px;
   border-radius: 6px;
 }
 .card-title {
   font-size: 13px;
   font-weight: 600;
   text-transform: uppercase;
   margin: 0 0 8px;
   border-bottom: 2px solid #333;
   padding-bottom: 4px;
 }
 .card p { margin: 3px 0; }
 table {
   width: 100%;
   border-collapse: collapse;
   margin-top: 8px;
 }
 th {
   background: #333;
   color: #fff;
   padding: 10px;
   text-align: left;
   font-size: 12px;
 }
 td {
   padding: 10px;
   border-bottom: 1px solid #ddd;
   vertical-align: top;
 }
 .pill {
   display: inline-block;
   margin: 2px 4px 0 0;
   padding: 2px 6px;
   border-radius: 4px;
   background: #fff3cd;
   font-size: 11px;
 }
 .muted { font-size: 11px; color: #666; }
 .center { text-align: center; }
 .checklist {
   margin-top: 20px;
   padding: 12px 14px;
   border-radius: 6px;
   background: #fff3cd;
 }
 .checklist h3 {
   margin: 0 0 8px;
   font-size: 13px;
   color: #856404;
 }
 .check-item {
   display: flex;
   align-items: center;
   margin: 4px 0;
   font-size: 12px;
 }
 .check-box {
   width: 16px;
   height: 16px;
   border: 2px solid #333;
   margin-right: 8px;
 }
 .footer {
   margin-top: 24px;
   padding-top: 10px;
   border-top: 1px solid #333;
   font-size: 11px;
 }
 .sig-line {
   width: 200px;
   border-top: 1px solid #333;
   margin-top: 26px;
 }
 .sig-label {
   font-size: 10px;
   color: #666;
   margin-top: 4px;
 }
</style>
</head>
<body>
 <div class="page">
   <div class="header">
     <h1>PURCHASE ORDER</h1>
     <p>Order #${escapeHtml(order.order_number)} — ${escapeHtml(poDate)}</p>
   </div>

   <div class="from-block">
     <strong>From (Seller): Tesora Lifestyle</strong><br/>
     FC Road, Pune, 411004<br/>
     Maharashtra, India
   </div>

   <div class="urgent-banner">
     ⚡ FULFILLMENT REQUIRED — Please prepare the AI-designed items as per details below
   </div>

   <div class="grid">
     <div class="card">
       <div class="card-title">Ship To</div>
       ${
         order.shipping_address
           ? `
         <p><strong>${escapeHtml(order.shipping_address.full_name)}</strong></p>
         <p>${escapeHtml(order.shipping_address.address_line1)}</p>
         ${
           order.shipping_address.address_line2
             ? `<p>${escapeHtml(order.shipping_address.address_line2)}</p>`
             : ""
         }
         <p>${escapeHtml(order.shipping_address.city)}, ${escapeHtml(
             order.shipping_address.state
           )}</p>
         <p>${escapeHtml(order.shipping_address.postal_code)}, ${escapeHtml(
             order.shipping_address.country
           )}</p>
         <p><strong>📞 ${escapeHtml(order.shipping_address.phone)}</strong></p>`
           : "<p>No shipping address provided</p>"
       }
     </div>
     <div class="card">
       <div class="card-title">Order Info</div>
       <p>Status: <strong>${escapeHtml(order.status.toUpperCase())}</strong></p>
       <p>Payment: ${escapeHtml(order.payment_status)}</p>
       <p>Items: ${order.order_items.length}</p>
       <p>Total Qty: ${totalQty}</p>
       <p>Total Amount: ₹${(order.total_amount || 0).toFixed(2)}</p>
     </div>
   </div>

   <table>
     <thead>
       <tr>
         <th style="width:55%;">Product Details</th>
         <th style="width:10%;text-align:center;">Qty</th>
         <th style="width:35%;">Reference Image</th>
       </tr>
     </thead>
     <tbody>
       ${itemsHTML}
     </tbody>
   </table>

   <div class="checklist">
     <h3>Fulfillment Checklist</h3>
     <div class="check-item"><div class="check-box"></div> All garments picked & counted</div>
     <div class="check-item"><div class="check-box"></div> Print quality checked against design</div>
     <div class="check-item"><div class="check-box"></div> Packing completed & labeled</div>
     <div class="check-item"><div class="check-box"></div> Ready for dispatch to customer address</div>
   </div>

   <div class="footer">
     <p><strong>Notes:</strong> ${
       order.notes ? escapeHtml(order.notes) : "No special instructions"
     }</p>
     <div class="sig-line"></div>
     <div class="sig-label">Prepared By / Date</div>
   </div>
 </div>
</body>
</html>`;
 };

 // ---------- PDF DOWNLOAD HELPERS ----------
 const downloadInvoice = (order: Order) => {
   try {
     const html = generateInvoiceHTML(order);
     const opts = pdfOptions(`ai-invoice-${order.order_number}.pdf`);
     // @ts-ignore
     html2pdf().set(opts).from(html).save();
     toast.success("Invoice PDF download started");
   } catch (err: any) {
     console.error("downloadInvoice error", err);
     toast.error("Failed to generate invoice PDF");
   }
 };

 const downloadPurchaseOrder = (order: Order) => {
   try {
     const html = generatePurchaseOrderHTML(order);
     const opts = pdfOptions(`ai-po-${order.order_number}.pdf`);
     // @ts-ignore
     html2pdf().set(opts).from(html).save();
     toast.success("Purchase order PDF download started");
   } catch (err: any) {
     console.error("downloadPurchaseOrder error", err);
     toast.error("Failed to generate purchase order PDF");
   }
 };

 // download design image helper (unchanged)
 const downloadDesignImage = async (url: string | null, filename?: string) => {
   if (!url) {
     toast.error("No design image available");
     return;
   }
   try {
     toast("Starting download...");
     const res = await fetch(url, { mode: "cors" });
     if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
     const blob = await res.blob();
     const blobUrl = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = blobUrl;
     a.download = filename || "design-image";
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(blobUrl);
     toast.success("Design downloaded");
   } catch (err: any) {
     console.error("downloadDesignImage error", err);
     toast.error("Failed to download design image");
   }
 };

 const openDetails = (order: Order) => {
   setSelectedOrder(order);
   setDetailsOpen(true);
 };

 const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
   try {
     setUpdatingStatusId(orderId);
     const { error } = await supabase
       .from("order_items")
       .update({ status: newStatus })
       .eq("id", orderId);

     if (error) throw error;

     setOrders((prev) =>
       prev.map((o) =>
         o.id === orderId ? { ...o, status: newStatus } : o
       )
     );
     toast.success(`Order status updated to ${newStatus}`);
   } catch (err) {
     console.error("Error updating order status:", err);
     toast.error("Failed to update order status");
   } finally {
     setUpdatingStatusId(null);
   }
 };

 // --------- FILTERED ORDERS ---------
 const filteredOrders = orders.filter((order) => {
   const matchesSearch =
     order.order_number
       ?.toLowerCase()
       .includes(searchQuery.toLowerCase()) ||
     order.shipping_address?.full_name
       ?.toLowerCase()
       .includes(searchQuery.toLowerCase()) ||
     order.shipping_address?.phone?.includes(searchQuery);

   const matchesStatus =
     statusFilter === "all" || order.status === statusFilter;

   const matchesDate = isWithinDateFilter(order.created_at, dateFilter);

   return matchesSearch && matchesStatus && matchesDate;
 });

 if (loading) {
   return (
     <div className="min-h-screen flex items-center justify-center">
       Loading...
     </div>
   );
 }

 if (!isAdmin) return null;

 return (
   <div className="min-h-screen bg-background">
     <header className="border-b flex mx-auto px-4 py-4">
       <div className="container mx-auto px-4 py-4 flex items-center gap-4">
         <Button
           variant="ghost"
           size="icon"
           onClick={() => navigate("/admintesora/dashboard")}
         >
           <ArrowLeft className="h-5 w-5" />
         </Button>
         <h1 className="text-2xl font-bold">AI Generated Orders (Admin)</h1>
       </div>
       <Link to="/admintesora/dashboard">
         <Button variant="outline">
           <Home className="mr-2 h-4 w-4" />
           Dashboard
         </Button>
       </Link>
     </header>

     <main className="container mx-auto px-4 py-8">
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Package className="h-5 w-5" />
             All AI Generated Orders (Created by you)
           </CardTitle>
         </CardHeader>
         <CardContent>
           {/* Filters */}
           <div className="flex flex-col md:flex-row gap-4 mb-6">
             {/* Search */}
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search by order #, customer name, or phone..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-10"
               />
             </div>

             {/* Status filter */}
             <Select
               value={statusFilter}
               onValueChange={(val) => setStatusFilter(val)}
             >
               <SelectTrigger className="w-full md:w-[200px]">
                 <SelectValue placeholder="Filter by status" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Status</SelectItem>
                 <SelectItem value="pending">Pending</SelectItem>
                 <SelectItem value="delivered">Delivered</SelectItem>
                 <SelectItem value="cancelled">Cancelled</SelectItem>
               </SelectContent>
             </Select>

             {/* Date filter */}
             <Select
               value={dateFilter}
               onValueChange={(val) => setDateFilter(val)}
             >
               <SelectTrigger className="w-full md:w-[220px]">
                 <SelectValue placeholder="Filter by date" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Dates</SelectItem>
                 <SelectItem value="today">Today</SelectItem>
                 <SelectItem value="last7">Last 7 Days</SelectItem>
                 <SelectItem value="last15">Last 15 Days</SelectItem>
                 <SelectItem value="last30">Last Month (30 Days)</SelectItem>
               </SelectContent>
             </Select>
           </div>

           {loadingOrders ? (
             <div className="text-center py-8">Loading orders...</div>
           ) : orders.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
               <p>No AI-generated orders found.</p>
             </div>
           ) : filteredOrders.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
               <p>No orders match the selected filters.</p>
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Order #</TableHead>
                   <TableHead>Date</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Change Status</TableHead>
                   <TableHead>Items</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredOrders.map((order) => (
                   <TableRow key={order.id}>
                     <TableCell className="font-medium">
                       {order.order_number}
                     </TableCell>
                     <TableCell>
                       {new Date(order.created_at).toLocaleDateString()}
                     </TableCell>
                     <TableCell>
                       <Badge className={statusColors[order.status] || ""}>
                         {order.status}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <select
                         className="border rounded px-2 py-1 text-sm bg-background"
                         value={order.status}
                         disabled={updatingStatusId === order.id}
                         onChange={(e) =>
                           handleOrderStatusChange(order.id, e.target.value)
                         }
                       >
                         {statusOptions.map((status) => (
                           <option key={status} value={status}>
                             {status.charAt(0).toUpperCase() + status.slice(1)}
                           </option>
                         ))}
                       </select>
                     </TableCell>
                     <TableCell>{order.order_items.length} items</TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => openDetails(order)}
                         >
                           <Eye className="h-4 w-4 mr-1" />
                           View
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => downloadInvoice(order)}
                         >
                           <FileText className="h-4 w-4 mr-1" />
                           Invoice
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => downloadPurchaseOrder(order)}
                         >
                           <Download className="h-4 w-4 mr-1" />
                           PO
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
     </main>

     <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
       <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>
             Order Details - {selectedOrder?.order_number}
           </DialogTitle>
         </DialogHeader>
         {selectedOrder && (
           <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <h4 className="font-semibold mb-2">Order Info</h4>
                 <p className="text-sm">
                   Date:{" "}
                   {new Date(
                     selectedOrder.created_at
                   ).toLocaleDateString()}
                 </p>
                 <p className="text-sm">Status: {selectedOrder.status}</p>
                 <p className="text-sm">
                   Payment: {selectedOrder.payment_status}
                 </p>
               </div>
               <div>
                 <h4 className="font-semibold mb-2">Shipping Address</h4>
                 {selectedOrder.shipping_address ? (
                   <div className="text-sm">
                     <p>{selectedOrder.shipping_address.full_name}</p>
                     <p>{selectedOrder.shipping_address.address_line1}</p>
                     {selectedOrder.shipping_address.address_line2 && (
                       <p>{selectedOrder.shipping_address.address_line2}</p>
                     )}
                     <p>
                       {selectedOrder.shipping_address.city},{" "}
                       {selectedOrder.shipping_address.state}{" "}
                       {selectedOrder.shipping_address.postal_code}
                     </p>
                     <p>Phone: {selectedOrder.shipping_address.phone}</p>
                   </div>
                 ) : (
                   <p className="text-sm text-muted-foreground">
                     No address provided
                   </p>
                 )}
               </div>
             </div>

             <div>
               <h4 className="font-semibold mb-3">AI Products in Order</h4>
               <div className="space-y-3">
                 {selectedOrder.order_items.map((item) => (
                   <div
                     key={item.id}
                     className="flex items-center gap-4 p-3 border rounded-lg"
                   >
                     {item.product_image && (
                       <div className="flex flex-col items-center">
                         <img
                           src={item.product_image}
                           alt={item.product_name}
                           className="w-16 h-16 object-cover rounded"
                         />
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() =>
                             downloadDesignImage(
                               item.product_image,
                               `${selectedOrder.order_number}-${item.product_id}.jpg`
                             )
                           }
                           className="mt-2"
                         >
                           <Download className="h-4 w-4 mr-2" />
                           Download Design
                         </Button>
                       </div>
                     )}
                     <div className="flex-1">
                       <p className="font-medium">{item.product_name}</p>
                       <p className="text-sm text-muted-foreground">
                         {item.clothing_type &&
                           `Cloth: ${item.clothing_type}`}
                         {item.clothing_type &&
                           (item.size || item.color || item.image_position) &&
                           " | "}
                         {item.size && `Size: ${item.size}`}
                         {item.size && item.color && " | "}
                         {item.color && `Color: ${item.color}`}
                         {item.image_position &&
                           (item.size || item.color) &&
                           " | "}
                         {item.image_position &&
                           `Img Pos: ${item.image_position}`}
                       </p>
                       <p className="text-sm">
                         Qty: {item.quantity} × ₹{item.unit_price} = ₹
                         {item.total_price}
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>

             <div className="flex justify-between items-center pt-4 border-t">
               <span className="font-semibold">Products Total:</span>
               <span className="text-xl font-bold">
                 ₹
                 {selectedOrder.order_items
                   .reduce((sum, it) => sum + it.total_price, 0)
                   .toFixed(2)}
               </span>
             </div>

             <div className="flex gap-2">
               <Button onClick={() => downloadInvoice(selectedOrder)}>
                 <FileText className="h-4 w-4 mr-2" />
                 Download Invoice
               </Button>
               <Button
                 variant="outline"
                 onClick={() => downloadPurchaseOrder(selectedOrder)}
               >
                 <Download className="h-4 w-4 mr-2" />
                 Download Purchase Order
               </Button>
             </div>
           </div>
         )}
       </DialogContent>
     </Dialog>
   </div>
 );
};

export default AdminAIGeneratedOrders;

