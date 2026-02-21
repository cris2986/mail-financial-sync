-- Harden RLS isolation by binding users/events to auth.uid()

-- 1) Ensure users.auth_user_id exists and is indexed
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

ALTER TABLE public.users
  ALTER COLUMN auth_user_id SET DEFAULT auth.uid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_user_id_fkey'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_user_id_fkey
      FOREIGN KEY (auth_user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id_unique
  ON public.users(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON public.users(auth_user_id);

-- Backfill legacy rows by email match (best effort).
UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND lower(u.email) = lower(au.email);

-- 2) Reset and enforce RLS policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'events')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
  END LOOP;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can delete own profile"
  ON public.users FOR DELETE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = events.user_id
        AND users.auth_user_id = auth.uid()
    )
  );
