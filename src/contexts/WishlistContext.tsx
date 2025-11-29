// src/contexts/WishlistContext.tsx (updated)
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WishlistItem {
  id: string; // changed to string to accept DB/uuid ids
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
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
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
  }, [wishlist]);

  const addToWishlist = (item: WishlistItem) => {
    setWishlist(prev => {
      if (prev.some(i => i.id === item.id)) return prev;
      if (prev.length >= 100) {
        console.warn('Wishlist limit reached (100 items)');
        return prev;
      }
      return [...prev, item];
    });
  };

  const removeFromWishlist = (id: string) => {
    setWishlist(prev => prev.filter(item => item.id !== id));
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
