-- Update handle_new_user function with server-side validation for username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  clean_username TEXT;
BEGIN
  clean_username := new.raw_user_meta_data ->> 'username';
  
  -- Validate username if provided
  IF clean_username IS NOT NULL THEN
    -- Check length constraints
    IF length(clean_username) > 20 OR length(clean_username) < 2 THEN
      RAISE EXCEPTION 'Invalid username length';
    END IF;
    -- Check format (alphanumeric and underscores only)
    IF clean_username !~ '^[a-zA-Z0-9_]+$' THEN
      RAISE EXCEPTION 'Invalid username format';
    END IF;
  END IF;
  
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, clean_username);
  RETURN new;
END;
$$;

-- Add CHECK constraint on profiles.username for additional safety
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_format'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_username_format
    CHECK (
      username IS NULL OR (
        length(username) >= 2 AND 
        length(username) <= 20 AND 
        username ~ '^[a-zA-Z0-9_]+$'
      )
    );
  END IF;
END $$;