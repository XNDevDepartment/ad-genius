-- Security Fix: Change default for account_activated and block disposable domains

-- Fix 1: Change the default value for account_activated to false
-- New accounts should NOT be activated by default
ALTER TABLE public.profiles 
ALTER COLUMN account_activated SET DEFAULT false;

-- Fix 2: Block the 6 disposable email domains identified in abuse analysis
INSERT INTO public.domain_rules (domain, rule_type, description) VALUES
('tmpbox.net', 'blocked', 'Disposable email - abuse detected 2026-02-06'),
('tmpeml.com', 'blocked', 'Disposable email - abuse detected 2026-02-06'),
('teml.net', 'blocked', 'Disposable email - abuse detected 2026-02-06'),
('tweting.com', 'blocked', 'Disposable email - abuse detected 2026-02-06'),
('uorak.com', 'blocked', 'Disposable email - abuse detected 2026-02-06'),
('icubik.com', 'blocked', 'Disposable email - abuse detected 2026-02-06')
ON CONFLICT (domain) DO UPDATE SET
  rule_type = EXCLUDED.rule_type,
  description = EXCLUDED.description;