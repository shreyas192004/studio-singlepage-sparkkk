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
  ShoppingBasket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { CartSidebar } from "@/components/CartSidebar";
import { DesignersSection } from "@/components/DesignersSection";
import HeroGenerator from "@/components/HeroGenerator";
import DesignerOnboardForm from "@/components/DesignerOnboardForm";
import { toast } from "sonner";


// import { ProductFilters } from "@/components/ProductFilters";
import RollingCounter from "@/components/RollingCounter";
// import { supabase } from "@/integrations/supabase/client";

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
  const [showFilters, setShowFilters] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // const [allProducts, setAllProducts] = useState<any[]>([]);
  // const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
  };

  // Filter states
  // const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  // const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // const [selectedColors, setSelectedColors] = useState<string[]>([]);
  // const [sortBy, setSortBy] = useState("featured");

  // Fetch products from database
  // useEffect(() => {
  //   const fetchProducts = async () => {
  //     try {
  //       const { data, error } = await supabase
  //         .from("products")
  //         .select(
  //           `
  //           *,
  //           designers (
  //             id,
  //             name
  //           )
  //         `
  //         )
  //         .eq("visibility", "public")
  //         .eq("is_ai_generated", false);

  //       if (error) {
  //         console.error("Error fetching products:", error);
  //         toast.error("Failed to load products. Please refresh the page.");
  //         return;
  //       }

  //       // Transform database products to match the expected format
  //       const transformedProducts =
  //         data?.map((product: any) => ({
  //           id: product.id,
  //           name: product.title,
  //           price: Number(product.price),
  //           oldPrice: product.compare_at_price
  //             ? Number(product.compare_at_price)
  //             : undefined,
  //           image:
  //             product.images?.[0] ||
  //             "https://placehold.co/600x800?text=Product",
  //           category: product.category,
  //           color: product.colors?.[0] || "Unknown",
  //           tag: product.compare_at_price ? "Sale" : undefined,
  //           dateAdded: product.created_at,
  //           popularity: product.popularity || 0,
  //           // Designer name from related table
  //           designerName:
  //             product.designers?.name ||
  //             product.designer_name || // fallback if you also store it on products
  //             undefined,
  //         })) || [];

  //       setAllProducts(transformedProducts);
  //     } catch (error: any) {
  //       console.error("Error fetching products:", error);
  //       toast.error(
  //         `Failed to load products: ${error.message || "Network error"}`
  //       );
  //     } finally {
  //       setIsLoadingProducts(false);
  //     }
  //   };

  //   fetchProducts();
  // }, []);

  const categories = ["Accessories", "Outerwear", "Bags"];
  const colors = ["Black", "White", "Brown", "Beige", "Green", "Orange"];

  // Apply filters
  // let filteredProducts = allProducts.filter((product) => {
  //   const priceMatch =
  //     product.price >= priceRange[0] && product.price <= priceRange[1];
  //   const categoryMatch =
  //     selectedCategories.length === 0 ||
  //     selectedCategories.includes(product.category);
  //   const colorMatch =
  //     selectedColors.length === 0 ||
  //     selectedColors.includes(product.color);
  //   const searchMatch =
  //     searchQuery.trim() === "" ||
  //     product.name.toLowerCase().includes(searchQuery.toLowerCase());
  //   return priceMatch && categoryMatch && colorMatch && searchMatch;
  // });

  // Apply sorting
  // filteredProducts = [...filteredProducts].sort((a, b) => {
  //   switch (sortBy) {
  //     case "price-low":
  //       return a.price - b.price;
  //     case "price-high":
  //       return b.price - a.price;
  //     case "newest":
  //       return (
  //         new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  //       );
  //     case "popular":
  //       return b.popularity - a.popularity;
  //     default:
  //       return 0;
  //   }
  // });

  // const handleCategoryChange = (category: string) => {
  //   setSelectedCategories((prev) =>
  //     prev.includes(category)
  //       ? prev.filter((c) => c !== category)
  //       : [...prev, category]
  //   );
  // };

  // const handleColorChange = (color: string) => {
  //   setSelectedColors((prev) =>
  //     prev.includes(color)
  //       ? prev.filter((c) => c !== color)
  //       : [...prev, color]
  //   );
  // };

  // const handleWishlistToggle = (product: any) => {
  //   toggleWishlist({
  //     id: product.id,
  //     name: product.name,
  //     price: product.price,
  //     oldPrice: product.oldPrice,
  //     image: product.image,
  //     tag: product.tag,
  //   });
  //   toast.success(
  //     isInWishlist(product.id)
  //       ? "Removed from wishlist"
  //       : "Added to wishlist"
  //   );
  // };

  const shopCategories = [
    {
      name: "MEN",
      items: "12 items",
      image:
        "https://placehold.co/600x800/6B7A5E/FFFFFF?text=Men's+Collection",
    },
    {
      name: "WOMEN",
      items: "18 items",
      image:
        "https://placehold.co/600x800/D4A574/FFFFFF?text=Women's+Collection",
    },
    {
      name: "ACCESSORIES",
      items: "24 items",
      image:
        "https://placehold.co/600x800/9B8B7E/FFFFFF?text=Accessories",
    },
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
                {mobileNavOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              <Link
                to="/"
                className="text-lg md:text-xl font-bold tracking-wider"
              >
                <img
                  className="w-24 h-10 object-contain cursor-pointer"
                  src={Logo}
                  alt="Tesora Logo"
                />
              </Link>
            </div>

            {/* desktop links */}
            <div className="hidden md:flex items-center gap-8">


              <Link
                to="/ai-generator"
                className="hover:text-accent transition-colors"
              >
                AI Generator
              </Link>
            </div>


            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">


                <Link
                  to="/products"
                  className="p-2 rounded-md hover:bg-primary-foreground/6"
                  aria-label="Shop"
                >
                  <ShoppingBasket className="w-5 h-5" />
                </Link>
              </div>
              {/* ✅ MOBILE Products / Shop */}
              <div className="flex md:hidden items-center">
                <Link
                  to="/products"
                  className="p-2 rounded-md hover:bg-primary-foreground/6"
                  aria-label="Shop"
                >
                  <ShoppingBasket className="w-5 h-5" />
                </Link>
              </div>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded-md hover:bg-primary-foreground/6">
                      <User className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-background border border-border"
                  >
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/ai-generator"
                        className="cursor-pointer"
                      >
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        AI Generator
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/auth"
                  className="p-2 rounded-md hover:bg-primary-foreground/6"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}

              <button
                onClick={() => setCartOpen(true)}
                className="hidden md:flex py-2 px-3 rounded-md hover:bg-primary-foreground/6 items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>


              {/* ✅ Mobile Wishlist */}
              <Link to="/wishlist" className="p-2">
                <Heart className="w-5 h-5" />
              </Link>

            </div>
          </div>

          {/* Mobile nav panel */}
          {mobileNavOpen && (
            <div className="mt-3 md:hidden">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setCartOpen(true);
                    setMobileNavOpen(false);
                  }}
                  className="py-2 px-3 rounded-md hover:bg-primary-foreground/6 flex items-center gap-2 text-left w-full"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Cart
                </button>


                <Link
                  to="/ai-generator"
                  onClick={() => setMobileNavOpen(false)}
                  className="py-2 px-3 rounded-md hover:bg-primary-foreground/6"
                >
                  AI Generator
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setMobileNavOpen(false)}
                  className="py-2 px-3 rounded-md hover:bg-primary-foreground/6"
                >
                  Sign In / Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center min-h-screen flex items-center"
        style={{
          backgroundImage: "url('/infinite_variable_display_ultra.png')",
        }}
      >
        <div className="absolute inset-0 bg-black/30" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl
