import { useEffect, useState } from "react";
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
import { Home, Download } from "lucide-react";
import { toast } from "sonner";

const DesignerAnalytics = () => {
  const { isDesigner, loading } = useDesigner();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({
    totalEvents: 0,
    productClicks: [],
    pageViews: [],
    topProducts: [],
    aiGenerations: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isDesigner) {
      navigate("/designer/login");
    }
  }, [isDesigner, loading, navigate]);

  useEffect(() => {
    if (isDesigner) {
      fetchAnalytics();
    }
  }, [isDesigner]);

  const fetchAnalytics = async () => {
    try {
      // Get total events
      const { count } = await (supabase as any)
        .from("analytics_events")
        .select("*", { count: "exact", head: true });

      // Get product clicks
      const { data: clicks } = await (supabase as any)
        .from("analytics_events")
        .select("product_id, data")
        .eq("event_type", "product_click")
        .order("created_at", { ascending: false })
        .limit(100);

      // Get page views
      const { data: views } = await (supabase as any)
        .from("analytics_events")
        .select("page, created_at")
        .eq("event_type", "page_view")
        .order("created_at", { ascending: false })
        .limit(100);

      // Calculate top products by clicks
      const productClickCounts = clicks?.reduce((acc: any, click) => {
        const productId = click.product_id;
        if (productId) {
          acc[productId] = (acc[productId] || 0) + 1;
        }
        return acc;
      }, {});

      const topProductIds = Object.entries(productClickCounts || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([id]) => id);

      // Fetch product details
      let topProducts = [];
      if (topProductIds.length > 0) {
        const { data: products } = await (supabase as any)
          .from("products")
          .select("id, title, images")
          .in("id", topProductIds);

        topProducts = topProductIds.map((id) => {
          const product = products?.find((p) => p.id === id);
          return {
            ...product,
            clicks: productClickCounts[id],
          };
        });
      }

      // Calculate page view counts
      const pageViewCounts = views?.reduce((acc: any, view) => {
        const page = view.page || "unknown";
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {});

      // Fetch AI generations with user profiles
      const { data: generations, error: genError } = await (supabase as any)
        .from("ai_generations")
        .select(`
          *,
          profiles!ai_generations_user_id_fkey (
            email,
            display_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (genError) {
        console.error("Error fetching AI generations:", genError);
      }

      setStats({
        totalEvents: count || 0,
        productClicks: clicks || [],
        pageViews: Object.entries(pageViewCounts || {})
          .map(([page, count]) => ({ page, count }))
          .sort((a: any, b: any) => b.count - a.count),
        topProducts,
        aiGenerations: generations || [],
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ["Product", "Clicks"],
      ...stats.topProducts.map((p: any) => [p.title, p.clicks]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const exportAIGenerationsCSV = () => {
    if (!stats.aiGenerations.length) {
      toast.error("No generation data to export");
      return;
    }

    const csv = [
      ["User Email", "Display Name", "Session ID", "Prompt", "Style", "Color Scheme", "Created At"],
      ...stats.aiGenerations.map((gen: any) => [
        gen.profiles?.email || "Anonymous",
        gen.profiles?.display_name || "N/A",
        gen.session_id || "N/A",
        `"${gen.prompt.replace(/"/g, '""')}"`,
        gen.style,
        gen.color_scheme,
        new Date(gen.created_at).toLocaleString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-generations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("AI Generations CSV exported successfully");
  };

  if (loading || !isDesigner) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Link to="/designer/dashboard">
                <Button variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Total Events Tracked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.totalEvents}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.pageViews.slice(0, 5).map((pv: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{pv.page}</span>
                        <span className="font-bold">{pv.count} views</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Clicked Products</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topProducts.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <img
                            src={product.images?.[0] || "/placeholder.svg"}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        </TableCell>
                        <TableCell>{product.title}</TableCell>
                        <TableCell className="text-right font-bold">{product.clicks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* AI Generations Analytics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI Design Generations</CardTitle>
                  <Button onClick={exportAIGenerationsCSV} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stats.aiGenerations.length === 0 ? (
                  <p className="text-muted-foreground">No AI generations yet</p>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Total Generations: {stats.aiGenerations.length}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Prompt</TableHead>
                          <TableHead>Style</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.aiGenerations.map((gen: any) => (
                          <TableRow key={gen.id}>
                            <TableCell>
                              <img
                                src={gen.image_url}
                                alt="Generated design"
                                className="w-16 h-16 object-cover rounded shadow-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {gen.profiles?.email || "Anonymous"}
                                </div>
                                {gen.profiles?.display_name && (
                                  <div className="text-xs text-muted-foreground">
                                    {gen.profiles.display_name}
                                  </div>
                                )}
                                {!gen.profiles && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {gen.session_id}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <div className="line-clamp-2" title={gen.prompt}>
                                {gen.prompt}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                                {gen.style}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent-foreground capitalize">
                                {gen.color_scheme}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm">
                                  {new Date(gen.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(gen.created_at).toLocaleTimeString()}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default DesignerAnalytics;