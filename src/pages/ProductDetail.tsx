import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Heart, ShoppingCart, Search, User, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CartSidebar } from "@/components/CartSidebar";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_display_name?: string | null;
  user_email?: string | null;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartCount } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Live viewer count (4-12)
  const [viewers, setViewers] = useState<number>(() => Math.floor(Math.random() * 9) + 4);

  // Bulk modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalProduct, setBulkModalProduct] = useState<any | null>(null);

  useEffect(() => {
    const id = "product-viewers-animate-css";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.innerHTML = `
        @keyframes pv-fade { from { opacity: 0.7; transform: translateY(0); } to { opacity: 1; transform: translateY(-2px); } }
        .pv-animate { animation: pv-fade 1.2s ease-in-out infinite alternate; }
      `;
      document.head.appendChild(style);
    }

    let timeoutId: number;
    const tick = () => {
      const next = Math.floor(Math.random() * 9) + 4;
      setViewers(next);
      const delay = Math.floor(Math.random() * 10000) + 20000;
      timeoutId = window.setTimeout(tick, delay);
    };

    timeoutId = window.setTimeout(tick, Math.floor(Math.random() * 3000) + 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .eq("visibility", "public")
          .single();

        if (error) throw error;
        setProduct(data);

        if (data?.category) {
          const { data: related } = await supabase
            .from("products")
            .select("*")
            .eq("visibility", "public")
            .eq("category", data.category)
            .neq("id", id)
            .limit(4);

          setRelatedProducts(related || []);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      try {
        setLoadingReviews(true);
        const { data: reviewsData, error } = await supabase
          .from("reviews")
          .select("*")
          .eq("product_id", id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch user profiles separately
        if (reviewsData && reviewsData.length > 0) {
          const userIds = reviewsData.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, email")
            .in("user_id", userIds);

          const enrichedReviews = reviewsData.map(review => {
            const profile = profiles?.find(p => p.user_id === review.user_id);
            return {
              ...review,
              user_display_name: profile?.display_name,
              user_email: profile?.email,
            };
          });

          setReviews(enrichedReviews);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [id]);

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Please login to submit a review");
      navigate("/auth");
      return;
    }

    if (!newReviewComment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    if (newReviewComment.trim().length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }

    try {
      setSubmittingReview(true);
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          product_id: id!,
          user_id: user.id,
          rating: newReviewRating,
          comment: newReviewComment.trim(),
        })
        .select("*")
        .single();

      if (error) throw error;

      // Fetch user profile for the new review
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", user.id)
        .single();

      const enrichedReview = {
        ...data,
        user_display_name: profile?.display_name,
        user_email: profile?.email,
      };

      setReviews([enrichedReview, ...reviews]);
      setNewReviewComment("");
      setNewReviewRating(5);
      toast.success("Review submitted successfully!");
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading product...</h1>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Button onClick={() => navigate("/")}>Back to Shop</Button>
        </div>
      </div>
    );
  }

  const openBulkModal = (productForBulk?: any) => {
    setBulkModalProduct(productForBulk || product);
    setBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    setBulkModalOpen(false);
    setBulkModalProduct(null);
  };

  const handleContactSales = () => {
    if (!bulkModalProduct) return;
    const payload = {
      productId: bulkModalProduct.id,
      requestedQuantity: quantity,
    };
    closeBulkModal();
    setCartOpen(false);
    navigate("/bulk", { state: payload });
  };

  const handleIncreaseQuantity = () => {
    if (quantity >= 9) {
      openBulkModal(product);
      return;
    }
    setQuantity((q) => Math.min(9, q + 1));
  };

  const handleDecreaseQuantity = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const handleAddToCart = () => {
    if (product.sizes?.length > 1 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (product.colors?.length > 1 && !selectedColor) {
      toast.error("Please select a color");
      return;
    }
    if (quantity > 9) {
      openBulkModal(product);
      return;
    }

    addToCart({
      id: product.id,
      name: product.title,
      price: product.price,
      image: product.images?.[0] || "",
      size: selectedSize || product.sizes?.[0] || "",
      color: selectedColor || product.colors?.[0] || "",
      quantity: quantity,
    });

    toast.success(`Added ${product.title} x${quantity} to cart!`);
    setCartOpen(true);
  };

  const handleWishlistToggle = () => {
    toggleWishlist({
      id: product.id,
      name: product.title,
      price: product.price,
      oldPrice: product.compare_at_price,
      image: product.images?.[0] || "",
      tag: product.tags?.[0] || "",
    });
    toast.success(isInWishlist(product.id) ? "Removed from wishlist" : "Added to wishlist");
  };

  const averageRating = () => {
    if (!reviews.length) return 0;
    return +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  };

  const renderStars = (rating: number) => {
    const full = "★".repeat(rating);
    const empty = "☆".repeat(5 - rating);
    return (
      <span className="text-yellow-500" aria-hidden>
        {full}
        {empty}
      </span>
    );
  };

  const renderInteractiveStars = (rating: number, onRate: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className="text-2xl hover:scale-110 transition-transform"
          >
            <span className={star <= rating ? "text-yellow-500" : "text-gray-300"}>★</span>
          </button>
        ))}
      </div>
    );
  };

  const getUserDisplayName = (review: Review) => {
    if (review.user_display_name) return review.user_display_name;
    if (review.user_email) return review.user_email.split("@")[0];
    return "Anonymous";
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold tracking-wider">
              TESORA
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="hover:text-accent transition-colors">
                Shop
              </Link>
              <Link to="/ai-generator" className="hover:text-accent transition-colors">
                AI Generation
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button className="hover:text-accent transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="hover:text-accent transition-colors">
                <User className="w-5 h-5" />
              </button>
              <button onClick={() => setCartOpen(true)} className="hover:text-accent transition-colors relative">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
              <Link to="/wishlist">
                <Button variant="ghost" size="icon">
                  <Heart className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Product Detail */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[3/4] rounded-xl overflow-hidden">
              <img
                src={product.images?.[selectedImage] || product.images?.[0] || ""}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-3 gap-4">
                {product.images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.title}</h1>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">
                  {product.currency || "INR"} {product.price}
                </span>
                {product.compare_at_price && (
                  <span className="text-xl text-muted-foreground line-through">{product.compare_at_price}</span>
                )}
              </div>

              <div className="mt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium pv-animate">
                  🔥 {viewers} people are viewing this product right now
                </div>
              </div>

              {product.tags && product.tags.length > 0 && (
                <span className="inline-block mt-3 px-3 py-1 text-sm font-semibold rounded-full bg-accent text-accent-foreground">
                  {product.tags[0]}
                </span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Reviews summary */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold">{averageRating()}</div>
                    <div className="text-sm text-muted-foreground">{renderStars(Math.round(averageRating()))}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{reviews.length} reviews</div>
                </div>
                <div>
                  <Button variant="ghost" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
                    Read all reviews
                  </Button>
                </div>
              </div>
            </div>

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Size</Label>
                <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                  <div className="flex gap-2">
                    {product.sizes.map((size: string) => (
                      <div key={size}>
                        <RadioGroupItem value={size} id={`size-${size}`} className="peer sr-only" />
                        <Label
                          htmlFor={`size-${size}`}
                          className="flex items-center justify-center px-4 py-2 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-all"
                        >
                          {size}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Select Color</Label>
                <RadioGroup value={selectedColor} onValueChange={setSelectedColor}>
                  <div className="flex gap-2">
                    {product.colors.map((color: string) => (
                      <div key={color}>
                        <RadioGroupItem value={color} id={`color-${color}`} className="peer sr-only" />
                        <Label
                          htmlFor={`color-${color}`}
                          className="flex items-center justify-center px-4 py-2 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-all"
                        >
                          {color}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Quantity</Label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handleDecreaseQuantity}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                <Button variant="outline" size="icon" onClick={handleIncreaseQuantity}>
                  <Plus className="w-4 h-4" />
                </Button>
                {quantity >= 9 && <span className="text-xs text-muted-foreground ml-2">Max 9 — for bulk orders contact sales</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button size="lg" variant="outline" onClick={handleWishlistToggle}>
                <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? "fill-current text-red-500" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-8">Customer Reviews</h2>

          {/* Add Review Form */}
          {user ? (
            <div className="mb-8 p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Your Rating</Label>
                  {renderInteractiveStars(newReviewRating, setNewReviewRating)}
                </div>
                <div>
                  <Label htmlFor="review-comment" className="mb-2 block">Your Review</Label>
                  <Textarea
                    id="review-comment"
                    placeholder="Share your thoughts about this product..."
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {newReviewComment.length}/1000 characters
                  </div>
                </div>
                <Button onClick={handleSubmitReview} disabled={submittingReview}>
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-8 p-6 border rounded-lg bg-card text-center">
              <p className="text-muted-foreground mb-4">Please login to write a review</p>
              <Button onClick={() => navigate("/auth")}>Login</Button>
            </div>
          )}

          {/* Reviews list */}
          {loadingReviews ? (
            <div className="text-center py-8">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No reviews yet. Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="font-semibold">{getUserDisplayName(r)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-2">
                        {renderStars(r.rating)}{" "}
                        <span className="text-sm text-muted-foreground ml-2">{r.rating}/5</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((related) => (
                <Link key={related.id} to={`/products/${related.id}`} className="group">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden mb-3">
                    <img
                      src={related.images?.[0] || ""}
                      alt={related.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h3 className="font-semibold">{related.title}</h3>
                  <p className="text-lg font-bold mt-1">
                    {related.currency || "INR"} {related.price}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Bulk Order Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">Bulk Order Inquiry</h3>
              <button onClick={closeBulkModal} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              For orders of 10+ items, please contact our sales team for special pricing and shipping options.
            </p>
            <div className="space-y-2 mb-6 text-sm">
              <p><strong>Email:</strong> sales@tesora.com</p>
              <p><strong>Phone:</strong> +91 98765 43210</p>
              <p><strong>WhatsApp:</strong> +91 98765 43210</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleContactSales} className="flex-1">
                Contact Sales
              </Button>
              <Button variant="outline" onClick={closeBulkModal} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
