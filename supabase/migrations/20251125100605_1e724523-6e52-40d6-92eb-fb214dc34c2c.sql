-- Add designer role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'designer';

-- Add user_id column to designers table
ALTER TABLE public.designers
ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_designers_user_id ON public.designers(user_id);

-- Update RLS policies for designers table
-- Drop existing policies first to recreate them
DROP POLICY IF EXISTS "Designers can view their own profile" ON public.designers;
DROP POLICY IF EXISTS "Designers can update their own profile" ON public.designers;

-- Allow designers to view their own profile
CREATE POLICY "Designers can view their own profile"
ON public.designers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow designers to update their own profile
CREATE POLICY "Designers can update their own profile"
ON public.designers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create a trigger to automatically assign designer role when a designer is created
CREATE OR REPLACE FUNCTION public.handle_new_designer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert designer role for the user
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'designer'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new designers
DROP TRIGGER IF EXISTS on_designer_created ON public.designers;
CREATE TRIGGER on_designer_created
  AFTER INSERT ON public.designers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_designer();