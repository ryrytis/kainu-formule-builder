-- 1. Create the `profiles` table to store roles and linked clients
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Profiles RLS Policies: Users can read their own profile. Admins can read/update all.
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING ( auth.uid() = id );

CREATE POLICY "Admins can manage all profiles" 
    ON public.profiles FOR ALL 
    USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 4. Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'client'); -- Defaults to client. You can manually change to 'admin' in Supabase.
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Insert existing users as 'admin' by default (so you and Agniete don't get locked out)
INSERT INTO public.profiles (id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Note on existing tables RLS (orders, clients):
-- Assuming RLS is already active on these tables, you would add policies to restrict clients.
-- For example:
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Clients can view their own orders" ON public.orders FOR SELECT USING ( client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
-- CREATE POLICY "Clients can insert their own orders" ON public.orders FOR INSERT WITH CHECK ( client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
-- CREATE POLICY "Clients can update their own orders" ON public.orders FOR UPDATE USING ( client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
