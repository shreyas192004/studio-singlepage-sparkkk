import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  User,
  ShoppingCart,
  Facebook,
  Instagram,
  Twitter,
  Send,
  Heart,
  SlidersHorizontal,
  ArrowRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { CartSidebar } from "@/components/CartSidebar";
import { ProductFilters } from "@/components/ProductFilters";
import { DesignersSection } from "@/components/DesignersSection";
import HeroGenerator from "@/components/HeroGenerator";
import RollingCounter from "@/components/RollingCounter";
import DesignerOnboardForm from "@/components/DesignerOnboardForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Logo from "../../public/logo.png";

const Index: React.FC = () => {
  const { cartCount } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, signOut } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // toggles mobile filters panel
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
  };

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("featured");

  // Fetch products from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("visibility", "public")
          .eq("is_ai_generated", false);

        if (error) {
          console.error("Error fetching products:", error);
          toast.error("Failed to load products. Please refresh the page.");
          return;
        }

        // Transform database products to match the expected format
        const transformedProducts =
          data?.map((product: any) => ({
            id: product.id,
            name: product.title,
            price: Number(product.price),
            oldPrice: product.compare_at_price ? Number(product.compare_at_price) : undefined,
            image: product.images?.[0] || "https://placehold.co/600x800?text=Product",
            category: product.category,
            color: product.colors?.[0] || "Unknown",
            tag: product.compare_at_price ? "Sale" : undefined,
            dateAdded: product.created_at,
            popularity: product.popularity || 0,
          })) || [];

        setAllProducts(transformedProducts);
      } catch (error: any) {
        console.error("Error fetching products:", error);
        toast.error(`Failed to load products: ${error.message || "Network error"}`);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = ["Accessories", "Outerwear", "Bags"];
  const colors = ["Black", "White", "Brown", "Beige", "Green", "Orange"];

  // Apply filters
  let filteredProducts = allProducts.filter((product) => {
    const priceMatch = product.price >= priceRange[0] && product.price <= priceRange[1];
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(product.category);
    const colorMatch = selectedColors.length === 0 || selectedColors.includes(product.color);
    const searchMatch = searchQuery.trim() === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return priceMatch && categoryMatch && colorMatch && searchMatch;
  });

  // Apply sorting
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "newest":
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      case "popular":
        return b.popularity - a.popularity;
      default:
        return 0;
    }
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const handleColorChange = (color: string) => {
    setSelectedColors((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]));
  };

  const handleWishlistToggle = (product: any) => {
    toggleWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      image: product.image,
      tag: product.tag,
    });
    toast.success(isInWishlist(product.id) ? "Removed from wishlist" : "Added to wishlist");
  };

  const shopCategories = [
    { name: "MEN", items: "12 items", image: "https://placehold.co/600x800/6B7A5E/FFFFFF?text=Men's+Collection" },
    { name: "WOMEN", items: "18 items", image: "https://placehold.co/600x800/D4A574/FFFFFF?text=Women's+Collection" },
    { name: "ACCESSORIES", items: "24 items", image: "https://placehold.co/600x800/9B8B7E/FFFFFF?text=Accessories" },
  ];

  const instagramImages = [
    "https://placehold.co/400x400/6B7A5E/FFFFFF?text=Instagram+1",
    "https://placehold.co/400x400/D4A574/FFFFFF?text=Instagram+2",
    "https://placehold.co/400x400/8B7355/FFFFFF?text=Instagram+3",
    "https://placehold.co/400x400/9B8B7E/FFFFFF?text=Instagram+4",
  ];

  return (
    <div className="min-h-screen bg-background text-primary-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-primary/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-2 rounded-md hover:bg-primary-foreground/6"
                aria-label="Toggle menu"
                onClick={() => setMobileNavOpen((s) => !s)}
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link to="/" className="text-lg md:text-xl font-bold tracking-wider">
                <img
                  className="w-24 h-10 object-contain cursor-pointer"
                  src={Logo}
                  alt="Tesora Logo"
                />
              </Link>
            </div>

            {/* desktop links */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="hover:text-accent transition-colors">
                Shop
              </Link>
              <Link to="/ai-generator" className="hover:text-accent transition-colors">
                AI Generator
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 lg:w-64 bg-primary-foreground/10 border-primary-foreground/20"
                />
              </div>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-md hover:bg-primary-foreground/6">
                      <User className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-background border border-border">
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/ai-generator" className="cursor-pointer">
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        AI Generator
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth" className="p-2 rounded-md hover:bg-primary-foreground/6">
                  <User className="w-5 h-5" />
                </Link>
              )}

              <button
                onClick={() => setCartOpen(true)}
                className="p-2 rounded-md hover:bg-primary-foreground/6 relative"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>

              <Link to="/wishlist" className="ml-1">
                <Button variant="ghost" size="icon">
                  <Heart className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile nav panel */}
          {mobileNavOpen && (
            <div className="mt-3 md:hidden">
              <div className="flex flex-col gap-2">
                <Link to="/" onClick={() => setMobileNavOpen(false)} className="py-2 px-3 rounded-md hover:bg-primary-foreground/6">
                  Shop
                </Link>
                <Link to="/ai-generator" onClick={() => setMobileNavOpen(false)} className="py-2 px-3 rounded-md hover:bg-primary-foreground/6">
                  AI Generator
                </Link>
                <Link to="/auth" onClick={() => setMobileNavOpen(false)} className="py-2 px-3 rounded-md hover:bg-primary-foreground/6">
                  Sign In / Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center py-16 md:py-24"
        style={{
          backgroundImage:
            "url('https://static.wixstatic.com/media/c837a6_d87ad81168b34e288c5309f175b8a3e0~mv2.jpg/v1/fill/w_1428,h_869,fp_0.65_0.67,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/c837a6_d87ad81168b34e288c5309f175b8a3e0~mv2.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Powered by AI
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3">
            Design Your Perfect T-Shirt
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Generate your dream T-shirt with AI. Transform your ideas into unique custom apparel using cutting-edge artificial intelligence.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/ai-generator">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 px-6 rounded-lg text-lg flex items-center justify-center">
                Try AI Generator Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            {!user && (
              <Link to="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-bold py-3 px-6 rounded-lg text-lg">
                  Create Account
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 max-w-3xl mx-auto">
            <HeroGenerator />
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-primary/95 py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary-foreground">
                <RollingCounter end={2450} />+
              </div>
              <div className="text-primary-foreground/60 mt-1 text-sm">Designs Created</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary-foreground">
                <RollingCounter end={98} />%
              </div>
              <div className="text-primary-foreground/60 mt-1 text-sm">Satisfaction</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary-foreground">24/7</div>
              <div className="text-primary-foreground/60 mt-1 text-sm">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* New In & Products Grid */}
      <section className="container mx-auto px-4 py-10">
        {/* Filter Toggle & Results Count */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Products <span className="text-muted-foreground">({filteredProducts.length})</span></h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowFilters((s) => !s)} className="md:hidden">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <div className="hidden md:flex items-center gap-2">
              <label className="text-sm">Sort:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm">
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
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? "block" : "hidden"} md:block md:col-span-1`}>{/* keep ProductFilters as-is; it's responsive-aware */}
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

          <div className="lg:col-span-3">
            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {isLoadingProducts ? (
                <div className="col-span-full text-center py-8">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-8">No products found.</div>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} className="group relative bg-card rounded-lg overflow-hidden">
                    <Link to={`/products/${product.id}`}>
                      <div className="relative mb-2 overflow-hidden aspect-[3/4]">
                        <img src={product.image} alt={product.name} className="w-full h-full text-gray-950  object-cover transition-transform duration-500 group-hover:scale-105" />
                        {product.tag && (
                          <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full ${
                            product.tag === "Sale" ? "bg-accent text-accent-foreground" : "bg-sale-blue text-white"
                          }`}>
                            {product.tag}
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="p-3 bg-transparent">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate text-slate-950">{product.name}</h3>
                        <button onClick={() => handleWishlistToggle(product)} className="p-2 rounded-md hover:bg-primary-foreground/6">
                          <Heart className={`w-5 h-5 text-slate-950 ${isInWishlist(product.id) ?  "fill-current text-red-500" : ""}`} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold text-slate-950">Rs {product.price.toFixed(2)}</span>
                        {product.oldPrice && <span className="text-sm text-muted-foreground line-through">Rs {product.oldPrice}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination / load more placeholder */}
            <div className="mt-8 flex justify-center">
              <Button variant="outline">Load more</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Sale Banner */}
      <section className="relative h-[300px] sm:h-[400px] overflow-hidden">
        <img src="https://placehold.co/1600x600/57534E/FFFFFF?text=Sale+Models" alt="Sale is On" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
          <div className="text-center text-primary-foreground px-4">
            <h2 className="text-3xl sm:text-4xl md:text-6xl  font-bold mb-2">SALE IS ON</h2>
            <p className="text-sm sm:text-lg md:text-xl mb-4">End of the season sale. Up to 40% off.</p>
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-3 rounded-lg">
              Shop Sale
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Designers */}
      <DesignersSection />

      {/* Designer Onboard Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Join Our Designer Community</h2>
          <p className="text-muted-foreground">Are you a designer? Showcase your creations to thousands of customers.</p>
        </div>
        <div className="flex justify-center">
          <DesignerOnboardForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground mt-12">
        <div className="bg-accent py-4">
          <div className="container mx-auto px-4 flex justify-center gap-6">
            <a href="#" className="text-accent-foreground hover:opacity-70 transition-opacity"><Facebook className="w-5 h-5" /></a>
            <a href="#" className="text-accent-foreground hover:opacity-70 transition-opacity"><Instagram className="w-5 h-5" /></a>
            <a href="#" className="text-accent-foreground hover:opacity-70 transition-opacity"><Twitter className="w-5 h-5" /></a>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">TESORA</h3>
              <div className="space-y-2 text-sm text-primary-foreground/80">
                <p>FC ROAD, PUNE</p>
                <p>INDIA</p>
              </div>
            </div>

            <div className="hidden md:block">
              <h4 className="font-bold mb-4">SHOP</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><a href="#" className="hover:text-accent transition-colors">Men</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Women</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Accessories</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">New In</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">HELP</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><a href="/terms-and-conditions" className="hover:text-accent transition-colors">Terms & Conditions</a></li>
                <li><a href="/shipping-and-refund-policy" className="hover:text-accent transition-colors">Shipping & Returns</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Size Guide</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Contact Us</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-2">SUBSCRIBE</h4>
              <p className="text-sm text-primary-foreground/80 mb-4">Be the first to know</p>
              <form className="flex flex-col sm:flex-row gap-2">
                <Input type="email" placeholder="Email" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 w-full" />
                <Button size="icon" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/60">
            <div className="flex gap-4">
              <a href="#" className="hover:text-accent transition-colors">TikTok</a>
              <a href="#" className="hover:text-accent transition-colors">Pinterest</a>
            </div>
            <p> © 2035 by TESORA. Created with <a href="www.bisugentech.in">BISUGENTECH.IN</a></p>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default Index;
