-- Create affiliates table
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  website_url TEXT NOT NULL,
  promotion_description TEXT NOT NULL,
  audience_size TEXT NOT NULL,
  iban TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  referral_code TEXT NOT NULL UNIQUE,
  referral_link TEXT NOT NULL,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  tax_responsibility_accepted BOOLEAN NOT NULL DEFAULT false,
  access_token TEXT NOT NULL UNIQUE,
  notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create affiliate_referrals table
CREATE TABLE public.affiliate_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  referral_code_used TEXT NOT NULL,
  signup_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  conversion_date TIMESTAMP WITH TIME ZONE,
  current_plan TEXT,
  status TEXT NOT NULL DEFAULT 'signup' CHECK (status IN ('signup', 'converted', 'churned')),
  attribution_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create affiliate_commissions table
CREATE TABLE public.affiliate_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  month DATE NOT NULL,
  plan_value NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payable', 'paid', 'cancelled')),
  eligible_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payout_batch_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_affiliates_status ON public.affiliates(status);
CREATE INDEX idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX idx_affiliates_access_token ON public.affiliates(access_token);
CREATE INDEX idx_affiliate_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX idx_affiliate_referrals_user_id ON public.affiliate_referrals(user_id);
CREATE INDEX idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX idx_affiliate_commissions_month ON public.affiliate_commissions(month);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliates
CREATE POLICY "Public can apply to affiliate program" 
  ON public.affiliates FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Affiliates can view own record via token" 
  ON public.affiliates FOR SELECT 
  USING (true);

CREATE POLICY "Admins full access to affiliates" 
  ON public.affiliates FOR ALL 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Service role full access affiliates" 
  ON public.affiliates FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- RLS policies for affiliate_referrals
CREATE POLICY "Admins can manage referrals" 
  ON public.affiliate_referrals FOR ALL 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Service role full access referrals" 
  ON public.affiliate_referrals FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- RLS policies for affiliate_commissions
CREATE POLICY "Admins can manage commissions" 
  ON public.affiliate_commissions FOR ALL 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Service role full access commissions" 
  ON public.affiliate_commissions FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create updated_at trigger for affiliates
CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();