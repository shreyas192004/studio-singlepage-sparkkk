import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductFilters } from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/WishlistContext";
import { toast } from "sonner";

const Products = () => {
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("featured");

  const categories = ["Accessories", "Outerwear", "Bags"];
  const colors = ["Black", "White", "Brown", "Beige", "Green", "Orange"];

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`*, designers ( id, name )`)
        .eq("visibility", "public")
        .eq("is_ai_generated", false);

      if (error) {
        toast.error("Failed to load products");
        setIsLoadingProducts(false);
        return;
      }

      const transformed =
        data?.map((product: any) => ({
          id: product.id,
          name: product.title,
          price: Number(product.price),
          oldPrice: product.compare_at_price
            ? Number(product.compare_at_price)
            : undefined,
          image:
            product.images?.[0] ||
            "https://placehold.co/600x800?text=Product",
          category: product.category,
          color: product.colors?.[0] || "Unknown",
          tag: product.compare_at_price ? "Sale" : undefined,
          dateAdded: product.created_at,
          popularity: product.popularity || 0,
          designerName:
            product.designers?.name ||
            product.designer_name ||
            undefined,
        })) || [];

      setAllProducts(transformed);
      setIsLoadingProducts(false);
    };

    fetchProducts();
  }, []);

  // Apply filters
  let filteredProducts = allProducts.filter((product) => {
    const priceMatch =
      product.price >= priceRange[0] &&
      product.price <= priceRange[1];

    const categoryMatch =
      selectedCategories.length === 0 ||
      selectedCategories.includes(product.category);

    const colorMatch =
      selectedColors.length === 0 ||
      selectedColors.includes(product.color);

    return priceMatch && categoryMatch && colorMatch;
  });

  // Apply sorting
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "newest":
        return (
          new Date(b.dateAdded).getTime() -
          new Date(a.dateAdded).getTime()
        );
      case "popular":
        return b.popularity - a.popularity;
      default:
        return 0;
    }
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleColorChange = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color)
        ? prev.filter((c) => c !== color)
        : [...prev, color]
    );
  };

  const handleWishlistToggle = (product: any) => {
    toggleWishlist(product);
    toast.success(
      isInWishlist(product.id)
        ? "Removed from wishlist"
        : "Added to wishlist"
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>

            <h2 className="text-2xl font-bold text-muted-foreground">
              Products{" "}
              <span className="text-muted-foreground">
                ({filteredProducts.length})
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters((s) => !s)}
              className="md:hidden"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <div className="hidden md:flex items-center text-muted-foreground gap-2">
              <label className="text-sm">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="popular">Popular</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <aside
            className={`${showFilters ? "block" : "hidden"
              } md:block md:col-span-1`}
          >
            <ProductFilters
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoryChange={handleCategoryChange}
              colors={colors}
              selectedColors={selectedColors}
              onColorChange={handleColorChange}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </aside>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {isLoadingProducts ? (
                <div className="col-span-full text-center py-8">
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  No products found.
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-card rounded-lg overflow-hidden"
                  >
                    <Link to={`/products/${product.id}`}>
                      <div className="aspect-[3/4] overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    </Link>

                    <div className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm">
                            {product.name}
                          </h3>
                          {product.designerName && (
                            <p className="text-xs text-muted-foreground">
                              by {product.designerName}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleWishlistToggle(product)}
                        >
                          <Heart
                            className={`w-5 h-5 ${isInWishlist(product.id)
                                ? "fill-red-500 text-red-500"
                                : ""
                              }`}
                          />
                        </button>
                      </div>

                      <div className="mt-2 flex gap-2 items-center">
                        <span className="font-bold">
                          Rs {product.price.toFixed(2)}
                        </span>
                        {product.oldPrice && (
                          <span className="text-sm line-through text-muted-foreground">
                            Rs {product.oldPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 flex justify-center">
              <Button variant="outline">Load more</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Products;
