import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Search, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useState } from "react";
import { CartSidebar } from "@/components/CartSidebar";



const Wishlist = () => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart, cartCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
    });
    toast.success(`Added ${item.name} to cart!`);
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
              <Link to="/" className="hover:text-accent transition-colors">Shop</Link>
              <Link to="/ai-generator" className="hover:text-accent transition-colors">Ai Generator</Link>
              {/* <Link to="/" className="hover:text-accent transition-colors">Accessories</Link>
              <Link to="/" className="hover:text-accent transition-colors">Sale</Link> */}
            </div>
            <div className="flex items-center gap-4">
              <button className="hover:text-accent transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <Link to="/account" className="hover:text-accent transition-colors">
                <User className="w-5 h-5" />
              </Link>
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
              <Link to="/wishlist">
                <Button variant="ghost" size="icon">
                  <Heart className="w-5 h-5 fill-current" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Wishlist Content */}
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">My Wishlist ({wishlist.length})</h1>

        {wishlist.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-24 h-24 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-3">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">Start adding items you love!</p>
            <Link to="/">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Continue Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {wishlist.map((item) => (
              <div key={item.id} className="group relative">
                <Link to={`/products/${item.id}`}>
                  <div className="relative mb-3 overflow-hidden rounded-lg aspect-[3/4]">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {item.tag && (
                      <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full ${
                        item.tag === "Sale" ? "bg-accent text-accent-foreground" :
                        item.tag === "Best Seller" ? "bg-sale-orange text-white" :
                        "bg-sale-blue text-white"
                      }`}>
                        {item.tag}
                      </span>
                    )}
                  </div>
                </Link>
                
                <button
                  onClick={() => {
                    removeFromWishlist(item.id);
                    toast.success("Removed from wishlist");
                  }}
                  className="absolute top-2 left-2 p-2 bg-background rounded-full shadow-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold">Rs {item.price.toFixed(2)}</span>
                  {item.oldPrice && (
                    <span className="text-sm text-muted-foreground line-through">{item.oldPrice}</span>
                  )}
                </div>
                
                <Button
                  size="sm"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => handleAddToCart(item)}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default Wishlist;
