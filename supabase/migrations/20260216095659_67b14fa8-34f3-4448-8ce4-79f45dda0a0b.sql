
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS cancellation_reason text;
