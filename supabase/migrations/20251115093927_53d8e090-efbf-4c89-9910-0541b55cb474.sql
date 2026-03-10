-- Add foreign key to link ai_generations to profiles
-- This allows Supabase client to properly join the tables
ALTER TABLE public.ai_generations
DROP CONSTRAINT IF EXISTS ai_generations_user_id_fkey;

ALTER TABLE public.ai_generations
ADD CONSTRAINT ai_generations_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;