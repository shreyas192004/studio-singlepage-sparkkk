-- Change cart_items.product_id from integer to text (to support both legacy integer IDs and UUID strings)
ALTER TABLE public.cart_items 
ALTER COLUMN product_id TYPE text USING product_id::text;

-- Change wishlist_items.product_id from integer to text (to support both legacy integer IDs and UUID strings)
ALTER TABLE public.wishlist_items 
ALTER COLUMN product_id TYPE text USING product_id::text;