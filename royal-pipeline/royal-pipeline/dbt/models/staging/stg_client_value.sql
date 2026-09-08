-- Thin view over the Spark-produced mart. dbt owns modelling and tests from
-- here down; Spark owns the heavy distributed work upstream. Keeping the
-- boundary explicit is easier to defend than one tool doing everything.

select
    client_id,
    province,
    risk_profile,
    policy_count,
    active_policies,
    coalesce(monthly_premium, 0)   as monthly_premium,
    coalesce(lifetime_premium, 0)  as lifetime_premium,
    coalesce(claim_count, 0)       as claim_count,
    coalesce(claim_value, 0)       as claim_value,
    loss_ratio,
    last_payment_at,
    run_date
from analytics.client_value
