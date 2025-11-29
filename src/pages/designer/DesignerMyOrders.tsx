import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  size: string | null;
  color: string | null;
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

const DesignerMyOrders = () => {
  const { user, isDesigner, loading } = useDesigner();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [designerProducts, setDesignerProducts] = useState<string[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

      // Get unique order IDs
      const orderIds = [...new Set(orderItems.map((item) => item.order_id))];

      // Fetch orders with addresses
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*, shipping_address_id")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      if (!ordersData) {
        setOrders([]);
        return;
      }

      // Fetch addresses
      const addressIds = ordersData
        .map((o) => o.shipping_address_id)
        .filter(Boolean);

      const { data: addresses } = await supabase
        .from("addresses")
        .select("*")
        .in("id", addressIds);

      // Combine orders with their items (only designer's products) and addresses
      const enrichedOrders: Order[] = ordersData.map((order) => {
        const items = orderItems.filter((item) => item.order_id === order.id);
        const address = addresses?.find(
          (a) => a.id === order.shipping_address_id
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

  const generateInvoiceHTML = (order: Order) => {
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const itemsHTML = order.order_items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            ${escapeHtml(item.product_name)}
            ${item.size ? `<br><small>Size: ${escapeHtml(item.size)}</small>` : ""}
            ${item.color ? `<br><small>Color: ${escapeHtml(item.color)}</small>` : ""}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.unit_price.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.total_price.toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const designerTotal = order.order_items.reduce(
      (sum, item) => sum + item.total_price,
      0
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Designer Invoice - ${order.order_number}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
    .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: #333; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { margin: 0; font-size: 24px; color: #333; }
    .invoice-title p { margin: 5px 0 0; color: #666; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { flex: 1; }
    .info-box h3 { margin: 0 0 10px; font-size: 14px; color: #999; text-transform: uppercase; }
    .info-box p { margin: 5px 0; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #333; color: white; padding: 12px; text-align: left; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:last-child { text-align: right; }
    .total-section { text-align: right; margin-top: 20px; }
    .total-row { display: flex; justify-content: flex-end; margin: 8px 0; }
    .total-label { width: 150px; color: #666; }
    .total-value { width: 100px; font-weight: bold; }
    .grand-total { font-size: 20px; color: #333; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .badge-processing { background: #cce5ff; color: #004085; }
    .badge-shipped { background: #e2d4f0; color: #6f42c1; }
    .badge-delivered { background: #d4edda; color: #155724; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
    .designer-note { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .designer-note h4 { margin: 0 0 10px; color: #333; }
    .designer-note p { margin: 0; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo">TESORA</div>
      <div class="invoice-title">
        <h1>DESIGNER INVOICE</h1>
        <p>${order.order_number}</p>
        <p>${new Date(order.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </div>
    
    <div class="info-section">
      <div class="info-box">
        <h3>Order Status</h3>
        <p><span class="badge badge-${order.status}">${order.status.toUpperCase()}</span></p>
        <p>Payment: ${order.payment_status}</p>
      </div>
      <div class="info-box">
        <h3>Ship To</h3>
        ${
          order.shipping_address
            ? `
          <p><strong>${escapeHtml(order.shipping_address.full_name)}</strong></p>
          <p>${escapeHtml(order.shipping_address.address_line1)}</p>
          ${order.shipping_address.address_line2 ? `<p>${escapeHtml(order.shipping_address.address_line2)}</p>` : ""}
          <p>${escapeHtml(order.shipping_address.city)}, ${escapeHtml(order.shipping_address.state)} ${escapeHtml(order.shipping_address.postal_code)}</p>
          <p>Phone: ${escapeHtml(order.shipping_address.phone)}</p>
        `
            : "<p>No shipping address</p>"
        }
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
    
    <div class="total-section">
      <div class="total-row grand-total">
        <span class="total-label">Your Products Total:</span>
        <span class="total-value">₹${designerTotal.toFixed(2)}</span>
      </div>
    </div>
    
    <div class="designer-note">
      <h4>📦 Designer Note</h4>
      <p>This invoice contains only items from your product catalog. Please prepare these items for fulfillment.</p>
    </div>
    
    <div class="footer">
      <p>Generated on ${new Date().toLocaleString("en-IN")} | TESORA Designer Portal</p>
    </div>
  </div>
</body>
</html>`;
  };

  const generatePurchaseOrderHTML = (order: Order) => {
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const itemsHTML = order.order_items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd;">
            <strong>${escapeHtml(item.product_name)}</strong>
            ${item.size ? `<br>Size: ${escapeHtml(item.size)}` : ""}
            ${item.color ? `<br>Color: ${escapeHtml(item.color)}` : ""}
          </td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 18px; font-weight: bold;">${item.quantity}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">
            ${item.product_image ? `<img src="${item.product_image}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">` : "No image"}
          </td>
        </tr>
      `
      )
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
      <h1>�icing PURCHASE ORDER</h1>
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
        <p>Status: <strong>${order.status.toUpperCase()}</strong></p>
        <p>Payment: ${order.payment_status}</p>
        <p>Items: ${order.order_items.length}</p>
        <p>Total Qty: ${order.order_items.reduce((sum, i) => sum + i.quantity, 0)}</p>
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
      <p><strong>Notes:</strong> ${order.notes || "No special instructions"}</p>
      <div class="signature-line"></div>
      <p class="signature-label">Prepared By / Date</p>
    </div>
  </div>
</body>
</html>`;
  };

  const downloadInvoice = (order: Order) => {
    const html = generateInvoiceHTML(order);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `designer-invoice-${order.order_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  };

  const downloadPurchaseOrder = (order: Order) => {
    const html = generatePurchaseOrderHTML(order);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-order-${order.order_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Purchase order downloaded");
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/designer/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">My Product Orders</h1>
        </div>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Your Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const designerTotal = order.order_items.reduce(
                      (sum, item) => sum + item.total_price,
                      0
                    );
                    return (
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
                        <TableCell>{order.order_items.length} items</TableCell>
                        <TableCell>₹{designerTotal.toFixed(2)}</TableCell>
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
                    .reduce((sum, item) => sum + item.total_price, 0)
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

export default DesignerMyOrders;
