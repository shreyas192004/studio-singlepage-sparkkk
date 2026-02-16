
-- Add missing columns to order_items (safe, won't affect existing data)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS designer_payout_status text DEFAULT 'unpaid';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS dispatch_date timestamp with time zone;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS delivery_order_id text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS designer_payment_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS designer_paid_at timestamp with time zone;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add missing columns to designer_payments
ALTER TABLE public.designer_payments ADD COLUMN IF NOT EXISTS payout_week_start timestamp with time zone;
ALTER TABLE public.designer_payments ADD COLUMN IF NOT EXISTS payout_week_end timestamp with time zone;

-- Create manufacturers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.manufacturers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manufacturers' AND policyname = 'Admins can manage manufacturers') THEN
    CREATE POLICY "Admins can manage manufacturers" ON public.manufacturers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Allow admins to update order_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admins can update order items') THEN
    CREATE POLICY "Admins can update order items" ON public.order_items FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
