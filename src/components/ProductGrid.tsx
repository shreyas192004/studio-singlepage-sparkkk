import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { trackEvent } from "@/utils/analytics";

interface ProductGridProps {
  products: any[];
  page?: string;
}

const ITEMS_PER_PAGE = 12;

export const ProductGrid = ({ products, page }: ProductGridProps) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Reset to page 1 when products list changes
    setCurrentPage(1);
  }, [products]);

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

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = products.slice(startIndex, endIndex);

  const handlePageChange = (pageNum: number) => {
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {currentProducts.map((product) => {
          const discount = calculateDiscount(
            product.price,
            product.compare_at_price
          );
          return (
            <Card key={product.id} className="group overflow-hidden">
              <Link
                to={`/products/${product.id}`}
                onClick={() => handleProductClick(product.id)}
              >
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
                    <h3 className="font-semibold hover:underline">
                      {product.title}
                    </h3>
                  </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleWishlist(product)}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isInWishlist(product.id)
                        ? "fill-red-500 text-red-500"
                        : ""
                    }`}
                  />
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <p
                  className={`font-bold ${
                    discount > 0 ? "text-red-500" : ""
                  }`}
                >
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

    {products.length === 0 && (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found</p>
      </div>
    )}

    {/* Pagination */}
    {products.length > 0 && totalPages > 1 && (
      <div className="mt-8 flex justify-center items-center gap-2">
        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            if (
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
            ) {
              return (
                <Button
                  key={pageNum}
                  variant={
                    currentPage === pageNum ? "default" : "outline"
                  }
                  onClick={() => handlePageChange(pageNum)}
                  className="w-10"
                >
                  {pageNum}
                </Button>
              );
            } else if (
              pageNum === currentPage - 2 ||
              pageNum === currentPage + 2
            ) {
              return (
                <span key={pageNum} className="px-2 flex items-center">
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>

        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    )}
  </div>
  );
};
