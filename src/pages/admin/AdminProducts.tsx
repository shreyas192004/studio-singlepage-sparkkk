import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, EyeOff, Home } from "lucide-react";
import { toast } from "sonner";

type Designer = {
  id: string;
  name?: string | null;
};

type Product = {
  id: string;
  title?: string;
  sku?: string;
  category?: string;
  price?: number | string;
  currency?: string;
  visibility?: string;
  images?: string[] | null;
  is_ai_generated?: boolean;
  designer_id?: string | null;
  // we attach this client-side
  designer?: Designer | null;
  created_at?: string;
  [k: string]: any;
};

const AdminProducts = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "ai" | "designer">("all");

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/admintesora");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // 1) fetch products
      const { data: productsData, error: productsError } = await (supabase as any)
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (productsError) {
        toast.error("Failed to load products");
        setProducts([]);
        setIsLoading(false);
        return;
      }

      const productsList: Product[] = productsData || [];

      // 2) get unique designer ids
      const designerIds = Array.from(
        new Set(
          productsList
            .map((p) => p.designer_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        )
      );

      // 3) fetch designers if any
      let designersMap = new Map<string, Designer>();
      if (designerIds.length > 0) {
        const { data: designersData, error: designersError } = await (supabase as any)
          .from("designers")
          .select("id, name")
          .in("id", designerIds);

        if (!designersError && designersData) {
          designersData.forEach((d: any) => {
            designersMap.set(d.id, { id: d.id, name: d.name });
          });
        }
      }

      // 4) attach designer info to each product
      const productsWithDesigner = productsList.map((p) => ({
        ...p,
        designer: p.designer_id ? designersMap.get(p.designer_id) ?? null : null,
      }));

      setProducts(productsWithDesigner);
    } catch (err: any) {
      toast.error("Error loading products: " + (err.message || String(err)));
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await (supabase as any).from("products").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      fetchProducts();
    }
  };

  const toggleVisibility = async (id: string, currentVisibility: string) => {
    const newVisibility = currentVisibility === "public" ? "hidden" : "public";
    const { error } = await (supabase as any)
      .from("products")
      .update({ visibility: newVisibility })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update visibility");
    } else {
      toast.success(`Product ${newVisibility === "public" ? "published" : "hidden"}`);
      fetchProducts();
    }
  };

  // search helper
  const applySearch = (list: Product[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        ((p.title || "") as string).toLowerCase().includes(q) ||
        ((p.sku || "") as string).toLowerCase().includes(q)
    );
  };

  const aiProducts = products.filter((p) => Boolean(p.is_ai_generated));
  const designerProducts = products.filter((p) => !p.is_ai_generated);

  const visibleProducts =
    tab === "all" ? applySearch(products) : tab === "ai" ? applySearch(aiProducts) : applySearch(designerProducts);

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const renderTable = (list: Product[]) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Designer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((product: Product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <img
                    src={((product.images && product.images[0]) as string) || "/placeholder.svg"}
                    alt={product.title || "product image"}
                    className="w-12 h-12 object-cover rounded"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.title}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {product.is_ai_generated ? (
                    <span>AI Generated</span>
                  ) : product.designer?.name ? (
                    product.designer.name
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                <TableCell>
                  {product.currency} {product.price}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.visibility === "public" ? "default" : "secondary"}>
                      {product.visibility}
                    </Badge>
                    {product.is_ai_generated && (
                      <Badge className="ml-2" variant="outline">
                        AI
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(product.id, product.visibility || "hidden")}
                    >
                      {product.visibility === "public" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Link to={`/admintesora/products/${product.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Products Management</h1>
            <div className="flex gap-2">
              <Link to="/admintesora/dashboard">
                <Button variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/admintesora/products/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Input
            placeholder="Search products by title or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />

          <div className="flex items-center gap-2">
            <Button variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>
              All ({products.length})
            </Button>
            <Button variant={tab === "ai" ? "default" : "outline"} onClick={() => setTab("ai")}>
              AI ({aiProducts.length})
            </Button>
            <Button variant={tab === "designer" ? "default" : "outline"} onClick={() => setTab("designer")}>
              Designer ({designerProducts.length})
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading products...</div>
        ) : visibleProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found for the selected tab / search.</p>
          </div>
        ) : (
          renderTable(visibleProducts)
        )}
      </main>
    </div>
  );
};

export default AdminProducts;
