-- Fix security definer view by setting security_invoker = true
ALTER VIEW public.ai_generations_with_email SET (security_invoker = true);