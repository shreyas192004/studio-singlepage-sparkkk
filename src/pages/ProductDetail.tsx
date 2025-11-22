import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Heart, ShoppingCart, Search, User, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CartSidebar } from "@/components/CartSidebar";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartCount } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [cartOpen, setCartOpen] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

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

        // Fetch related products from same category
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

  const handleAddToCart = () => {
    if (product.sizes?.length > 1 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (product.colors?.length > 1 && !selectedColor) {
      toast.error("Please select a color");
      return;
    }

    addToCart({
      id: product.id,
      name: product.title,
      price: product.price,
      image: product.images?.[0] || "",
      size: selectedSize || product.sizes?.[0] || "",
      color: selectedColor || product.colors?.[0] || "",
    });

    toast.success(`Added ${product.title} to cart!`);
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
              {/* <Link to="/men" className="hover:text-accent transition-colors">Men</Link>
              <Link to="/women" className="hover:text-accent transition-colors">Women</Link>
              <Link to="/accessories" className="hover:text-accent transition-colors">Accessories</Link>
              <Link to="/sale" className="hover:text-accent transition-colors">Sale</Link> */}
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
              {product.tags && product.tags.length > 0 && (
                <span className="inline-block mt-3 px-3 py-1 text-sm font-semibold rounded-full bg-accent text-accent-foreground">
                  {product.tags[0]}
                </span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed">{product.description}</p>

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
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="w-4 h-4" />
                </Button>
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

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="text-3xl font-bold mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((related) => (
                <Link key={related.id} to={`/product/${related.id}`} className="group cursor-pointer">
                  <div className="relative mb-3 overflow-hidden rounded-lg aspect-[3/4]">
                    <img
                      src={related.images?.[0] || ""}
                      alt={related.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{related.title}</h3>
                  <p className="font-bold">
                    {related.currency || "INR"} {related.price}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default ProductDetail;
