-- Recreate the view to refresh PostgREST schema cache
DROP VIEW IF EXISTS public.ai_generations_with_email;

CREATE OR REPLACE VIEW public.ai_generations_with_email AS
SELECT
  ag.id,
  ag.prompt,
  ag.style,
  ag.color_scheme,
  ag.image_url,
  ag.session_id,
  ag.created_at,
  ag.user_id,
  ag.clothing_type,
  ag.image_position,
  ag.included_text,
  p.email
FROM public.ai_generations ag
LEFT JOIN public.profiles p ON ag.user_id = p.user_id;