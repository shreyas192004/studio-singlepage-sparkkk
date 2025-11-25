-- Create storage policy to allow authenticated users to upload invoices
CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = 'invoices'
  AND auth.uid() IS NOT NULL
);

-- Create storage policy to allow users to read their own invoices
CREATE POLICY "Users can read invoices"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = 'invoices'
);