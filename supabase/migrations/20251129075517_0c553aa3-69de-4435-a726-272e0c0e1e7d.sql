-- Create storage policies for ai-designs bucket to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload AI designs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ai-designs');

CREATE POLICY "Anyone can view AI designs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ai-designs');

CREATE POLICY "Users can update their own AI designs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ai-designs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own AI designs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ai-designs' AND auth.uid()::text = (storage.foldername(name))[1]);