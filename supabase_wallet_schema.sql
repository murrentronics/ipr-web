-- Create wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create payout_history table
CREATE TABLE public.payout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payout_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_history ENABLE ROW LEVEL SECURITY;

-- Policies for wallets table
CREATE POLICY "Users can view their own wallet." ON public.wallets
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own wallet balance." ON public.wallets
  FOR UPDATE USING (auth.uid() = id);

-- Policies for withdrawal_requests table
CREATE POLICY "Users can request withdrawals from their own wallet." ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own withdrawal requests." ON public.withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all withdrawal requests." ON public.withdrawal_requests
  FOR SELECT TO service_role USING (true); -- Assuming 'service_role' is your admin role
CREATE POLICY "Admins can update withdrawal requests." ON public.withdrawal_requests
  FOR UPDATE TO service_role USING (true); -- Assuming 'service_role' is your admin role

-- Policies for payout_history table
CREATE POLICY "Users can view their own payout history." ON public.payout_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all payout history." ON public.payout_history
  FOR SELECT TO service_role USING (true); -- Assuming 'service_role' is your admin role
CREATE POLICY "Admins can insert payout history." ON public.payout_history
  FOR INSERT TO service_role WITH CHECK (true); -- Assuming 'service_role' is your admin role
