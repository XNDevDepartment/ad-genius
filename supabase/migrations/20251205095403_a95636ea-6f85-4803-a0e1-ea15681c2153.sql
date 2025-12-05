-- Create domain_rules table for managing email domain restrictions
CREATE TABLE public.domain_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  rule_type text NOT NULL CHECK (rule_type IN ('allowed', 'blocked')),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.domain_rules ENABLE ROW LEVEL SECURITY;

-- Admins can manage domain rules
CREATE POLICY "Admins can manage domain rules"
ON public.domain_rules
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Edge function can read domain rules
CREATE POLICY "Service role can read domain rules"
ON public.domain_rules
FOR SELECT
USING (true);

-- Create index for fast lookups
CREATE INDEX idx_domain_rules_domain ON public.domain_rules(domain);
CREATE INDEX idx_domain_rules_type ON public.domain_rules(rule_type);

-- Seed allowed public email domains
INSERT INTO public.domain_rules (domain, rule_type, description) VALUES
-- Major providers
('gmail.com', 'allowed', 'Google Mail'),
('googlemail.com', 'allowed', 'Google Mail alternate'),
('hotmail.com', 'allowed', 'Microsoft Hotmail'),
('hotmail.co.uk', 'allowed', 'Microsoft Hotmail UK'),
('hotmail.fr', 'allowed', 'Microsoft Hotmail France'),
('hotmail.de', 'allowed', 'Microsoft Hotmail Germany'),
('hotmail.es', 'allowed', 'Microsoft Hotmail Spain'),
('hotmail.it', 'allowed', 'Microsoft Hotmail Italy'),
('outlook.com', 'allowed', 'Microsoft Outlook'),
('outlook.co.uk', 'allowed', 'Microsoft Outlook UK'),
('outlook.fr', 'allowed', 'Microsoft Outlook France'),
('outlook.de', 'allowed', 'Microsoft Outlook Germany'),
('outlook.es', 'allowed', 'Microsoft Outlook Spain'),
('outlook.pt', 'allowed', 'Microsoft Outlook Portugal'),
('live.com', 'allowed', 'Microsoft Live'),
('live.co.uk', 'allowed', 'Microsoft Live UK'),
('msn.com', 'allowed', 'MSN'),
('yahoo.com', 'allowed', 'Yahoo Mail'),
('yahoo.co.uk', 'allowed', 'Yahoo UK'),
('yahoo.fr', 'allowed', 'Yahoo France'),
('yahoo.de', 'allowed', 'Yahoo Germany'),
('yahoo.es', 'allowed', 'Yahoo Spain'),
('yahoo.com.br', 'allowed', 'Yahoo Brazil'),
('ymail.com', 'allowed', 'Yahoo Mail alternate'),
('icloud.com', 'allowed', 'Apple iCloud'),
('me.com', 'allowed', 'Apple Me'),
('mac.com', 'allowed', 'Apple Mac'),
('aol.com', 'allowed', 'AOL'),
('protonmail.com', 'allowed', 'ProtonMail'),
('proton.me', 'allowed', 'Proton'),
('pm.me', 'allowed', 'ProtonMail short'),
('zoho.com', 'allowed', 'Zoho Mail'),
('zohomail.com', 'allowed', 'Zoho Mail'),
('mail.com', 'allowed', 'Mail.com'),
('email.com', 'allowed', 'Email.com'),
('gmx.com', 'allowed', 'GMX'),
('gmx.de', 'allowed', 'GMX Germany'),
('gmx.net', 'allowed', 'GMX Network'),
('web.de', 'allowed', 'Web.de Germany'),
('t-online.de', 'allowed', 'T-Online Germany'),
('freenet.de', 'allowed', 'Freenet Germany'),
('orange.fr', 'allowed', 'Orange France'),
('laposte.net', 'allowed', 'La Poste France'),
('sfr.fr', 'allowed', 'SFR France'),
('free.fr', 'allowed', 'Free France'),
('wanadoo.fr', 'allowed', 'Wanadoo France'),
('terra.com.br', 'allowed', 'Terra Brazil'),
('uol.com.br', 'allowed', 'UOL Brazil'),
('bol.com.br', 'allowed', 'BOL Brazil'),
('ig.com.br', 'allowed', 'iG Brazil'),
('sapo.pt', 'allowed', 'SAPO Portugal'),
('clix.pt', 'allowed', 'Clix Portugal'),
-- Seed blocked disposable email domains (known abuse)
('idwager.com', 'blocked', 'Disposable email - abuse detected'),
('httpsu.com', 'blocked', 'Disposable email - abuse detected'),
('tempmail.com', 'blocked', 'Disposable email service'),
('temp-mail.org', 'blocked', 'Disposable email service'),
('guerrillamail.com', 'blocked', 'Disposable email service'),
('10minutemail.com', 'blocked', 'Disposable email service'),
('mailinator.com', 'blocked', 'Disposable email service'),
('throwaway.email', 'blocked', 'Disposable email service'),
('fakeinbox.com', 'blocked', 'Disposable email service'),
('sharklasers.com', 'blocked', 'Disposable email service'),
('trashmail.com', 'blocked', 'Disposable email service'),
('mohmal.com', 'blocked', 'Disposable email service'),
('dispostable.com', 'blocked', 'Disposable email service'),
('maildrop.cc', 'blocked', 'Disposable email service'),
('yopmail.com', 'blocked', 'Disposable email service'),
('getnada.com', 'blocked', 'Disposable email service'),
('tempail.com', 'blocked', 'Disposable email service'),
('emailondeck.com', 'blocked', 'Disposable email service');