-- Create referrals table to track user invitations and referral sources
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  referred_by_username TEXT,
  referred_by_email TEXT,
  invitation_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC'::text, NOW()) NOT NULL,

  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
);

-- Create index on user_id for quick lookups
CREATE INDEX idx_referrals_user_id ON public.referrals (user_id);

-- Create index on created_at for time-based queries
CREATE INDEX idx_referrals_created_at ON public.referrals (created_at DESC);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can read their own referral data
CREATE POLICY "Users can view their own referral data"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS policy: users can insert their own referral data (for auth flow)
CREATE POLICY "Users can insert their own referral data during signup"
  ON public.referrals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
