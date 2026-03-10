-- Allow designers to insert their own products
CREATE POLICY "Designers can insert their own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.designers
    WHERE designers.id = products.designer_id
    AND designers.user_id = auth.uid()
  )
);

-- Allow designers to update their own products
CREATE POLICY "Designers can update their own products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.designers
    WHERE designers.id = products.designer_id
    AND designers.user_id = auth.uid()
  )
);

-- Allow designers to view their own products
CREATE POLICY "Designers can view their own products"
ON public.products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.designers
    WHERE designers.id = products.designer_id
    AND designers.user_id = auth.uid()
  )
);