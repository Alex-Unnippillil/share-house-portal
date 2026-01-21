-- Referral invitations and rewards schema
CREATE TABLE public.referral_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT,
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.referral_reward_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID REFERENCES public.referral_invitations(id) ON DELETE SET NULL,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'earned', 'paid', 'reversed')),
  description TEXT,
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_referral_invitations_inviter_id ON public.referral_invitations(inviter_id);
CREATE INDEX idx_referral_invitations_invitee_email ON public.referral_invitations(invitee_email);
CREATE INDEX idx_referral_invitations_token ON public.referral_invitations(invite_token);
CREATE INDEX idx_referral_invitations_status ON public.referral_invitations(status);

CREATE INDEX idx_referral_reward_ledger_inviter_id ON public.referral_reward_ledger(inviter_id);
CREATE INDEX idx_referral_reward_ledger_invitee_id ON public.referral_reward_ledger(invitee_id);
CREATE INDEX idx_referral_reward_ledger_status ON public.referral_reward_ledger(status);
CREATE INDEX idx_referral_reward_ledger_posted_at ON public.referral_reward_ledger(posted_at DESC);

ALTER TABLE public.referral_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_reward_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referral invitations" ON public.referral_invitations
  FOR SELECT
  USING (
    inviter_id = auth.uid() OR accepted_by = auth.uid()
  );

CREATE POLICY "Users can create referral invitations" ON public.referral_invitations
  FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
  );

CREATE POLICY "Inviters can update their referral invitations" ON public.referral_invitations
  FOR UPDATE
  USING (inviter_id = auth.uid());

CREATE POLICY "Users can view their referral rewards" ON public.referral_reward_ledger
  FOR SELECT
  USING (
    inviter_id = auth.uid() OR invitee_id = auth.uid()
  );

CREATE TRIGGER update_referral_invitations_updated_at
  BEFORE UPDATE ON public.referral_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_reward_ledger_updated_at
  BEFORE UPDATE ON public.referral_reward_ledger
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
