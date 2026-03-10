import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Eye, Home, Search } from "lucide-react";
import { toast } from "sonner";
// @ts-ignore - html2pdf has no perfect TS types
import html2pdf from "html2pdf.js";

/* ---------- TYPES ---------- */

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  size: string | null;
  color: string | null;

  // From order_items table
  status?: string;
  delivery_order_id?: string | null;
  cancellation_reason?: string | null;
  dispatch_date?: string | null; // MUST exist in order_items table

  // Computed from products → designers
  designer_name?: string | null;
}

interface Address {
  id?: string;
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
  user_id?: string;
  status: string;
  total_amount: number;
  created_at: string;
  payment_status?: string;
  payment_method?: string | null;
  shipping_address?: Address | null;
  billing_address?: Address | null;
  shipping_address_id?: string | null;
  billing_address_id?: string | null;
  order_items: OrderItem[];
  invoice_url?: string | null;
}

// Helper: check if order date is within selected date filter
const isWithinDateFilter = (createdAt: string, filter: string): boolean => {
  if (filter === "all") return true;

  const orderDate = new Date(createdAt);
  const now = new Date();

  // Normalize to remove time for day-based comparisons
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

const AdminOrders = () => {
  const { isAdmin, loading: authLoading } = useAdmin();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all"); // 👈 NEW date filter

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const ordersPerPage = 10;

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          const [itemsResult, shippingResult, billingResult] = await Promise.all([
            // 1) Get order items
            supabase
              .from("order_items")
              .select(
                `
                id,
                product_id,
                product_name,
                product_image,
                quantity,
                unit_price,
                total_price,
                size,
                color,
                status,
                delivery_order_id,
                cancellation_reason,
                dispatch_date
              `
              )
              .eq("order_id", order.id),

            // 2) shipping address
            order.shipping_address_id
              ? supabase
                  .from("addresses")
                  .select("*")
                  .eq("id", order.shipping_address_id)
                  .single()
              : Promise.resolve({ data: null }),

            // 3) billing address
            order.billing_address_id
              ? supabase
                  .from("addresses")
                  .select("*")
                  .eq("id", order.billing_address_id)
                  .single()
              : Promise.resolve({ data: null }),
          ]);

          let items: OrderItem[] = (itemsResult.data as OrderItem[]) || [];

          // ---- Attach designer_name for each item ----
          const productIds = Array.from(
            new Set(
              items
                .map((it) => it.product_id)
                .filter((id): id is string => Boolean(id))
            )
          );

          let designerByProductId: Record<string, string | null> = {};

          if (productIds.length > 0) {
            const { data: productsData, error: productsError } = await supabase
              .from("products")
              .select(
                `
                id,
                designer:designer_id (
                  id,
                  name
                )
              `
              )
              .in("id", productIds);

            if (!productsError && productsData) {
              (productsData as any[]).forEach((p) => {
                designerByProductId[p.id] = p.designer?.name ?? null;
              });
            }
          }

          const itemsWithDesigner: OrderItem[] = items.map((it) => ({
            ...it,
            designer_name: it.product_id
              ? designerByProductId[it.product_id] ?? null
              : null,
          }));

          return {
            ...order,
            order_items: itemsWithDesigner,
            shipping_address: shippingResult.data,
            billing_address: billingResult.data,
            invoice_url: order.invoice_url ?? null,
          } as Order;
        })
      );

      setOrders(ordersWithDetails);
    } catch (error: any) {
      toast.error("Failed to fetch orders: " + (error.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  // Helper: fetch invoice HTML either from public invoice_url or from storage
  const fetchInvoiceHtmlText = async (order: Order): Promise<string> => {
    // 1) try public URL if available
    if (order.invoice_url) {
      try {
        const resp = await fetch(order.invoice_url);
        if (resp.ok) {
          const text = await resp.text();
          return text;
        }
      } catch (err) {
        console.warn("fetch(invoice_url) failed, falling back to storage:", err);
      }
    }

    // 2) fallback to Supabase storage
    const { data, error } = await supabase.storage
      .from("invoices")
      .download(`${order.order_number}.html`);

    if (error) throw error;
    const text = await data.text();
    return text;
  };

  // Download PDF instead of HTML
  const downloadInvoicePdf = async (order: Order) => {
    try {
      const html = await fetchInvoiceHtmlText(order);

      const opt = {
        margin: 8,
        filename: `invoice-${order.order_number}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      // @ts-ignore
      html2pdf().set(opt).from(html).save();

      toast.success("Invoice PDF download started");
    } catch (error: any) {
      toast.error("Failed to download invoice: " + (error.message || String(error)));
    }
  };

  const openInvoiceInModal = async (order: Order) => {
    try {
      setInvoiceHtml(null);
      setInvoiceModalOpen(true);

      const text = await fetchInvoiceHtmlText(order);
      setInvoiceHtml(text);
    } catch (error: any) {
      toast.error("Failed to load invoice: " + (error.message || String(error)));
      setInvoiceModalOpen(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_address?.full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      order.shipping_address?.phone?.includes(searchQuery);

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    const matchesDate = isWithinDateFilter(order.created_at, dateFilter);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admintesora/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Orders Management</h1>
          </div>
          <Link to="/admintesora/dashboard">
                <Button variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, customer name, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select
            value={dateFilter}
            onValueChange={(value) => {
              setDateFilter(value);
              setCurrentPage(1);
            }}
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

        {/* Orders Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    {order.shipping_address?.full_name || "N/A"}
                  </TableCell>
                  <TableCell>
                    {order.shipping_address?.phone || "N/A"}
                  </TableCell>
                  <TableCell>{order.order_items?.length || 0} item(s)</TableCell>
                  <TableCell>₹{(order.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status] || "bg-gray-100"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {order.invoice_url && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInvoiceInModal(order);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadInvoicePdf(order);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {paginatedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No orders found for selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>

      {/* ORDER DETAILS DIALOG */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Order Details - {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <p className="text-sm">
                    Status:{" "}
                    <span>
                      <Badge
                        className={
                          statusColors[selectedOrder.status] || "bg-gray-100"
                        }
                      >
                        {selectedOrder.status}
                      </Badge>
                    </span>
                  </p>
                  <p className="text-sm">
                    Payment: {selectedOrder.payment_status || "N/A"}
                  </p>
                  <p className="text-sm">
                    Method: {selectedOrder.payment_method || "N/A"}
                  </p>
                  <p className="text-sm">
                    Total: ₹{(selectedOrder.total_amount || 0).toFixed(2)}
                  </p>
                  <p className="text-sm">
                    Date:{" "}
                    {new Date(
                      selectedOrder.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Shipping Address</h3>
                  {selectedOrder.shipping_address ? (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">
                        {selectedOrder.shipping_address.full_name}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedOrder.shipping_address.phone}
                      </p>
                      <p>{selectedOrder.shipping_address.address_line1}</p>
                      {selectedOrder.shipping_address.address_line2 && (
                        <p>{selectedOrder.shipping_address.address_line2}</p>
                      )}
                      <p>
                        {selectedOrder.shipping_address.city},{" "}
                        {selectedOrder.shipping_address.state}
                      </p>
                      <p>{selectedOrder.shipping_address.postal_code}</p>
                      <p className="font-medium">
                        {selectedOrder.shipping_address.country}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No shipping address available
                    </p>
                  )}
                </div>
              </div>

              {/* ORDER ITEMS */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-3 border rounded-lg"
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

                        {/* Designer name */}
                        <p className="text-xs text-muted-foreground mb-1">
                          Designer: {item.designer_name || "N/A"}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          {item.size && `Size: ${item.size}`}{" "}
                          {item.color && `• Color: ${item.color}`}
                        </p>

                        <p className="text-sm">
                          Quantity: {item.quantity} × ₹
                          {item.unit_price.toFixed(2)}
                        </p>

                        {/* Item-level status + tracking / reason */}
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Item Status:</span>
                            <Badge
                              className={
                                item.status
                                  ? statusColors[item.status] ||
                                    "bg-gray-100"
                                  : "bg-gray-100"
                              }
                            >
                              {item.status || "pending"}
                            </Badge>
                          </div>

                          {item.status === "delivered" && (
                            <p className="text-muted-foreground">
                              Tracking / Order ID:{" "}
                              {item.delivery_order_id || "Not provided"}
                              {item.dispatch_date && (
                                <> • Dispatch Date: {item.dispatch_date}</>
                              )}
                            </p>
                          )}

                          {item.status === "cancelled" && (
                            <p className="text-muted-foreground">
                              Cancellation Reason:{" "}
                              {item.cancellation_reason || "Not provided"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">
                          ₹{item.total_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      <Dialog
        open={invoiceModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceModalOpen(false);
            setInvoiceHtml(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!invoiceHtml && (
              <div className="min-h-[200px] flex items-center justify-center">
                Loading invoice...
              </div>
            )}

            {invoiceHtml && (
              <div className="w-full h-[70vh]">
                <iframe
                  title="Invoice Preview"
                  srcDoc={invoiceHtml}
                  className="w-full h-full border rounded"
                  sandbox=""
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setInvoiceModalOpen(false);
                  setInvoiceHtml(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
