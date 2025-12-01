
DROP VIEW IF EXISTS public.join_requests_with_profile;

CREATE OR REPLACE VIEW public.join_requests_with_profile
WITH (security_invoker=on)
AS
SELECT
    jr.id,
    jr.user_id,
    jr.group_id,
    jr.status,
    jr.contracts_requested,
    jr.created_at,
    jr.updated_at,
    p.first_name,
    p.last_name,
    p.phone,
    p.email
FROM
    public.join_requests jr
JOIN
    public.profiles p ON jr.user_id = p.id;
