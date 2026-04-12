-- 1. Add signup_company_name and email to profiles
ALTER TABLE public.profiles ADD COLUMN signup_company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN email TEXT;

-- 2. Modify constraint on role to include 'pending'
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'client', 'pending'));

-- 3. Change default value of role column to 'pending'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'pending';

-- 4. Update the trigger function to safely extract company name from metadata and default to pending
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, signup_company_name, email)
  VALUES (
    new.id, 
    'pending', 
    new.raw_user_meta_data->>'company_name',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
