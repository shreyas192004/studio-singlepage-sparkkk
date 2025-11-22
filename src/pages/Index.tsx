import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, User, ShoppingCart, Facebook, Instagram, Twitter, Send, Heart, SlidersHorizontal, ArrowRight, LogOut } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const { cartCount } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, signOut } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

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
          .eq("visibility", "public");

        if (error) throw error;

        // Transform database products to match the expected format
        const transformedProducts = data?.map((product) => ({
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
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = ["Accessories", "Outerwear", "Bags"];
  const colors = ["Black", "White", "Brown", "Beige", "Green", "Orange"];

  // Apply filters
  let filteredProducts = allProducts.filter(product => {
    const priceMatch = product.price >= priceRange[0] && product.price <= priceRange[1];
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(product.category);
    const colorMatch = selectedColors.length === 0 || selectedColors.includes(product.color);
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
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      case "popular":
        return b.popularity - a.popularity;
      default:
        return 0;
    }
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleColorChange = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
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
    toast.success(
      isInWishlist(product.id) ? "Removed from wishlist" : "Added to wishlist"
    );
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
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold tracking-wider">TESORA</Link>
            <div className="hidden md:flex items-center gap-8">
              {/* <Link to="/men" className="hover:text-accent transition-colors">Men</Link>
              <Link to="/women" className="hover:text-accent transition-colors">Women</Link>
              <Link to="/accessories" className="hover:text-accent transition-colors">Accessories</Link> */}
              <Link to="/" className="hover:text-accent transition-colors">Shop</Link>
              <Link to="/ai-generator" className="hover:text-accent transition-colors">AI Generator</Link>
              {/* <Link to="/sale" className="hover:text-accent transition-colors">Sale</Link> */}
            </div>
            <div className="flex items-center gap-4">
              <button className="hover:text-accent transition-colors">
                <Search className="w-5 h-5" />
              </button>
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hover:text-accent transition-colors">
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
                <Link to="/auth" className="hover:text-accent transition-colors">
                  <User className="w-5 h-5" />
                </Link>
              )}
              
              <button
                onClick={() => setCartOpen(true)}
                className="hover:text-accent transition-colors relative"
              >
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

      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center py-24 lg:py-32"
        style={{ backgroundImage: "url('https://static.wixstatic.com/media/c837a6_d87ad81168b34e288c5309f175b8a3e0~mv2.jpg/v1/fill/w_1428,h_869,fp_0.65_0.67,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/c837a6_d87ad81168b34e288c5309f175b8a3e0~mv2.jpg')" }}
      >
        {/* Dark overlay for better contrast */}
        <div className="absolute inset-0 bg-black/30" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12 text-white">
            <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Powered by AI
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-primary-foreground mb-4">
              Design Your Perfect T-Shirt
            </h1>
            <p className="text-xl lg:text-2xl text-primary-foreground/80 mt-4">
              Generate your dream T-shirt with AI...
            </p>
            <p className="max-w-2xl mx-auto text-lg text-primary-foreground/60 mt-6">
              Transform your ideas into unique custom apparel using cutting-edge artificial intelligence. No design skills required.
            </p>
          </div>
          
          {/* Hero Generator Component */}
          <div className="max-w-3xl mx-auto mb-8">
            <HeroGenerator />
          </div>

          <div className="flex gap-4 justify-center">
            <Link to="/ai-generator">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 px-6 rounded-lg text-lg">
                Try AI Generator Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            {!user && (
              <Link to="/auth">
                <Button size="lg" variant="outline" className="bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-bold py-3 px-6 rounded-lg text-lg">
                  Create Account
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-primary/95 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-foreground">
                <RollingCounter end={2450} />+
              </div>
              <div className="text-primary-foreground/60 mt-1">Designs Created</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-foreground">
                <RollingCounter end={98} />%
              </div>
              <div className="text-primary-foreground/60 mt-1">Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-foreground">24/7</div>
              <div className="text-primary-foreground/60 mt-1">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* New In & Products Grid */}
      <section className="container mx-auto px-4 py-16">
        {/* Filter Toggle & Results Count */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">
            Products <span className="text-muted-foreground">({filteredProducts.length})</span>
          </h2>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
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
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 gap-6">
          {/* New In Card */}
          {/* <div className="relative h-[600px] rounded-xl overflow-hidden group cursor-pointer">
            <img 
              src="https://static.wixstatic.com/media/84770f_3e7bb479345c4cf2b70abdeb0d6af5ff~mv2.jpg/v1/fill/w_864,h_864,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/New-In_Man_b%20_edited.jpg"
              alt="New In"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end p-8">
              <h2 className="text-5xl font-bold text-primary-foreground mb-6">NEW IN</h2>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 w-fit px-8 py-6 text-lg rounded-lg">
                Shop Now
              </Button>
            </div>
          </div> */}

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group relative">
                <Link to={`/products/${product.id}`}>
                  <div className="relative mb-3 overflow-hidden rounded-lg aspect-[3/4]">
                    <img 
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {product.tag && (
                      <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full ${
                        product.tag === "Sale" ? "bg-accent text-accent-foreground" :
                        product.tag === "Best Seller" ? "bg-sale-orange text-white" :
                        "bg-sale-blue text-white"
                      }`}>
                        {product.tag}
                      </span>
                    )}
                  </div>
                </Link>
                
                <button
                  onClick={() => handleWishlistToggle(product)}
                  className="absolute top-2 right-2 p-2 bg-background rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isInWishlist(product.id) ? "fill-current text-red-500" : ""
                    }`}
                  />
                </button>

                <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="font-bold">Rs {product.price.toFixed(2)}</span>
                  {product.oldPrice && (
                    <span className="text-sm text-muted-foreground line-through">{product.oldPrice}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      {/* <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold mb-12 text-center">SHOP BY CATEGORY</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shopCategories.map((category) => (
            <div key={category.name} className="relative h-[500px] rounded-xl overflow-hidden group cursor-pointer">
              <img 
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-6">
                <h3 className="text-3xl font-bold text-primary-foreground mb-1">{category.name}</h3>
                <p className="text-primary-foreground/80">{category.items}</p>
              </div>
            </div>
          ))}
        </div>
      </section> */}

      {/* Sale Banner */}
      <section className="relative h-[500px] overflow-hidden">
        <img 
          src="https://placehold.co/1600x600/57534E/FFFFFF?text=Sale+Models"
          alt="Sale is On"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
          <div className="text-center text-primary-foreground">
            <h2 className="text-5xl md:text-7xl font-bold mb-4">SALE IS ON</h2>
            <p className="text-xl md:text-2xl mb-8">End of the season sale. Up to 40% off.</p>
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg rounded-lg">
              Shop Sale
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Designers */}
      <DesignersSection />

      {/* Instagram Section */}
      {/* <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold mb-2 text-center">FIND US ON INSTAGRAM</h2>
        <p className="text-center text-muted-foreground mb-12">
          <a href="#" className="hover:text-accent transition-colors">@TESORA_apparel</a>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {instagramImages.map((image, index) => (
            <a 
              key={index}
              href="#"
              className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
            >
              <img 
                src={image}
                alt={`Instagram ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-300" />
            </a>
          ))}
        </div>
      </section> */}

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground">
        {/* Social Bar */}
        <div className="bg-accent py-4">
          <div className="container mx-auto px-4 flex justify-center gap-6">
            <a href="#" className="text-accent-foreground hover:opacity-70 transition-opacity">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="text-accent-foreground hover:opacity-70 transition-opacity">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-accent-foreground hover:opacity-70 transition-opacity">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Info */}
            <div>
              <h3 className="text-2xl font-bold mb-4">TESORA</h3>
              <div className="space-y-2 text-sm text-primary-foreground/80">
                <p>FC ROAD, PUNE</p>
                <p>INDIA</p>
              </div>
            </div>

            {/* Shop Links */}
            <div>
              {/* <h4 className="font-bold mb-4">SHOP</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><a href="#" className="hover:text-accent transition-colors">Men</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Women</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Accessories</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">New In</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Sale</a></li>
              </ul> */}
            </div>

            {/* Help Links */}
            <div>
              <h4 className="font-bold mb-4">HELP</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><a href="#" className="hover:text-accent transition-colors">Shipping & Returns</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Size Guide</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Contact Us</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-bold mb-2">SUBSCRIBE</h4>
              <p className="text-sm text-primary-foreground/80 mb-4">Be the first to know</p>
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="Email"
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                />
                <Button size="icon" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
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
