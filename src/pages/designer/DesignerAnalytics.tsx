import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { Home, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import DesignerOrders from "./DesignerOrders"; // uses the provided DesignerOrders component

// charts
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

// Simple colors used by charts (do not rely on external theme)
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f7f", "#a3a3ff", "#6c5ce7"];

const todayDate = () => new Date().toISOString().split("T")[0];

// Dummy data fallback (designer-focused)
const DUMMY_PRODUCTS = [
  { id: "p1", title: "Cozy Hoodie", images: ["/placeholder.svg"], clicks: 1200, views: 5400, reviews: 120, avgRating: 4.2, totalSold: 320, revenue: 51200 },
  { id: "p2", title: "Minimalist Mug", images: ["/placeholder.svg"], clicks: 890, views: 3800, reviews: 45, avgRating: 4.6, totalSold: 180, revenue: 9000 },
  { id: "p3", title: "Desk Poster - Calm", images: ["/placeholder.svg"], clicks: 430, views: 2500, reviews: 20, avgRating: 4.1, totalSold: 95, revenue: 2850 },
  { id: "p4", title: "Leather Notebook", images: ["/placeholder.svg"], clicks: 220, views: 1100, reviews: 10, avgRating: 4.8, totalSold: 60, revenue: 5400 },
];

const DUMMY_ORDERS = [
  { id: "o1", order_number: "ORD-1001", status: "delivered", total_amount: 1200, created_at: new Date().toISOString() },
  { id: "o2", order_number: "ORD-1002", status: "processing", total_amount: 4500, created_at: new Date().toISOString() },
  { id: "o3", order_number: "ORD-1003", status: "pending", total_amount: 750, created_at: new Date().toISOString() },
  { id: "o4", order_number: "ORD-1004", status: "cancelled", total_amount: 0, created_at: new Date().toISOString() },
];

const DUMMY_REVIEWS = [
  { rating: 5, count: 80 },
  { rating: 4, count: 25 },
  { rating: 3, count: 10 },
  { rating: 2, count: 5 },
  { rating: 1, count: 5 },
];

const DesignerAnalytics: React.FC = () => {
  const { isDesigner, loading } = useDesigner();
  const navigate = useNavigate();

  // analytics state
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [designerId, setDesignerId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isDesigner) {
      navigate("/designer/login");
    }
  }, [isDesigner, loading, navigate]);

  useEffect(() => {
    if (isDesigner) {
      initForDesigner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesigner]);

  const initForDesigner = async () => {
    setIsLoading(true);
    try {
      // try to get user and designer id (if your DB has designers table as in provided component)
      const { data: userRes } = await (supabase as any).auth.getUser();
      const user = userRes?.user;
      if (!user) {
        // fallback to dummy
        applyDummy();
        return;
      }

      const { data: designerData, error: dErr } = await (supabase as any)
        .from("designers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (dErr || !designerData) {
        // if no designer record, still show dummy data but set designerId null
        setDesignerId(null);
        applyDummy();
        return;
      }

      setDesignerId(designerData.id);

      // fetch products for this designer
      const { data: productsData, error: pErr } = await (supabase as any)
        .from("products")
        .select("id, title, images, designer_id")
        .eq("designer_id", designerData.id)
        .order("created_at", { ascending: false });

      // fetch analytics events for product clicks/views limited to this designer's products (if you store product_id on events)
      const { data: clicksData } = await (supabase as any)
        .from("analytics_events")
        .select("product_id, event_type, created_at")
        .in("event_type", ["product_click", "page_view"])
        .order("created_at", { ascending: false })
        .limit(500);

      // fetch orders belonging to designer (via order_items -> product designer_id)
      const { data: orderItems } = await (supabase as any)
        .from("order_items")
        .select("*, orders(*)")
        .limit(1000);

      // reviews table example
      const { data: reviewsData } = await (supabase as any)
        .from("reviews")
        .select("rating, product_id")
        .order("created_at", { ascending: false })
        .limit(500);

      // process fetched data if available
      if (productsData && productsData.length) {
        // map products to include counts
        const prodMap: any = {};
        productsData.forEach((p: any) => {
          prodMap[p.id] = { ...p, clicks: 0, views: 0, reviews: 0, avgRating: 0, totalSold: 0, revenue: 0 };
        });

        // clicksData processing
        (clicksData || []).forEach((ev: any) => {
          if (!ev.product_id) return;
          const target = prodMap[ev.product_id];
          if (!target) return;
          if (ev.event_type === "product_click") target.clicks = (target.clicks || 0) + 1;
          if (ev.event_type === "page_view") target.views = (target.views || 0) + 1;
        });

        // reviews
        const ratingMap: Record<string, number[]> = {};
        (reviewsData || []).forEach((r: any) => {
          if (!r.product_id) return;
          ratingMap[r.product_id] = ratingMap[r.product_id] || [];
          ratingMap[r.product_id].push(r.rating);
        });

        Object.keys(prodMap).forEach((pid) => {
          const arr = ratingMap[pid] || [];
          prodMap[pid].reviews = arr.length;
          prodMap[pid].avgRating = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        });

        // order items -> total sold & revenue (basic)
        (orderItems || []).forEach((it: any) => {
          const prod = prodMap[it.product_id];
          if (!prod) return;
          prod.totalSold = (prod.totalSold || 0) + Number(it.quantity || 0);
          prod.revenue = (prod.revenue || 0) + Number(it.total_price || 0);
        });

        setProducts(Object.values(prodMap));
      } else {
        // no products -> fallback to dummy
        applyDummy();
      }

      // orders processing from orderItems
      const ordersFromItems: any = {};
      (orderItems || []).forEach((it: any) => {
        const o = it.orders;
        if (!o) return;
        ordersFromItems[o.id] = ordersFromItems[o.id] || { ...o, count: 0 };
        ordersFromItems[o.id].count += Number(it.quantity || 1);
      });

      const ordersArr = Object.values(ordersFromItems);
      setOrders(ordersArr.length ? ordersArr : DUMMY_ORDERS);

      // reviews distribution
      if (reviewsData && reviewsData.length) {
        const dist: any = {};
        reviewsData.forEach((r: any) => {
          dist[r.rating] = (dist[r.rating] || 0) + 1;
        });
        const reviewArray = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: dist[r] || 0 }));
        setReviews(reviewArray);
      } else {
        setReviews(DUMMY_REVIEWS);
      }
    } catch (err) {
      console.error("analytics init error:", err);
      // fallback to dummy data if anything goes wrong
      applyDummy();
    } finally {
      setIsLoading(false);
    }
  };

  const applyDummy = () => {
    setProducts(DUMMY_PRODUCTS);
    setOrders(DUMMY_ORDERS);
    setReviews(DUMMY_REVIEWS);
    setIsLoading(false);
  };

  // --- computed metrics ---
  const totalClicks = products.reduce((s, p) => s + (p.clicks || 0), 0);
  const totalViews = products.reduce((s, p) => s + (p.views || 0), 0);
  const totalRevenue = products.reduce((s, p) => s + (p.revenue || 0), 0);
  const totalSold = products.reduce((s, p) => s + (p.totalSold || 0), 0);

  // orders status distribution
  const orderStatusDist = orders.reduce((acc: any, o: any) => {
    const status = o.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orderStatusPie = Object.entries(orderStatusDist).map(([key, value]) => ({ name: key, value }));

  // reviews pie
  const reviewsPie = reviews.map((r: any, idx: number) => ({ name: String(r.rating), value: r.count, color: COLORS[idx % COLORS.length] }));

  // product clicks bar
  const productClicksBar = products.map((p) => ({ name: p.title, clicks: p.clicks || 0, views: p.views || 0 }));

  const exportSummaryCSV = () => {
    const csv = [
      ["Metric", "Value"],
      ["Total Products", String(products.length)],
      ["Total Clicks", String(totalClicks)],
      ["Total Views", String(totalViews)],
      ["Total Orders", String(orders.length)],
      ["Total Sold Units", String(totalSold)],
      ["Total Revenue", String(totalRevenue)],
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `designer-summary-${todayDate()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isDesigner) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/designer/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Designer Analytics</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportSummaryCSV}>
              <Download className="mr-2 h-4 w-4" /> Export Summary
            </Button>
            <Link to="/designer/dashboard">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalClicks}</div>
              <div className="text-sm text-muted-foreground">Product clicks across your items</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Page Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalViews}</div>
              <div className="text-sm text-muted-foreground">Total page views for your products</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total revenue across products</div>
            </CardContent>
          </Card>
        </div>

        {/* charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders Status</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={orderStatusPie} dataKey="value" nameKey="name" outerRadius={70} label />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviews Distribution</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={reviewsPie} dataKey="value" nameKey="name" outerRadius={70} label>
                    {reviewsPie.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Products (Clicks)</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productClicksBar} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="clicks" name="Clicks" />
                  <Bar dataKey="views" name="Views" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* products table */}
        <Card>
          <CardHeader>
            <CardTitle>Products Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Reviews</TableHead>
                    <TableHead>Total Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell className="flex items-center gap-3">
                        {p.images && p.images[0] ? (
                          <img src={p.images[0]} alt={p.title} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-sm">N/A</div>
                        )}
                        <div>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground">{p.sku || ""}</div>
                        </div>
                      </TableCell>

                      <TableCell>{p.clicks || 0}</TableCell>
                      <TableCell>{p.views || 0}</TableCell>
                      <TableCell>{p.reviews || 0} • {p.avgRating ? p.avgRating.toFixed(1) : "—"}</TableCell>
                      <TableCell>{p.totalSold || 0}</TableCell>
                      <TableCell>₹{(p.revenue || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* quick orders list (small) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orders.slice(0, 6).map((o: any) => (
                <div key={o.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{o.order_number}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{(o.total_amount || 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{o.status}</div>
                  </div>
                </div>
              ))}

              {orders.length === 0 && <div className="text-center text-muted-foreground py-4">No recent orders</div>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DesignerAnalytics;
