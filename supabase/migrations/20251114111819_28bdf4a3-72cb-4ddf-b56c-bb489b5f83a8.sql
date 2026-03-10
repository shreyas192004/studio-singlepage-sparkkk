-- Fix product creation by updating category check constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check CHECK (category IN ('Men', 'Women', 'Accessories', 'Designer', 'Other'));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for AI generated designs
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-designs', 'ai-designs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for product-images bucket
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

-- RLS policies for ai-designs bucket
CREATE POLICY "Users can view their own designs"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-designs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Authenticated users can upload designs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ai-designs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for AI generations tracking
CREATE TABLE IF NOT EXISTS ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  prompt text NOT NULL,
  style text NOT NULL,
  color_scheme text NOT NULL,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_generations
CREATE POLICY "Users can view their own generations"
ON ai_generations FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert generations"
ON ai_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all generations"
ON ai_generations FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);