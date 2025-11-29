-- Drop existing category check constraint
ALTER TABLE public.products DROP CONSTRAINT products_category_check;

-- Add updated constraint with "AI Generated" category
ALTER TABLE public.products ADD CONSTRAINT products_category_check 
CHECK (category = ANY (ARRAY['Men'::text, 'Women'::text, 'Accessories'::text, 'Designer'::text, 'Other'::text, 'AI Generated'::text]));