import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductGrid } from "@/components/ProductGrid";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { trackEvent } from "@/utils/analytics";
import { toast } from "sonner";

const Women = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    trackEvent("page_view", { page: "Women", path: "/women" });
  }, []);

  const fetchProducts = async () => {
    const { data, error} = await (supabase as any)
      .from("products")
      .select("*")
      .eq("category", "Women")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Women's Collection</h1>
            <Link to="/">
              <Button variant="ghost" size="icon">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ProductGrid products={products} page="Women" />
      </main>
    </div>
  );
};

export default Women;