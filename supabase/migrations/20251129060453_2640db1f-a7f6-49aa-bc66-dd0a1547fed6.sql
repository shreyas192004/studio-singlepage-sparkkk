-- Create cart_items table
CREATE TABLE public.cart_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  selected_size TEXT,
  selected_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for cart_items
CREATE POLICY "Users can view their own cart items"
ON public.cart_items FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own cart items"
ON public.cart_items FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own cart items"
ON public.cart_items FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own cart items"
ON public.cart_items FOR DELETE
USING (auth.uid()::text = user_id);

-- Create wishlist_items table
CREATE TABLE public.wishlist_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wishlist_items
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for wishlist_items
CREATE POLICY "Users can view their own wishlist items"
ON public.wishlist_items FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own wishlist items"
ON public.wishlist_items FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own wishlist items"
ON public.wishlist_items FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own wishlist items"
ON public.wishlist_items FOR DELETE
USING (auth.uid()::text = user_id);

-- Add new columns to products table
ALTER TABLE public.products
ADD COLUMN is_ai_generated BOOLEAN DEFAULT false,
ADD COLUMN ai_generation_id INTEGER,
ADD COLUMN clothing_type TEXT,
ADD COLUMN image_position TEXT;