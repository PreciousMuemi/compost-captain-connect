-- Fix the handle_new_user function to properly reference the user_role enum
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, phone_number, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'farmer'::public.user_role)
    );
    RETURN NEW;
END;
$function$;