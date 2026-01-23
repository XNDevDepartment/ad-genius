-- Change the default value for onboarding_step to 0 for new users
ALTER TABLE profiles 
ALTER COLUMN onboarding_step SET DEFAULT 0;

-- Update the handle_new_user trigger to explicitly set onboarding_step = 0
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, profession, account_id, onboarding_step, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'profession', ''),
    COALESCE(NEW.raw_user_meta_data->>'account_id', 'ACC' || extract(epoch from now())::bigint),
    0,     -- Start at step 0 (welcome screen)
    false  -- Not completed
  );
  RETURN NEW;
END;
$function$;