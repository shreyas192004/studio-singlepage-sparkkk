// src/contexts/WishlistContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync with localStorage when not logged in
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.error('Wishlist storage quota exceeded. Clearing old data.');
          localStorage.removeItem('wishlist');
          const limitedWishlist = wishlist.slice(0, 50);
          try {
            localStorage.setItem('wishlist', JSON.stringify(limitedWishlist));
            setWishlist(limitedWishlist);
          } catch (retryError) {
            console.error('Failed to save wishlist even after clearing:', retryError);
          }
        }
      }
    }
  }, [wishlist, user]);

  // Fetch wishlist from DB when user logs in
  useEffect(() => {
    if (user) {
      fetchWishlistFromDB();
    } else {
      // Load from localStorage when logged out
      const saved = localStorage.getItem('wishlist');
      if (saved) {
        setWishlist(JSON.parse(saved));
      }
    }
  }, [user]);

  const fetchWishlistFromDB = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching wishlist:', error);
        return;
      }

      if (data && data.length > 0) {
        // Fetch product details for each wishlist item
        const productIds = data.map(item => item.product_id);
        const { data: products } = await supabase
          .from('products')
          .select('id, title, price, compare_at_price, images, tags')
          .in('id', productIds);

        const wishlistItems: WishlistItem[] = data.map(item => {
          const product = products?.find(p => p.id === item.product_id);
          return {
            id: item.product_id,
            name: product?.title || 'Unknown Product',
            price: product?.price || 0,
            oldPrice: product?.compare_at_price ? `Rs ${product.compare_at_price}` : undefined,
            image: product?.images?.[0] || '',
            tag: product?.tags?.[0] || null,
          };
        });

        setWishlist(wishlistItems);
      } else {
        // If DB is empty but localStorage has items, sync to DB
        const saved = localStorage.getItem('wishlist');
        if (saved) {
          const localWishlist = JSON.parse(saved);
          if (localWishlist.length > 0) {
            // Sync local wishlist to DB
            for (const item of localWishlist) {
              await supabase.from('wishlist_items').insert({
                user_id: user.id,
                product_id: item.id,
                metadata: { name: item.name, price: item.price, image: item.image },
              });
            }
            setWishlist(localWishlist);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching wishlist from DB:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToWishlist = async (item: WishlistItem) => {
    if (wishlist.some(i => i.id === item.id)) return;
    if (wishlist.length >= 100) {
      console.warn('Wishlist limit reached (100 items)');
      return;
    }

    setWishlist(prev => [...prev, item]);

    // Sync to DB if logged in
    if (user) {
      try {
        await supabase.from('wishlist_items').insert({
          user_id: user.id,
          product_id: item.id,
          metadata: { name: item.name, price: item.price, image: item.image },
        });
      } catch (error) {
        console.error('Error adding to wishlist in DB:', error);
      }
    }
  };

  const removeFromWishlist = async (id: string) => {
    setWishlist(prev => prev.filter(item => item.id !== id));

    // Sync to DB if logged in
    if (user) {
      try {
        await supabase
          .from('wishlist_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', id);
      } catch (error) {
        console.error('Error removing from wishlist in DB:', error);
      }
    }
  };

  const isInWishlist = (id: string) => {
    return wishlist.some(item => item.id === id);
  };

  const toggleWishlist = (item: WishlistItem) => {
    if (isInWishlist(item.id)) {
      removeFromWishlist(item.id);
    } else {
      addToWishlist(item);
    }
  };

  return (
    <WishlistContext.Provider value={{
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
      isLoading,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
