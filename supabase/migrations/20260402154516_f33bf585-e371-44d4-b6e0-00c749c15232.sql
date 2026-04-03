DO $$
DECLARE
  v_job_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.image_jobs (id, user_id, content_hash, prompt, status, model_type, settings, finished_at)
  VALUES (
    v_job_id,
    '4e962775-cb55-4301-bc33-081eacb96c46',
    'edit-recovery-1775143978094',
    'image edit (recovered)',
    'completed',
    'gemini',
    '{"source": "edit", "recovered": true}'::jsonb,
    now()
  );

  INSERT INTO public.ugc_images (job_id, user_id, public_url, storage_path, prompt, meta)
  VALUES (
    v_job_id,
    '4e962775-cb55-4301-bc33-081eacb96c46',
    'https://dhqdamfisdbbcieqlpvt.supabase.co/storage/v1/object/public/ugc/4e962775-cb55-4301-bc33-081eacb96c46/edit-4e962775-cb55-4301-bc33-081eacb96c46-1775143978094.png',
    '4e962775-cb55-4301-bc33-081eacb96c46/edit-4e962775-cb55-4301-bc33-081eacb96c46-1775143978094.png',
    'image edit (recovered)',
    '{"source": "edit", "recovered": true}'::jsonb
  );
END $$;