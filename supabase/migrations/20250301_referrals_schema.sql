-- Referral program schema additions
CREATE TABLE public.referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'signed_up', 'qualified', 'rewarded', 'cancelled')),
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signed_up_at TIMESTAMP WITH TIME ZONE,
  qualified_at TIMESTAMP WITH TIME ZONE,
  rewarded_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('referrer', 'referee')),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'earned', 'paid', 'cancelled')),
  issued_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (referral_id, user_id, reward_type)
);

CREATE INDEX idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_rewards_user_id ON public.rewards(user_id);
CREATE INDEX idx_rewards_status ON public.rewards(status);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referral codes" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage their referral codes" ON public.referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their referral codes" ON public.referral_codes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Referrers view their referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Referrers create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Referrers update referrals" ON public.referrals
  FOR UPDATE USING (auth.uid() = referrer_id);

CREATE POLICY "Users view their rewards" ON public.rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage their rewards" ON public.rewards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_referral_reward_status()
RETURNS TRIGGER AS $$
DECLARE
  target_referrer_status TEXT;
  target_referee_status TEXT;
BEGIN
  target_referrer_status := CASE NEW.status
    WHEN 'invited' THEN 'pending'
    WHEN 'signed_up' THEN 'earned'
    WHEN 'qualified' THEN 'earned'
    WHEN 'rewarded' THEN 'paid'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END;

  target_referee_status := CASE NEW.status
    WHEN 'invited' THEN 'pending'
    WHEN 'signed_up' THEN 'pending'
    WHEN 'qualified' THEN 'earned'
    WHEN 'rewarded' THEN 'paid'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rewards (referral_id, user_id, reward_type, amount, currency, status, issued_at)
    VALUES
      (NEW.id, NEW.referrer_id, 'referrer', 50, 'USD', target_referrer_status,
        CASE WHEN target_referrer_status IN ('earned', 'paid') THEN NOW() ELSE NULL END)
    ON CONFLICT (referral_id, user_id, reward_type) DO UPDATE
      SET status = EXCLUDED.status,
          issued_at = COALESCE(public.rewards.issued_at, EXCLUDED.issued_at),
          paid_at = CASE WHEN EXCLUDED.status = 'paid' THEN NOW() ELSE public.rewards.paid_at END,
          updated_at = NOW();

    IF NEW.referred_user_id IS NOT NULL THEN
      INSERT INTO public.rewards (referral_id, user_id, reward_type, amount, currency, status, issued_at)
      VALUES
        (NEW.id, NEW.referred_user_id, 'referee', 25, 'USD', target_referee_status,
          CASE WHEN target_referee_status IN ('earned', 'paid') THEN NOW() ELSE NULL END)
      ON CONFLICT (referral_id, user_id, reward_type) DO UPDATE
        SET status = EXCLUDED.status,
            issued_at = COALESCE(public.rewards.issued_at, EXCLUDED.issued_at),
            paid_at = CASE WHEN EXCLUDED.status = 'paid' THEN NOW() ELSE public.rewards.paid_at END,
            updated_at = NOW();
    END IF;
  ELSE
    UPDATE public.rewards
    SET status = target_referrer_status,
        issued_at = CASE
          WHEN target_referrer_status IN ('earned', 'paid') AND issued_at IS NULL THEN NOW()
          ELSE issued_at
        END,
        paid_at = CASE WHEN target_referrer_status = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
        updated_at = NOW()
    WHERE referral_id = NEW.id AND reward_type = 'referrer';

    UPDATE public.rewards
    SET status = target_referee_status,
        issued_at = CASE
          WHEN target_referee_status IN ('earned', 'paid') AND issued_at IS NULL THEN NOW()
          ELSE issued_at
        END,
        paid_at = CASE WHEN target_referee_status = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
        updated_at = NOW()
    WHERE referral_id = NEW.id AND reward_type = 'referee';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_referral_rewards_on_insert
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_referral_reward_status();

CREATE TRIGGER sync_referral_rewards_on_update
  AFTER UPDATE OF status ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_referral_reward_status();

CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
