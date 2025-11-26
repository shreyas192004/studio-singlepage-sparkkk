import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDesigner } from "@/contexts/DesignerContext";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ArrowLeft, Download, Eye, Search } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  size: string | null;
  color: string | null;
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

interface ProductSummary {
  id: string;
  title: string;
  sku?: string;
  price?: number;
  currency?: string;
  image?: string | null;
  designer_id?: string | null;
  designer?: string | null;
  totalSold: number;
  totalRevenue: number;
}

const DesignerOrders = () => {
  const { isDesigner, loading: authLoading } = useDesigner();
  const navigate = useNavigate();

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true); // orders loading
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const ordersPerPage = 10;

  // Products summary state
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      fetchProductsSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ---------- Orders ----------
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
            supabase.from("order_items").select("*").eq("order_id", order.id),
            order.shipping_address_id
              ? supabase.from("addresses").select("*").eq("id", order.shipping_address_id).single()
              : Promise.resolve({ data: null }),
            order.billing_address_id
              ? supabase.from("addresses").select("*").eq("id", order.billing_address_id).single()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...order,
            order_items: itemsResult.data || [],
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

  const downloadInvoice = async (orderNumber: string) => {
    try {
      const { data, error } = await supabase.storage.from("invoices").download(`${orderNumber}.html`);
      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderNumber}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      toast.error("Failed to download invoice: " + (error.message || String(error)));
    }
  };

  const openInvoiceInModal = async (order: Order) => {
    try {
      setInvoiceHtml(null);
      setInvoiceModalOpen(true);

      if (order.invoice_url) {
        try {
          const resp = await fetch(order.invoice_url);
          if (resp.ok) {
            const text = await resp.text();
            setInvoiceHtml(text);
            return;
          }
        } catch (err) {
          console.warn("fetch invoice_url failed, falling back to storage:", err);
        }
      }

      const { data, error } = await supabase.storage.from("invoices").download(`${order.order_number}.html`);
      if (error) throw error;
      const text = await data.text();
      setInvoiceHtml(text);
    } catch (error: any) {
      toast.error("Failed to load invoice: " + (error.message || String(error)));
      setInvoiceModalOpen(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_address?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_address?.phone?.includes(searchQuery);

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
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

  // ---------- Products Summary ----------
  const sumNumbers = (arr: number[]) => arr.reduce((a, b) => a + (b || 0), 0);

  const fetchProductsSummary = async () => {
    try {
      setProductsLoading(true);

      // 1) fetch products (adjust selected fields for your schema)
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, title, sku, price, currency, images, designer_profile_id")
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      const products = productsData || [];

      // 2) fetch designers for products (single query)
      const designerIds = Array.from(
        new Set(products.map((p: any) => p.designer_profile_id).filter(Boolean))
      ) as string[];

      let designersMap: Record<string, any> = {};
      if (designerIds.length > 0) {
        const { data: designersData, error: designersError } = await supabase
          .from("designers")
          .select("id, name, user_id")
          .in("id", designerIds);
        if (!designersError && designersData) {
          designersMap = designersData.reduce((acc: any, d: any) => {
            acc[d.id] = d;
            return acc;
          }, {});
        }
      }

      // 3) aggregate order_items per product
      // NOTE: This does N queries (one per product). For large product sets consider using aggregated SQL (recommended).
      const summaries: ProductSummary[] = await Promise.all(
        products.map(async (p: any) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from("order_items")
            .select("quantity, total_price")
            .eq("product_id", p.id);

          if (itemsError) {
            console.warn("order_items fetch error for product", p.id, itemsError);
          }

          const items = itemsData || [];
          const totalSold = sumNumbers(items.map((it: any) => Number(it.quantity || 0)));
          const totalRevenue = sumNumbers(items.map((it: any) => Number(it.total_price || 0)));

          return {
            id: p.id,
            title: p.title,
            sku: p.sku,
            price: p.price,
            currency: p.currency,
            image: Array.isArray(p.images) ? p.images[0] : p.images || null,
            designer_id: p.designer_profile_id ?? null,
            designer: designersMap[p.designer_profile_id]?.name ?? "Unknown",
            totalSold,
            totalRevenue,
          };
        })
      );

      setProductSummaries(summaries);
    } catch (err: any) {
      console.error("fetchProductsSummary error:", err);
      toast.error("Failed to fetch product summaries: " + (err.message || String(err)));
      setProductSummaries([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // ---------- render ----------
  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admintesora/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Orders & Products Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* --- Products Summary --- */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Designer Products Summary</h2>

          {productsLoading ? (
            <div className="py-8 text-center">Loading products...</div>
          ) : productSummaries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No products found</div>
          ) : (
            <div className="border rounded-lg overflow-hidden mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total Sold</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Designer</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummaries.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-sm">N/A</div>
                        )}
                        <div>
                          <div className="font-medium">{p.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>{p.sku || "—"}</TableCell>
                      <TableCell>{p.currency} {p.price}</TableCell>
                      <TableCell>{p.totalSold}</TableCell>
                      <TableCell>₹{(p.totalRevenue || 0).toFixed(2)}</TableCell>
                      <TableCell>{p.designer}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admintesora/products/${p.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* --- Orders Controls --- */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, customer name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        </div>

        {/* --- Orders Table --- */}
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
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.shipping_address?.full_name || "N/A"}</TableCell>
                  <TableCell>{order.shipping_address?.phone || "N/A"}</TableCell>
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
                              downloadInvoice(order.order_number);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* --- Pagination --- */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <p className="text-sm">
                    Status: <Badge className={statusColors[selectedOrder.status]}>{selectedOrder.status}</Badge>
                  </p>
                  <p className="text-sm">Payment: {selectedOrder.payment_status || "N/A"}</p>
                  <p className="text-sm">Method: {selectedOrder.payment_method || "N/A"}</p>
                  <p className="text-sm">Total: ₹{(selectedOrder.total_amount || 0).toFixed(2)}</p>
                  <p className="text-sm">Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Shipping Address</h3>
                  {selectedOrder.shipping_address ? (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{selectedOrder.shipping_address.full_name}</p>
                      <p className="text-muted-foreground">{selectedOrder.shipping_address.phone}</p>
                      <p>{selectedOrder.shipping_address.address_line1}</p>
                      {selectedOrder.shipping_address.address_line2 && (
                        <p>{selectedOrder.shipping_address.address_line2}</p>
                      )}
                      <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}</p>
                      <p>{selectedOrder.shipping_address.postal_code}</p>
                      <p className="font-medium">{selectedOrder.shipping_address.country}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No shipping address available</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex gap-4 p-3 border rounded-lg">
                      {item.product_image && (
                        <img src={item.product_image} alt={item.product_name} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.size && `Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                        </p>
                        <p className="text-sm">Quantity: {item.quantity} × ₹{item.unit_price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{item.total_price.toFixed(2)}</p>
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

export default DesignerOrders;