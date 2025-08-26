
-- 1) Clean up old/legacy tables if present
drop table if exists public.image_jobs cascade;
drop table if exists public.generation_jobs cascade;
drop table if exists public.generated_images_jobs cascade;

-- 2) Create the new image_jobs table
create table public.image_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  prompt text not null,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  output_url text,
  error text,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_jobs_status_check check (status in ('queued','in_progress','succeeded','failed'))
);

-- 3) Enable RLS
alter table public.image_jobs enable row level security;

-- 4) RLS policies
create policy "Users can insert their own image jobs"
  on public.image_jobs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own image jobs"
  on public.image_jobs
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own image jobs"
  on public.image_jobs
  for update
  using (auth.uid() = user_id);

-- 5) Updated-at trigger
create trigger image_jobs_set_updated_at
before update on public.image_jobs
for each row
execute function public.update_updated_at_column();

-- 6) Indexes
create index image_jobs_user_created_idx on public.image_jobs (user_id, created_at desc);
create index image_jobs_status_idx on public.image_jobs (status);

-- 7) Idempotency: unique successful result per (user_id, content_hash)
create unique index image_jobs_unique_succeeded_hash
  on public.image_jobs (user_id, content_hash)
  where status = 'succeeded';
