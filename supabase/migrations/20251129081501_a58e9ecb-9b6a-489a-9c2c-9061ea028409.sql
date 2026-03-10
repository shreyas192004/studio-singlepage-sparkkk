-- Allow authenticated users to insert AI-generated products
CREATE POLICY "Authenticated users can insert AI-generated products"
ON public.products
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND is_ai_generated = true
);

-- Allow users to view their own AI-generated products
CREATE POLICY "Users can view their own AI-generated products"
ON public.products
FOR SELECT
USING (
  created_by = auth.uid()::text
  AND is_ai_generated = true
);