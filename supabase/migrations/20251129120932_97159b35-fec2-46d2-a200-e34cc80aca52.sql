-- Create designer_payments table to track payments made to designers
CREATE TABLE public.designer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  designer_id UUID NOT NULL REFERENCES public.designers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.designer_payments ENABLE ROW LEVEL SECURITY;

-- Only admins can view payments
CREATE POLICY "Admins can view all payments" 
ON public.designer_payments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert payments
CREATE POLICY "Admins can insert payments" 
ON public.designer_payments 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update payments
CREATE POLICY "Admins can update payments" 
ON public.designer_payments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete payments
CREATE POLICY "Admins can delete payments" 
ON public.designer_payments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Designers can view their own payments
CREATE POLICY "Designers can view their own payments" 
ON public.designer_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM designers 
  WHERE designers.id = designer_payments.designer_id 
  AND designers.user_id = auth.uid()
));