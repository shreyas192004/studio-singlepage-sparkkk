-- Add new columns to ai_generations table
ALTER TABLE public.ai_generations
ADD COLUMN clothing_type text,
ADD COLUMN image_position text,
ADD COLUMN included_text text;