leading-tight md:leading-normal
font-extrabold text-white mb-3">
            Custom Printed Apparel, Reimagined
          </h1>

          <p className="text-xs sm:text-sm md:text-lg text-white/80 max-w-2xl mx-auto">
            Designed by you. Created by Tesora.
          </p>

          <div className="mt-8 md:mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/ai-generator">
<div className="flex justify-center sm:justify-start">
  <Button
    size="lg"
    className="
      bg-accent-gold
      text-white
      font-bold
      py-3 px-6
      rounded-lg
      text-lg
      flex items-center justify-center
      shadow-[0_0_20px_hsl(43_55%_62%/0.25)]
      transition-all duration-300
      hover:brightness-110
    "
  >
    Start Designing for Free
    <ArrowRight className="ml-2 w-5 h-5" />
  </Button>
</div>



            </Link>
          </div>
          <div className="mt-8 max-w-3xl mx-auto">
            <HeroGenerator />
          </div>
        </div>
      </section>

      {/* Social Proof Bar (NORMAL SECTION, NOT OVER IMAGE) */}
      <section className="relative grain-overlay bg-gradient-to-r from-accent/80 via-accent/60 to-accent/80 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-white">

            <div>
              <div className="text-xl sm:text-2xl md:text-3xl leading-tight font-bold">
                <RollingCounter end={2450} />
              </div>
              <div className="text-white/70 mt-1 text-sm">
                Every Design Starts With an Idea.
              </div>
            </div>

            <div>
              <div className="text-xl sm:text-2xl md:text-3xl
