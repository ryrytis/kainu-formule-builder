-- 1. Make password optional in public.users
-- This is necessary because we are syncing from auth.users which doesn't expose passwords
-- and we shouldn't store them in public.users anyway.
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

-- 2. Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    new.id, 
    new.email, 
    new.created_at, 
    coalesce(new.updated_at, new.created_at)
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill existing users
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
  id, 
  email, 
  created_at, 
  coalesce(updated_at, created_at) as updated_at
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

-- 5. Ensure RLS allows reading users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.users;
CREATE POLICY "Authenticated users can read all profiles" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);
