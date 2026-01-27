-- Update handle_new_user function to properly handle Google OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role user_role;
  _display_name TEXT;
BEGIN
  -- Get role from metadata, default to 'child'
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'child');
  
  -- Get display name: try metadata first, then Google's full_name, then name, then email prefix
  _display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Create profile (using ON CONFLICT to handle existing profiles)
  INSERT INTO public.profiles (user_id, display_name, grade_level)
  VALUES (
    NEW.id,
    _display_name,
    CASE WHEN _role = 'child' THEN (NEW.raw_user_meta_data->>'grade_level')::INTEGER ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = now();
  
  -- Create role (using ON CONFLICT to handle existing roles)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;