import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/ProductGrid";
import { Instagram, Twitter, Globe, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/utils/analytics";

const DesignerDetail = () => {
  const { id } = useParams();
  const [designer, setDesigner] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDesigner();
      fetchProducts();
      trackEvent("designer_view", { designerId: id });
    }
  }, [id]);

  const fetchDesigner = async () => {
    const { data, error } = await (supabase as any)
      .from("designers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Designer not found");
    } else {
      setDesigner(data);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await (supabase as any)
      .from("products")
      .select("*")
      .eq("designer_id", id)
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    if (!error) {
      setProducts(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading designer...</div>
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Designer not found</h2>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <img
              src={designer.avatar_url || "/placeholder.svg"}
              alt={designer.name}
              className="w-32 h-32 rounded-full object-cover"
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">{designer.name}</h1>
              {designer.bio && <p className="text-lg text-muted-foreground mb-6">{designer.bio}</p>}
              
              <div className="flex gap-4">
                {designer.social_links?.instagram && (
                  <a
                    href={designer.social_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Instagram className="h-6 w-6" />
                  </a>
                )}
                {designer.social_links?.twitter && (
                  <a
                    href={designer.social_links.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Twitter className="h-6 w-6" />
                  </a>
                )}
                {designer.social_links?.website && (
                  <a
                    href={designer.social_links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="h-6 w-6" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Products by {designer.name}</h2>
          {products.length === 0 ? (
            <p className="text-muted-foreground">No products available yet.</p>
          ) : (
            <ProductGrid products={products} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignerDetail;