leading-tight font-bold flex items-baseline justify-center gap-1">
                <span>
                  <RollingCounter end={98} />
                </span>
                <span>%</span>
              </div>
              <div className="text-white/70 mt-1 text-sm">
                Users Loved Their Designs
              </div>
            </div>

            <div>
              <div className="text-xl sm:text-2xl md:text-3xl
leading-tight font-bold">
                Made To Order
              </div>
              <div className="text-white/70 mt-1 text-sm">
                Start with an idea and refine it as much as you want
              </div>
            </div>

          </div>
        </div>


      </section>

      {/* Sale Banner */}
      <section className="relative h-[300px] sm:h-[400px] overflow-hidden">
        <img
          src="/sale.jpg"
          alt="Exclusive"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
          <div className="text-center text-primary-foreground px-4">
            <h2 className="text-3xl sm:text-4xl md:text-6xl  font-bold mb-2">
              Exclusive offers just for you! Members Get More.
            </h2>
            <p className="text-sm sm:text-lg md:text-xl mb-4">
              Follow us on Instagram for early access and exclusive offers.
            </p>
            <a
              href="https://www.instagram.com/tesoralifestyle/"
              target="_blank"
              rel="noopener noreferrer"
            >
             <Button
  size="lg"
  className="
    bg-accent-gold
    text-white
    font-bold
    px-6 py-3
    rounded-lg
    shadow-[0_0_20px_hsl(43_55%_62%/0.25)]
    transition-all duration-300
    hover:brightness-110
  "
>
  Get the Code
</Button>

            </a>

          </div>
        </div>
      </section>

      {/* Featured Designers */}
      <DesignersSection />

      {/* Designer Onboard Section */}
      <section className="container mx-auto px-4 py-16 md:py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2 text-muted-foreground">
            Join Our Designer Community
          </h2>
          <p className="text-muted-foreground">
            Are you a designer? Showcase your creations to thousands of
            customers.
          </p>
        </div>
        <div className="flex justify-center">
          <DesignerOnboardForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground mt-12">
        <div className="bg-accent/50 py-4">
          <div className="container mx-auto px-4 flex justify-center gap-6">
            {/* <a
              href="#"
              className="text-accent-foreground hover:opacity-70 transition-opacity"
            >
              <Facebook className="w-5 h-5" />
            </a> */}
            <a
              href="https://www.instagram.com/tesoralifestyle/"
              className="text-accent-foreground hover:opacity-70 transition-opacity"
            >
              <Instagram className="w-5 h-5" />
            </a>
            {/* <a
              href="#"
              className="text-accent-foreground hover:opacity-70 transition-opacity"
            >
              <Twitter className="w-5 h-5" />
            </a> */}
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img
                className="w-24 h-10 object-contain cursor-pointer"
                src={Logo}
                alt="Tesora Logo"
              />
              <div className="space-y-2 text-sm text-primary-foreground/80">
                <p>FC ROAD, PUNE</p>
                <p>INDIA</p>
              </div>
            </div>

            <div className="hidden md:block">
              <h4 className="font-bold mb-4">SHOP</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li>
                  <a
                    href="#"
                    className="hover:text-accent transition-colors"
                  >
                    Men
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-accent transition-colors"
                  >
                    Women
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-accent transition-colors"
                  >
                    Accessories
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-accent transition-colors"
                  >
                    New In
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">HELP</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li>
                  <a
                    href="/terms-and-conditions"
                    className="hover:text-accent transition-colors"
                  >
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a
                    href="/shippingPolicy"
                    className="hover:text-accent transition-colors"
                  >
                    Shipping Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy-policy"
                    className="hover:text-accent transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/cancellation-and-refund-policy"
                    className="hover:text-accent transition-colors"
                  >
                    Cancellation & Refund Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/contact-us"
                    className="hover:text-accent transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-2">SUBSCRIBE</h4>
              <p className="text-sm text-primary-foreground/80 mb-4">
                Be the first to know
              </p>
              <form className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Email"
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 w-full"
                />
                <Button
                  size="icon"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/60">
            <p>
              © 2035 by TESORA. Created with{" "}
              <a href="www.bisugentech.in">BISUGENTECH.IN</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default Index;
