-- Create app role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create designers table
CREATE TABLE public.designers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    social_links JSONB DEFAULT '{}',
    featured BOOLEAN DEFAULT FALSE,
    women_only BOOLEAN DEFAULT FALSE,
    men_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.designers ENABLE ROW LEVEL SECURITY;

-- Create products table with full schema
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    compare_at_price NUMERIC(10,2),
    currency TEXT DEFAULT 'INR',
    images TEXT[] DEFAULT '{}',
    images_generated_by_users INTEGER DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('Men', 'Women', 'Accessories', 'Designer', 'Other')),
    sub_category TEXT,
    tags TEXT[] DEFAULT '{}',
    colors TEXT[] DEFAULT '{}',
    sizes TEXT[] DEFAULT '{}',
    material TEXT,
    brand TEXT,
    designer_id UUID REFERENCES public.designers(id) ON DELETE SET NULL,
    inventory JSONB DEFAULT '{"total": 0, "bySize": {}}',
    weight NUMERIC(10,2),
    dimensions TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
    structured_card_data JSONB DEFAULT '{}',
    filter_requirements JSONB DEFAULT '{}',
    popularity INTEGER DEFAULT 0,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create analytics_events table
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    designer_id UUID REFERENCES public.designers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    page TEXT,
    path TEXT,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_product ON public.analytics_events(product_id);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for designers (public read, admin write)
CREATE POLICY "Anyone can view designers"
ON public.designers FOR SELECT
USING (true);

CREATE POLICY "Admins can insert designers"
ON public.designers FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update designers"
ON public.designers FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete designers"
ON public.designers FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products (public read visible products, admin full access)
CREATE POLICY "Anyone can view public products"
ON public.products FOR SELECT
USING (visibility = 'public');

CREATE POLICY "Admins can view all products"
ON public.products FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for analytics_events (anyone can insert, admin can read)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view analytics events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on designers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_designers_updated_at
BEFORE UPDATE ON public.designers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();