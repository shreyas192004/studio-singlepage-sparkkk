-- Drop the conflicting policy that requires folder structure
DROP POLICY IF EXISTS "Authenticated users can upload designs" ON storage.objects;