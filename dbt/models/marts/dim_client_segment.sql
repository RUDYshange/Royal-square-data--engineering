-- Segments clients on value and risk. The thresholds are business rules, so
-- they live in version control where someone can argue with them.

with base as (
    select * from {{ ref('stg_client_value') }}
),

scored as (
    select
        *,
        case
            when lifetime_premium >= 100000 then 'platinum'
            when lifetime_premium >=  40000 then 'gold'
            when lifetime_premium >=  10000 then 'silver'
            else 'bronze'
        end as value_tier,

        case
            when loss_ratio is null        then 'no_history'
            when loss_ratio >= 1.0         then 'loss_making'
            when loss_ratio >= 0.6         then 'marginal'
            else 'profitable'
        end as profitability_band
    from base
)

select
    client_id,
    province,
    risk_profile,
    value_tier,
    profitability_band,
    policy_count,
    active_policies,
    lifetime_premium,
    claim_value,
    loss_ratio,
    last_payment_at,
    run_date
from scored
