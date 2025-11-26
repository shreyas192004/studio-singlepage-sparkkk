-- Create invoices storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Anyone can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload invoices" ON storage.objects;

-- Create RLS policies for invoices bucket
CREATE POLICY "Anyone can view invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');

-- Add invoice_url column to orders table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'invoice_url'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN invoice_url TEXT;
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_invoice_url ON public.orders(invoice_url) WHERE invoice_url IS NOT NULL;