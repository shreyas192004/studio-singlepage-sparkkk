-- Create a security definer function to check order ownership
CREATE OR REPLACE FUNCTION public.user_owns_order(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = _order_id
      AND user_id = _user_id
  );
$$;

-- Drop existing order_items insert policy
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON public.order_items;

-- Create new simplified policy using the security definer function
CREATE POLICY "Users can insert order items for their orders"
ON public.order_items
FOR INSERT
WITH CHECK (public.user_owns_order(order_id, auth.uid()));