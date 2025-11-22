import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { trackEvent } from "@/utils/analytics";

interface ProductGridProps {
  products: any[];
  page?: string;
}

export const ProductGrid = ({ products, page }: ProductGridProps) => {
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    let result = [...products];

    // Filter by price
    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "popular":
        result.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
    }

    setFilteredProducts(result);
  }, [products, sortBy, priceRange]);

  const handleProductClick = (productId: string) => {
    trackEvent("product_click", { productId, page });
  };

  const handleAddToCart = (product: any) => {
    addToCart(product);
    trackEvent("add_to_cart", { productId: product.id, quantity: 1 });
  };

  const handleToggleWishlist = (product: any) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
      trackEvent("add_to_wishlist", { productId: product.id });
    }
  };

  const calculateDiscount = (price: number, compareAt: number) => {
    if (!compareAt || compareAt <= price) return 0;
    return Math.round(((compareAt - price) / compareAt) * 100);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <Label className="text-sm font-semibold mb-2 block">
            Price Range: Rs {priceRange[0]} - Rs {priceRange[1]}
          </Label>
          <Slider
            min={0}
            max={500}
            step={10}
            value={priceRange}
            onValueChange={(value) => setPriceRange(value as [number, number])}
          />
        </div>
        <div className="w-full md:w-64">
          <Label className="text-sm font-semibold mb-2 block">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const discount = calculateDiscount(product.price, product.compare_at_price);
          return (
            <Card key={product.id} className="group overflow-hidden">
              <Link to={`/products/${product.id}`} onClick={() => handleProductClick(product.id)}>
                <div className="aspect-square overflow-hidden relative">
                  {discount > 0 && (
                    <Badge className="absolute top-2 right-2 bg-red-500 z-10">
                      -{discount}%
                    </Badge>
                  )}
                  <img
                    src={product.images?.[0] || "/placeholder.svg"}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <Link to={`/products/${product.id}`}>
                    <h3 className="font-semibold hover:underline">{product.title}</h3>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleWishlist(product)}
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        isInWishlist(product.id) ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p className={`font-bold ${discount > 0 ? 'text-red-500' : ''}`}>
                    {product.currency} {product.price}
                  </p>
                  {product.compare_at_price && discount > 0 && (
                    <p className="text-sm text-muted-foreground line-through">
                      {product.currency} {product.compare_at_price}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleAddToCart(product)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found</p>
        </div>
      )}
    </div>
  );
};