CREATE TABLE public.custom_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  audience text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX custom_audiences_user_audience_uidx
  ON public.custom_audiences (user_id, audience);

CREATE INDEX custom_audiences_user_used_at_idx
  ON public.custom_audiences (user_id, used_at DESC);

ALTER TABLE public.custom_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audiences"
ON public.custom_audiences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);