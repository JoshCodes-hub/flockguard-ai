
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('farmer', 'veterinarian', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  farm_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Auto-create profile + farmer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, farm_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'farm_name'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'farmer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FARMS ============
CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  location TEXT,
  bird_type TEXT,
  bird_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_farms_user ON public.farms(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO authenticated;
GRANT ALL ON public.farms TO service_role;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages farms" ON public.farms FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id);

-- ============ POULTRY HEALTH RECORDS ============
CREATE TABLE public.poultry_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  feed_intake TEXT CHECK (feed_intake IN ('High','Medium','Low')),
  water_consumption TEXT CHECK (water_consumption IN ('High','Medium','Low')),
  activity_level TEXT CHECK (activity_level IN ('Active','Moderate','Weak')),
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_records_farm ON public.poultry_records(farm_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poultry_records TO authenticated;
GRANT ALL ON public.poultry_records TO service_role;
ALTER TABLE public.poultry_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages records" ON public.poultry_records FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id);

-- ============ UPLOADED IMAGES ============
CREATE TABLE public.uploaded_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  prediction TEXT,
  confidence NUMERIC(5,2),
  detected_symptoms TEXT[] NOT NULL DEFAULT '{}',
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_images_farm ON public.uploaded_images(farm_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_images TO authenticated;
GRANT ALL ON public.uploaded_images TO service_role;
ALTER TABLE public.uploaded_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages images" ON public.uploaded_images FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id);

-- ============ PREDICTIONS ============
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_id UUID REFERENCES public.poultry_records(id) ON DELETE SET NULL,
  image_id UUID REFERENCES public.uploaded_images(id) ON DELETE SET NULL,
  prediction TEXT NOT NULL,
  confidence NUMERIC(5,2) NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low','Medium','High')),
  recommendation TEXT,
  prediction_source TEXT NOT NULL CHECK (prediction_source IN ('rule_engine','vision_ai')),
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_predictions_farm ON public.predictions(farm_id);
CREATE INDEX idx_predictions_created ON public.predictions(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views predictions" ON public.predictions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'veterinarian'));
CREATE POLICY "Owner creates predictions" ON public.predictions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or vet updates predictions" ON public.predictions FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'veterinarian') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner deletes predictions" ON public.predictions FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
