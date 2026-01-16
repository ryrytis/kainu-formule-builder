-- 1. Check if user exists and see their role
SELECT id, email, role, created_at 
FROM public.users 
WHERE email = 'rytis@keturiprint.lt';

-- 2. If the user exists but is not an admin, run this to promote them:
-- UPDATE public.users 
-- SET role = 'admin' 
-- WHERE email = 'rytis@keturiprint.lt';

-- 3. To see ALL admins:
-- SELECT * FROM public.users WHERE role = 'admin';
