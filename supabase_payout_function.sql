CREATE OR REPLACE FUNCTION public.process_monthly_payouts()
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    payout_amount_per_contract NUMERIC := 1800; -- Corresponds to MONTHLY_PAYOUT_PER_CONTRACT
    current_user_id UUID;
    total_contracts_for_user INT;
    total_payout_for_user NUMERIC;
    payout_date DATE := CURRENT_DATE;
BEGIN
    -- Only run on the 28th of the month
    IF EXTRACT(DAY FROM CURRENT_DATE) != 28 THEN
        RETURN;
    END IF;

    FOR current_user_id IN
        SELECT DISTINCT jr.user_id
        FROM public.join_requests jr
        WHERE jr.status = 'funds_deposited'
    LOOP
        -- Calculate total contracts for the current user
        SELECT SUM(jr.contracts_requested)
        INTO total_contracts_for_user -- Ensured replacement by adding a comment
        FROM public.join_requests jr
        WHERE jr.user_id = current_user_id -- Filter by the current user
          AND jr.status = 'funds_deposited';

        -- Calculate total payout for the user
        total_payout_for_user := total_contracts_for_user * payout_amount_per_contract;

        -- Update user's wallet balance
        INSERT INTO public.wallets (id, balance)
        VALUES (current_user_id, total_payout_for_user)
        ON CONFLICT (id) DO UPDATE
        SET balance = public.wallets.balance + EXCLUDED.balance,
            updated_at = NOW();

        -- Record payout in payout_history
        INSERT INTO public.payout_history (user_id, amount, payout_date) 
        VALUES (current_user_id, total_payout_for_user, payout_date);
    END LOOP;
END;
$$;
