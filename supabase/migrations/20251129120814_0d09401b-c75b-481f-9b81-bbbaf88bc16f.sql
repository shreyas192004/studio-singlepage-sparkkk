-- Change products.ai_generation_id from integer to text (to support UUID strings from ai_generations table)
ALTER TABLE public.products 
ALTER COLUMN ai_generation_id TYPE text USING ai_generation_id::text;