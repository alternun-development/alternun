-- Track welcome email delivery status per user
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Index for querying users who haven't received the welcome email
CREATE INDEX IF NOT EXISTS idx_users_welcome_email_not_sent
ON public.users(id)
WHERE welcome_email_sent = false;

-- Function to mark welcome email as sent
CREATE OR REPLACE FUNCTION public.mark_welcome_email_sent(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET
    welcome_email_sent = true,
    welcome_email_sent_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.mark_welcome_email_sent(UUID) TO authenticated, anon, service_role;
