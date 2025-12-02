import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Eye, Download, FileText, Package } from "lucide-react";
import { toast } from "sonner";

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

const AdminAIGeneratedOrders = () => {
  const { user, isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        .select("id, order_id, product_id, product_name, product_image, quantity, unit_price, total_price, size, color")
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
        .select("*, shipping_address_id, created_at, notes, status, payment_status, order_number")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      // fetch addresses
      const addressIds = ordersData?.map((o: any) => o.shipping_address_id).filter(Boolean) || [];
      const { data: addresses } = await supabase
        .from("addresses")
        .select("*")
        .in("id", addressIds);

      // build enriched orders
      const enriched: Order[] = (ordersData || []).map((o: any) => {
        const items = itemsWithAI.filter((it) => it.order_id === o.id);
        const addr = addresses?.find((a: any) => a.id === o.shipping_address_id) || null;
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

  const escapeHtml = (str: string) =>
    (str || "")
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

  const generateInvoiceHTML = (order: Order) => {
    const itemsHTML = order.order_items
      .map(
        (item) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;">
            ${escapeHtml(item.product_name)}
            ${item.clothing_type ? `<br><small>Cloth: ${escapeHtml(item.clothing_type)}</small>` : ""}
            ${item.size ? `<br><small>Size: ${escapeHtml(item.size)}</small>` : ""}
            ${item.color ? `<br><small>Color: ${escapeHtml(item.color)}</small>` : ""}
            ${item.image_position ? `<br><small>Image position: ${escapeHtml(item.image_position)}</small>` : ""}
          </td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">₹${(item.unit_price || 0).toFixed(2)}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">₹${(item.total_price || 0).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const designerTotal = order.order_items.reduce((s, it) => s + (it.total_price || 0), 0);

    return `<!doctype html><html><head><meta charset="utf-8"><title>AI Invoice - ${order.order_number}</title></head><body><h2>Invoice ${order.order_number}</h2><p>Date: ${new Date(order.created_at).toLocaleString()}</p><table width="100%" cellpadding="0" cellspacing="0"><thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${itemsHTML}</tbody></table><h3>Total: ₹${designerTotal.toFixed(2)}</h3></body></html>`;
  };

  // --- Purchase order with download link for design images ---
  const generatePurchaseOrderHTML = (order: Order) => {
    const itemsHTML = order.order_items
      .map((item) => {
        const imgUrl = safeUrl(item.product_image);
        const imageCell = item.product_image
          ? `<img src="${imgUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;" alt="${escapeHtml(
              item.product_name
            )}"><br><a href="${imgUrl}" download target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:6px;padding:6px 10px;background:#007bff;color:#fff;border-radius:4px;text-decoration:none;">Download Design</a>`
          : "No image";

        return `
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">
            <strong>${escapeHtml(item.product_name)}</strong>
            ${item.clothing_type ? `<br><span style="background:#e3f2fd;padding:2px 6px;border-radius:4px;font-size:12px;">Cloth: ${escapeHtml(item.clothing_type)}</span>` : ""}
            ${item.size ? `<br>Size: <strong>${escapeHtml(item.size)}</strong>` : ""}
            ${item.color ? `<br>Color: <strong>${escapeHtml(item.color)}</strong>` : ""}
            ${item.image_position ? `<br><span style="font-size:11px;color:#666;">Image Position: ${escapeHtml(item.image_position)}</span>` : ""}
          </td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 18px; font-weight: bold;">${item.quantity}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
            ${imageCell}
          </td>
        </tr>
      `;
      })
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order - ${order.order_number}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; background: #fff; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { background: #1a1a1a; color: white; padding: 30px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px; font-size: 28px; }
    .header p { margin: 0; opacity: 0.8; }
    .urgent-banner { background: #dc3545; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .info-card h3 { margin: 0 0 15px; color: #333; font-size: 14px; text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 8px; }
    .info-card p { margin: 5px 0; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #333; color: white; padding: 15px; text-align: left; }
    .checklist { background: #fff3cd; padding: 20px; border-radius: 8px; margin-top: 30px; }
    .checklist h3 { margin: 0 0 15px; color: #856404; }
    .checklist-item { display: flex; align-items: center; margin: 10px 0; }
    .checkbox { width: 20px; height: 20px; border: 2px solid #333; margin-right: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; }
    .signature-line { margin-top: 60px; border-top: 1px solid #333; width: 200px; }
    .signature-label { font-size: 12px; color: #666; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PURCHASE ORDER</h1>
      <p>Order: ${order.order_number} | Date: ${new Date(order.created_at).toLocaleDateString("en-IN")}</p>
    </div>
    
    <div class="urgent-banner">
      ⚡ FULFILLMENT REQUIRED - Please prepare items below
    </div>
    
    <div class="info-grid">
      <div class="info-card">
        <h3>📍 Ship To</h3>
        ${
          order.shipping_address
            ? `
          <p><strong>${escapeHtml(order.shipping_address.full_name)}</strong></p>
          <p>${escapeHtml(order.shipping_address.address_line1)}</p>
          ${order.shipping_address.address_line2 ? `<p>${escapeHtml(order.shipping_address.address_line2)}</p>` : ""}
          <p>${escapeHtml(order.shipping_address.city)}, ${escapeHtml(order.shipping_address.state)}</p>
          <p>${escapeHtml(order.shipping_address.postal_code)}, ${escapeHtml(order.shipping_address.country)}</p>
          <p><strong>📞 ${escapeHtml(order.shipping_address.phone)}</strong></p>
        `
            : "<p>No shipping address provided</p>"
        }
      </div>
      <div class="info-card">
        <h3>📋 Order Info</h3>
        <p>Status: <strong>${escapeHtml(order.status ? order.status.toUpperCase() : "")}</strong></p>
        <p>Payment: ${escapeHtml(order.payment_status || "")}</p>
        <p>Items: ${order.order_items.length}</p>
        <p>Total Qty: ${order.order_items.reduce((sum, i) => sum + (i.quantity || 0), 0)}</p>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Product Details</th>
          <th style="text-align: center;">Quantity</th>
          <th>Reference Image</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    
    <div class="checklist">
      <h3>✅ Fulfillment Checklist</h3>
      <div class="checklist-item"><div class="checkbox"></div> All items picked and verified</div>
      <div class="checklist-item"><div class="checkbox"></div> Quality check completed</div>
      <div class="checklist-item"><div class="checkbox"></div> Properly packed</div>
      <div class="checklist-item"><div class="checkbox"></div> Shipping label attached</div>
    </div>
    
    <div class="footer">
      <p><strong>Notes:</strong> ${escapeHtml(order.notes || "No special instructions")}</p>
      <div class="signature-line"></div>
      <p class="signature-label">Prepared By / Date</p>
    </div>
  </div>
</body>
</html>`;
  };

  const downloadAsHtml = (filename: string, html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  const downloadInvoice = (order: Order) => {
    const html = generateInvoiceHTML(order);
    downloadAsHtml(`ai-invoice-${order.order_number}.html`, html);
  };

  const downloadPurchaseOrder = (order: Order) => {
    const html = generatePurchaseOrderHTML(order);
    downloadAsHtml(`ai-po-${order.order_number}.html`, html);
  };

  // download design image helper
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admintesora/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">AI Generated Orders (Admin)</h1>
        </div>
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
            {loadingOrders ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No AI-generated orders found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || ""}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>{order.order_items.length} items</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetails(order)}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => downloadInvoice(order)}>
                            <FileText className="h-4 w-4 mr-1" />Invoice
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => downloadPurchaseOrder(order)}>
                            <Download className="h-4 w-4 mr-1" />PO
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
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Order Info</h4>
                  <p className="text-sm">Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                  <p className="text-sm">Status: {selectedOrder.status}</p>
                  <p className="text-sm">Payment: {selectedOrder.payment_status}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Shipping Address</h4>
                  {selectedOrder.shipping_address ? (
                    <div className="text-sm">
                      <p>{selectedOrder.shipping_address.full_name}</p>
                      <p>{selectedOrder.shipping_address.address_line1}</p>
                      {selectedOrder.shipping_address.address_line2 && <p>{selectedOrder.shipping_address.address_line2}</p>}
                      <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.postal_code}</p>
                      <p>Phone: {selectedOrder.shipping_address.phone}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No address provided</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">AI Products in Order</h4>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      {item.product_image && (
                        <div className="flex flex-col items-center">
                          <img src={item.product_image} alt={item.product_name} className="w-16 h-16 object-cover rounded" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDesignImage(item.product_image, `${selectedOrder.order_number}-${item.product_id}.jpg`)}
                            className="mt-2"
                          >
                            <Download className="h-4 w-4 mr-2" />Download Design
                          </Button>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.clothing_type && `Cloth: ${item.clothing_type}`}
                          {item.clothing_type && (item.size || item.color || item.image_position) && " | "}
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && " | "}
                          {item.color && `Color: ${item.color}`}
                          {(item.image_position && (item.size || item.color)) && " | "}
                          {item.image_position && `Img Pos: ${item.image_position}`}
                        </p>
                        <p className="text-sm">Qty: {item.quantity} × ₹{item.unit_price} = ₹{item.total_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold">Products Total:</span>
                <span className="text-xl font-bold">₹{selectedOrder.order_items.reduce((sum, it) => sum + it.total_price, 0).toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => downloadInvoice(selectedOrder)}>
                  <FileText className="h-4 w-4 mr-2" />Download Invoice
                </Button>
                <Button variant="outline" onClick={() => downloadPurchaseOrder(selectedOrder)}>
                  <Download className="h-4 w-4 mr-2" />Download Purchase Order
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
