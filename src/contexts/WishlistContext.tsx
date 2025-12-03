// src/contexts/WishlistContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  oldPrice?: string;
  image: string;
  tag?: string | null;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  toggleWishlist: (item: WishlistItem) => void;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initial load from localStorage when logged out
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) {
      try {
        const saved = localStorage.getItem("wishlist");
        if (saved) {
          setWishlist(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Failed to load wishlist from localStorage:", error);
      }
    }
  }, [user]);

  // Sync with localStorage when not logged in
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) {
      try {
        localStorage.setItem("wishlist", JSON.stringify(wishlist));
      } catch (error) {
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          console.error("Wishlist storage quota exceeded. Clearing old data.");
          try {
            localStorage.removeItem("wishlist");
            const limitedWishlist = wishlist.slice(0, 50);
            localStorage.setItem("wishlist", JSON.stringify(limitedWishlist));
            setWishlist(limitedWishlist);
          } catch (retryError) {
            console.error("Failed to save wishlist even after clearing:", retryError);
          }
        } else {
          console.error("Failed to save wishlist to localStorage:", error);
        }
      }
    }
  }, [wishlist, user]);

  // Fetch wishlist from DB when user logs in
  useEffect(() => {
    if (user) {
      fetchWishlistFromDB();
    }
  }, [user]);

  const fetchWishlistFromDB = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching wishlist:", error);
        toast.error("Failed to load your wishlist from server.");
        return;
      }

      if (data && data.length > 0) {
        const productIds = data.map((item) => item.product_id);
        const { data: products, error: productsError } = await supabase
          .from("products")
          .select("id, title, price, compare_at_price, images, tags")
          .in("id", productIds);

        if (productsError) {
          console.error("Error fetching wishlist products:", productsError);
          toast.error("Failed to load product details for your wishlist.");
          return;
        }

        const wishlistItems: WishlistItem[] = data.map((item) => {
          const product = products?.find((p) => p.id === item.product_id);
          return {
            id: item.product_id,
            name: product?.title || "Unknown Product",
            price: product?.price || 0,
            oldPrice: product?.compare_at_price ? `Rs ${product.compare_at_price}` : undefined,
            image: product?.images?.[0] || "",
            tag: product?.tags?.[0] || null,
          };
        });

        setWishlist(wishlistItems);
      } else {
        // DB empty, maybe sync from localStorage
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem("wishlist");
        if (saved) {
          const localWishlist: WishlistItem[] = JSON.parse(saved);
          if (localWishlist.length > 0) {
            try {
              for (const item of localWishlist) {
                const { error: insertError } = await supabase.from("wishlist_items").insert({
                  user_id: user.id,
                  product_id: item.id,
                  metadata: { name: item.name, price: item.price, image: item.image },
                });
                if (insertError) throw insertError;
              }
              setWishlist(localWishlist);
            } catch (err) {
              console.error("Error syncing local wishlist to DB:", err);
              toast.error("Failed to sync your local wishlist to your account.");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching wishlist from DB:", error);
      toast.error("Something went wrong while loading your wishlist.");
    } finally {
      setIsLoading(false);
    }
  };

  const addToWishlist = async (item: WishlistItem) => {
    if (wishlist.some((i) => i.id === item.id)) return;
    if (wishlist.length >= 100) {
      console.warn("Wishlist limit reached (100 items)");
      toast.error("Wishlist limit reached (100 items).");
      return;
    }

    const previous = wishlist;
    const next = [...wishlist, item];
    setWishlist(next);

    if (user) {
      try {
        const { error } = await supabase.from("wishlist_items").insert({
          user_id: user.id,
          product_id: item.id,
          metadata: { name: item.name, price: item.price, image: item.image },
        });
        if (error) throw error;
      } catch (error) {
        console.error("Error adding to wishlist in DB:", error);
        toast.error("Failed to sync wishlist with server. Reverting.");
        setWishlist(previous);
      }
    }
  };

  const removeFromWishlist = async (id: string) => {
    const previous = wishlist;
    const next = wishlist.filter((item) => item.id !== id);
    setWishlist(next);

    if (user) {
      try {
        const { error } = await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", id);

        if (error) throw error;
      } catch (error) {
        console.error("Error removing from wishlist in DB:", error);
        toast.error("Failed to remove item from server wishlist. Reverting.");
        setWishlist(previous);
      }
    }
  };

  const isInWishlist = (id: string) => {
    return wishlist.some((item) => item.id === id);
  };

  const toggleWishlist = (item: WishlistItem) => {
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist(item);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        isLoading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
};
