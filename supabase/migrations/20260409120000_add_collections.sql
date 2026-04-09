-- ── collections ────────────────────────────────────────────────────────────
CREATE TABLE public.collections (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  color           TEXT        NOT NULL DEFAULT '#6366f1',
  emoji           TEXT        NOT NULL DEFAULT '📁',
  cover_image_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collections"
  ON public.collections FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_collections_user ON public.collections(user_id, created_at DESC);

-- ── collection_items ───────────────────────────────────────────────────────
CREATE TABLE public.collection_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id  UUID        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  content_id     UUID        NOT NULL,
  content_type   TEXT        NOT NULL,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, content_id)
);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collection items"
  ON public.collection_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
        AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_collection_items_collection ON public.collection_items(collection_id, added_at DESC);
CREATE INDEX idx_collection_items_content    ON public.collection_items(content_id);

-- Auto-update updated_at on collections
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_collections_updated_at();
