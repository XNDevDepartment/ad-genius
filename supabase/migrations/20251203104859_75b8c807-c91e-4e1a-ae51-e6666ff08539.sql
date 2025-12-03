-- Create error_reports table
CREATE TABLE public.error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT NOT NULL,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert error reports (including anonymous users)
CREATE POLICY "Anyone can insert error reports"
ON public.error_reports
FOR INSERT
WITH CHECK (true);

-- Only admins can view error reports
CREATE POLICY "Admins can view all error reports"
ON public.error_reports
FOR SELECT
USING (public.is_admin());

-- Only admins can delete error reports
CREATE POLICY "Admins can delete error reports"
ON public.error_reports
FOR DELETE
USING (public.is_admin());

-- Create index for faster admin queries
CREATE INDEX idx_error_reports_created_at ON public.error_reports(created_at DESC);
CREATE INDEX idx_error_reports_user_id ON public.error_reports(user_id);