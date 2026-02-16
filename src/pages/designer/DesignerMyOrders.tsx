import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDesigner } from "@/contexts/DesignerContext";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Eye, Download, FileText, Package, Home } from "lucide-react";
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
  status: string; // pending | delivered | cancelled
  delivery_order_id?: string | null;
  cancellation_reason?: string | null;
  dispatch_date?: string | null; // 👈 NEW: ensure this column exists in order_items (e.g. dispatch_date date)
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
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// --- helpers for PDF ---
const escapeHtml = (v: string | number | null | undefined) =>
  v === null || v === undefined
    ? ""
    : String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const safeUrl = (url: string | null) => {
  if (!url) return "";
  try {
    return encodeURI(url);
  } catch {
    return url;
  }
};

const pdfOptions = (filename: string) => ({
  margin: 8,
  filename,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
});

const DesignerMyOrders = () => {
  const { user, isDesigner, loading } = useDesigner();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [designerProducts, setDesignerProducts] = useState<string[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // status modal state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogType, setStatusDialogType] = useState<
    "single" | "bulk" | null
  >(null);
  const [statusDialogStatus, setStatusDialogStatus] = useState<
    "delivered" | "cancelled" | null
  >(null);
  const [statusDialogOrder, setStatusDialogOrder] = useState<Order | null>(
    null
  );
  const [statusDialogItem, setStatusDialogItem] = useState<OrderItem | null>(
    null
  );
  const [deliveryOrderId, setDeliveryOrderId] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [dispatchDate, setDispatchDate] = useState(""); // 👈 NEW (YYYY-MM-DD)

  useEffect(() => {
    if (!loading && !isDesigner) {
      navigate("/designer/login");
    }
  }, [isDesigner, loading, navigate]);

  useEffect(() => {
    if (user && isDesigner) {
      fetchDesignerOrders();
    }
  }, [user, isDesigner]);

  const fetchDesignerOrders = async () => {
    try {
      setLoadingOrders(true);

      // First get the designer's ID
      const { data: designer } = await supabase
        .from("designers")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!designer) {
        toast.error("Designer profile not found");
        return;
      }

      // Get designer's products
      const { data: products } = await supabase
        .from("products")
        .select("id")
        .eq("designer_id", designer.id);

      const productIds = products?.map((p) => p.id) || [];
      setDesignerProducts(productIds);

      if (productIds.length === 0) {
        setOrders([]);
        return;
      }

      // Get order items for designer's products
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*, order_id")
        .in("product_id", productIds);

      if (!orderItems || orderItems.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = [
        ...new Set((orderItems as any[]).map((item) => item.order_id)),
      ];

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*, shipping_address_id")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      if (!ordersData) {
        setOrders([]);
        return;
      }

      const addressIds = ordersData
        .map((o: any) => o.shipping_address_id)
        .filter(Boolean);

      const { data: addresses } = await supabase
        .from("addresses")
        .select("*")
        .in("id", addressIds);

      const enrichedOrders: Order[] = ordersData.map((order: any) => {
        const items = (orderItems as any[]).filter(
          (item) => item.order_id === order.id
        ) as OrderItem[];
        const address = addresses?.find(
          (a: any) => a.id === order.shipping_address_id
        );

        return {
          ...order,
          order_items: items,
          shipping_address: address || null,
        };
      });

      setOrders(enrichedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  // --- helper to recalc order.status based on all items ---
  const recalculateOrderStatus = async (orderId: string) => {
    const { data: items, error } = await supabase
      .from("order_items")
      .select("status")
      .eq("order_id", orderId);

    if (error || !items) {
      console.error("Error fetching items for status calc:", error);
      return;
    }

    const total = items.length;
    const deliveredCount = items.filter((it) => it.status === "delivered")
      .length;

    let newStatus = "pending";
    if (deliveredCount === 0) {
      newStatus = "pending";
    } else if (deliveredCount < total) {
      newStatus = "processing";
    } else {
      newStatus = "completed";
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order status:", updateError);
    }
  };

  // --- core update functions (no UI) ---
  const updateSingleItemStatus = async (
    item: OrderItem,
    orderId: string,
    newStatus: string,
    deliveryId?: string | null,
    cancelReason?: string | null,
    dispatchDateValue?: string | null // 👈 NEW optional param
  ) => {
    try {
      let payload: any = { status: newStatus };

      if (newStatus === "delivered") {
        payload.delivery_order_id = deliveryId ?? null;
        payload.cancellation_reason = null;
        payload.dispatch_date = dispatchDateValue ?? null;
      } else if (newStatus === "cancelled") {
        payload.cancellation_reason = cancelReason ?? null;
        payload.delivery_order_id = null;
        payload.dispatch_date = null;
      } else {
        payload.delivery_order_id = null;
        payload.cancellation_reason = null;
        payload.dispatch_date = null;
      }

      const { error } = await supabase
        .from("order_items")
        .update(payload)
        .eq("id", item.id);

      if (error) throw error;

      await recalculateOrderStatus(orderId);

      setSelectedOrder((prev) =>
        prev && prev.id === orderId
          ? {
              ...prev,
              order_items: prev.order_items.map((oi) =>
                oi.id === item.id ? { ...oi, ...payload } : oi
              ),
            }
          : prev
      );

      await fetchDesignerOrders();
      toast.success("Item status updated");
    } catch (err: any) {
      console.error("Error updating item status:", err);
      toast.error("Failed to update item status");
    }
  };

  const updateBulkStatus = async (
    order: Order,
    newStatus: string,
    deliveryId?: string | null,
    cancelReason?: string | null,
    dispatchDateValue?: string | null // 👈 NEW optional param
  ) => {
    try {
      const itemIds = order.order_items.map((i) => i.id);
      if (itemIds.length === 0) return;

      let payload: any = { status: newStatus };

      if (newStatus === "delivered") {
        payload.delivery_order_id = deliveryId ?? null;
        payload.cancellation_reason = null;
        payload.dispatch_date = dispatchDateValue ?? null;
      } else if (newStatus === "cancelled") {
        payload.cancellation_reason = cancelReason ?? null;
        payload.delivery_order_id = null;
        payload.dispatch_date = null;
      } else {
        payload.delivery_order_id = null;
        payload.cancellation_reason = null;
        payload.dispatch_date = null;
      }

      const { error } = await supabase
        .from("order_items")
        .update(payload)
        .in("id", itemIds);

      if (error) throw error;

      await recalculateOrderStatus(order.id);

      setSelectedOrder((prev) =>
        prev && prev.id === order.id
          ? {
              ...prev,
              order_items: prev.order_items.map((oi) => ({
                ...oi,
                ...payload,
              })),
            }
          : prev
      );

      await fetchDesignerOrders();
      toast.success("Order items status updated");
    } catch (err: any) {
      console.error("Error in bulk status update:", err);
      toast.error("Failed to update order items status");
    }
  };

  // --- open modal for delivered / cancelled ---
  const openStatusModal = (
    type: "single" | "bulk",
    status: "delivered" | "cancelled",
    order: Order,
    item: OrderItem | null
  ) => {
    setStatusDialogType(type);
    setStatusDialogStatus(status);
    setStatusDialogOrder(order);
    setStatusDialogItem(item);
    setDeliveryOrderId("");
    setCancellationReason("");
    setDispatchDate("");
    setStatusDialogOpen(true);
  };

  // --- handlers for selects ---

  // for single item (details modal)
  const handleItemStatusSelect = (
    item: OrderItem,
    order: Order,
    newStatus: string
  ) => {
    if (newStatus === "delivered" || newStatus === "cancelled") {
      openStatusModal("single", newStatus as "delivered" | "cancelled", order, item);
    } else {
      // e.g. back to pending, no extra data
      updateSingleItemStatus(item, order.id, newStatus);
    }
  };

  // for bulk (list table)
  const handleBulkStatusSelect = (order: Order, newStatus: string) => {
    if (newStatus === "mixed") return;

    if (newStatus === "delivered" || newStatus === "cancelled") {
      openStatusModal("bulk", newStatus as "delivered" | "cancelled", order, null);
    } else {
      updateBulkStatus(order, newStatus);
    }
  };

  // --- confirm in modal ---
  const handleConfirmStatusChange = async () => {
    if (!statusDialogType || !statusDialogStatus || !statusDialogOrder) return;

    if (statusDialogStatus === "delivered") {
      if (!deliveryOrderId.trim()) {
        toast.error("Delivery order ID is required for delivered status.");
        return;
      }
      if (!dispatchDate.trim()) {
        toast.error("Dispatch date is required for delivered status.");
        return;
      }
    }
    if (statusDialogStatus === "cancelled") {
      if (!cancellationReason.trim()) {
        toast.error("Cancellation reason is required for cancelled status.");
        return;
      }
    }

    if (statusDialogType === "single" && statusDialogItem) {
      await updateSingleItemStatus(
        statusDialogItem,
        statusDialogOrder.id,
        statusDialogStatus,
        statusDialogStatus === "delivered" ? deliveryOrderId.trim() : null,
        statusDialogStatus === "cancelled" ? cancellationReason.trim() : null,
        statusDialogStatus === "delivered" ? dispatchDate : null
      );
    } else if (statusDialogType === "bulk") {
      await updateBulkStatus(
        statusDialogOrder,
        statusDialogStatus,
        statusDialogStatus === "delivered" ? deliveryOrderId.trim() : null,
        statusDialogStatus === "cancelled" ? cancellationReason.trim() : null,
        statusDialogStatus === "delivered" ? dispatchDate : null
      );
    }

    setStatusDialogOpen(false);
  };

  const closeStatusDialog = () => {
    setStatusDialogOpen(false);
    setStatusDialogType(null);
    setStatusDialogStatus(null);
    setStatusDialogOrder(null);
    setStatusDialogItem(null);
    setDeliveryOrderId("");
    setCancellationReason("");
    setDispatchDate("");
  };

  // ---------- PDF-FRIENDLY INVOICE HTML ----------
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
            item.size
              ? `<span class="pill">Size: ${escapeHtml(item.size)}</span>`
              : ""
          }
          ${
            item.color
              ? `<span class="pill">Color: ${escapeHtml(item.color)}</span>`
              : ""
          }
        </td>
        <td class="right">${item.quantity}</td>
        <td class="right">₹${(item.unit_price || 0).toFixed(2)}</td>
        <td class="right">₹${(item.total_price || 0).toFixed(2)}</td>
      </tr>`
      )
      .join("");

    const designerTotal = order.order_items.reduce(
      (s, it) => s + (it.total_price || 0),
      0
    );

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Designer Invoice - ${escapeHtml(order.order_number)}</title>
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
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #000;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .logo {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  .title-block {
    text-align: right;
  }
  .title-block h1 {
    margin: 0;
    font-size: 20px;
  }
  .title-block p {
    margin: 3px 0;
    font-size: 11px;
    color: #666;
  }
  .section-title {
    font-size: 12px;
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
  .totals {
    width: 260px;
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
    margin-top: 28px;
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
      <div class="logo">TESORA</div>
      <div class="title-block">
        <h1>DESIGNER INVOICE</h1>
        <p>Order #${escapeHtml(order.order_number)}</p>
        <p>${escapeHtml(invoiceDate)}</p>
      </div>
    </div>

    <div class="info-row">
      <div>
        <div class="section-title">Ship To</div>
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
          <div>Items (your catalog): ${order.order_items.length}</div>
        </div>
      </div>
    </div>

    <div class="section-title">Your Line Items</div>
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
      <tr class="total-row">
        <td>Your Products Total:</td>
        <td class="right">₹${designerTotal.toFixed(2)}</td>
      </tr>
    </table>

    <div class="footer">
      This invoice covers only items from your product catalog within this order. Please use this as reference for your records.
    </div>
  </div>
</body>
</html>`;
  };

  // ---------- PDF-FRIENDLY PURCHASE ORDER HTML (WITH TESORA DETAILS) ----------
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
            )}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #ddd;display:block;margin-bottom:6px;"/>`
          : "No image";

        return `
      <tr>
        <td>
          <strong>${escapeHtml(item.product_name)}</strong><br/>
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
    const designerTotal = order.order_items.reduce(
      (s, it) => s + (it.total_price || 0),
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
    font-size: 22px;
    letter-spacing: 0.5px;
  }
  .header p {
    margin: 0;
    font-size: 12px;
    opacity: 0.9;
  }
  .from-block {
    margin: 8px 0 18px;
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
      ⚡ FULFILLMENT REQUIRED — Please prepare the items below from your catalog
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Ship To (Customer)</div>
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
        <p>Items (your catalog): ${order.order_items.length}</p>
        <p>Total Qty: ${totalQty}</p>
        <p>Your Products Total: ₹${designerTotal.toFixed(2)}</p>
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
      <div class="check-item"><div class="check-box"></div> All items picked & counted</div>
      <div class="check-item"><div class="check-box"></div> Quality check completed</div>
      <div class="check-item"><div class="check-box"></div> Properly packed & labeled</div>
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
      const opts = pdfOptions(`designer-invoice-${order.order_number}.pdf`);
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
      const opts = pdfOptions(`designer-po-${order.order_number}.pdf`);
      // @ts-ignore
      html2pdf().set(opts).from(html).save();
      toast.success("Purchase order PDF download started");
    } catch (err: any) {
      console.error("downloadPurchaseOrder error", err);
      toast.error("Failed to generate purchase order PDF");
    }
  };

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isDesigner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b mx-auto px-4 py-4 flex items-center justify-between">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/designer/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">My Product Orders</h1>
        </div>
        <Link to="/designer/dashboard">
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
              Orders Containing Your Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No orders found for your products yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Your Total</TableHead>
                    <TableHead>Item Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const totalItems = order.order_items.length;
                    const deliveredCount = order.order_items.filter(
                      (i) => i.status === "delivered"
                    ).length;
                    const cancelledCount = order.order_items.filter(
                      (i) => i.status === "cancelled"
                    ).length;
                    const designerTotal = order.order_items.reduce(
                      (sum, item) => sum + (item.total_price || 0),
                      0
                    );

                    const uniqueStatuses = new Set(
                      order.order_items.map((i) => i.status || "pending")
                    );
                    const bulkStatusValue =
                      uniqueStatuses.size === 1
                        ? Array.from(uniqueStatuses)[0]
                        : "mixed";

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{totalItems} item(s)</span>
                            <span className="text-xs text-muted-foreground">
                              {deliveredCount} delivered
                              {cancelledCount > 0 &&
                                ` • ${cancelledCount} cancelled`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>₹{designerTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">
                              Set Status
                            </span>
                            <select
                              className="border rounded px-2 py-1 text-xs bg-background"
                              value={bulkStatusValue}
                              onChange={(e) =>
                                handleBulkStatusSelect(order, e.target.value)
                              }
                            >
                              {bulkStatusValue === "mixed" && (
                                <option value="mixed" disabled>
                                  Mixed
                                </option>
                              )}
                              <option value="pending">Pending</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </TableCell>
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
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Order Details Dialog */}
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
                    {new Date(selectedOrder.created_at).toLocaleDateString()}
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
                <h4 className="font-semibold mb-3">Your Products in Order</h4>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && " | "}
                          {item.color && `Color: ${item.color}`}
                        </p>
                        <p className="text-sm">
                          Qty: {item.quantity} × ₹{item.unit_price} = ₹
                          {item.total_price}
                        </p>
                        <p className="text-xs mt-1">
                          Item Status:{" "}
                          <span className="font-semibold">
                            {item.status || "pending"}
                          </span>
                        </p>
                        {item.status === "delivered" &&
                          item.delivery_order_id && (
                            <p className="text-xs text-muted-foreground">
                              Delivery Order ID: {item.delivery_order_id}
                            </p>
                          )}
                        {item.status === "delivered" && item.dispatch_date && (
                          <p className="text-xs text-muted-foreground">
                            Dispatch Date: {item.dispatch_date}
                          </p>
                        )}
                        {item.status === "cancelled" &&
                          item.cancellation_reason && (
                            <p className="text-xs text-muted-foreground">
                              Cancellation Reason: {item.cancellation_reason}
                            </p>
                          )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <label className="text-xs text-muted-foreground">
                          Update Status
                        </label>
                        <select
                          className="border rounded px-2 py-1 text-xs bg-background"
                          value={item.status || "pending"}
                          onChange={(e) =>
                            handleItemStatusSelect(
                              item,
                              selectedOrder,
                              e.target.value
                            )
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold">Your Products Total:</span>
                <span className="text-xl font-bold">
                  ₹
                  {selectedOrder.order_items
                    .reduce((sum, item) => sum + (item.total_price || 0), 0)
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

      {/* Status Modal for Delivered / Cancelled */}
      <Dialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeStatusDialog();
          } else {
            setStatusDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusDialogStatus === "delivered"
                ? "Mark as Delivered"
                : "Cancel Item(s)"}
            </DialogTitle>
          </DialogHeader>

          {statusDialogStatus === "delivered" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please enter the courier / delivery order ID and dispatch date
                for this shipment.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Delivery / AWB / Tracking ID
                </label>
                <Input
                  placeholder="e.g. BLR12345XYZ"
                  value={deliveryOrderId}
                  onChange={(e) => setDeliveryOrderId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dispatch Date</label>
                <Input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {statusDialogStatus === "cancelled" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please add a clear reason for cancelling this item/order.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Cancellation Reason
                </label>
                <Textarea
                  placeholder="e.g. Out of stock, quality issue, damaged piece, etc."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeStatusDialog}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusChange}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignerMyOrders;
