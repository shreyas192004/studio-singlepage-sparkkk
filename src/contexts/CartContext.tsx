// src/contexts/CartContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size?: string;
  color?: string;
  clothing_type?: string;
  is_ai_generated?: boolean;
}

interface AddToCartPayload {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity?: number;
  size?: string;
  color?: string;
  clothing_type?: string;
  is_ai_generated?: boolean;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: AddToCartPayload) => void;
  removeFromCart: (id: string, size?: string, color?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync with localStorage when not logged in
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('cart', JSON.stringify(cart));
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
      }
    }
  }, [cart, user]);

  // Fetch cart from DB when user logs in
  useEffect(() => {
    if (user) {
      fetchCartFromDB();
    } else {
      const saved = localStorage.getItem('cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    }
  }, [user]);

  const fetchCartFromDB = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching cart:', error);
        return;
      }

      if (data && data.length > 0) {
        const productIds = data.map(item => item.product_id);
        const { data: products } = await supabase
          .from('products')
          .select('id, title, price, images, clothing_type, is_ai_generated')
          .in('id', productIds);

        const cartItems: CartItem[] = data.map(item => {
          const product = products?.find(p => p.id === item.product_id);
          return {
            id: item.product_id,
            name: product?.title || 'Unknown Product',
            price: product?.price || 0,
            image: product?.images?.[0] || '',
            quantity: item.quantity,
            size: item.selected_size || undefined,
            color: item.selected_color || undefined,
            clothing_type: product?.clothing_type || undefined,
            is_ai_generated: product?.is_ai_generated || false,
          };
        });

        setCart(cartItems);
      } else {
        const saved = localStorage.getItem('cart');
        if (saved) {
          const localCart = JSON.parse(saved);
          if (localCart.length > 0) {
            for (const item of localCart) {
              await supabase.from('cart_items').insert({
                user_id: user.id,
                product_id: item.id,
                quantity: item.quantity,
                selected_size: item.size || null,
                selected_color: item.color || null,
              });
            }
            setCart(localCart);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cart from DB:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (item: AddToCartPayload) => {
    const qtyToAdd = item.quantity && item.quantity > 0 ? Math.floor(item.quantity) : 1;

    const existingIndex = cart.findIndex(
      i => i.id === item.id && i.size === item.size && i.color === item.color
    );

    let newCart: CartItem[];
    if (existingIndex >= 0) {
      newCart = cart.map((i, idx) =>
        idx === existingIndex ? { ...i, quantity: i.quantity + qtyToAdd } : i
      );
    } else {
      if (cart.length >= 100) {
        console.warn('Cart limit reached');
        return;
      }
      newCart = [...cart, { 
        id: item.id, 
        name: item.name, 
        price: item.price, 
        image: item.image, 
        size: item.size, 
        color: item.color, 
        quantity: qtyToAdd,
        clothing_type: item.clothing_type,
        is_ai_generated: item.is_ai_generated,
      }];
    }

    setCart(newCart);

    if (user) {
      try {
        if (existingIndex >= 0) {
          const existingItem = cart[existingIndex];
          await supabase
            .from('cart_items')
            .update({ quantity: existingItem.quantity + qtyToAdd })
            .eq('user_id', user.id)
            .eq('product_id', item.id)
            .eq('selected_size', item.size || null)
            .eq('selected_color', item.color || null);
        } else {
          await supabase.from('cart_items').insert({
            user_id: user.id,
            product_id: item.id,
            quantity: qtyToAdd,
            selected_size: item.size || null,
            selected_color: item.color || null,
          });
        }
      } catch (error) {
        console.error('Error syncing cart to DB:', error);
      }
    }
  };

  const removeFromCart = async (id: string, size?: string, color?: string) => {
    const newCart = cart.filter(
      item => !(item.id === id && item.size === size && item.color === color)
    );
    setCart(newCart);

    if (user) {
      try {
        let query = supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', id);

        if (size) query = query.eq('selected_size', size);
        else query = query.is('selected_size', null);
        
        if (color) query = query.eq('selected_color', color);
        else query = query.is('selected_color', null);

        await query;
      } catch (error) {
        console.error('Error removing cart item from DB:', error);
      }
    }
  };

  const updateQuantity = async (id: string, quantity: number, size?: string, color?: string) => {
    if (quantity <= 0) {
      removeFromCart(id, size, color);
      return;
    }

    const newCart = cart.map(item =>
      item.id === id && item.size === size && item.color === color
        ? { ...item, quantity }
        : item
    );
    setCart(newCart);

    if (user) {
      try {
        let query = supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', user.id)
          .eq('product_id', id);

        if (size) query = query.eq('selected_size', size);
        else query = query.is('selected_size', null);
        
        if (color) query = query.eq('selected_color', color);
        else query = query.is('selected_color', null);

        await query;
      } catch (error) {
        console.error('Error updating cart quantity in DB:', error);
      }
    }
  };

  const clearCart = async () => {
    setCart([]);

    if (user) {
      try {
        await supabase.from('cart_items').delete().eq('user_id', user.id);
      } catch (error) {
        console.error('Error clearing cart from DB:', error);
      }
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
      isLoading,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
