
CREATE TABLE public.custom_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custom_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scenarios"
  ON public.custom_scenarios FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_custom_scenarios_user ON public.custom_scenarios(user_id, used_at DESC);
