with segments as (
    select * from {{ ref('dim_client_segment') }}
)

select
    province,
    count(*)                                            as client_count,
    sum(active_policies)                                as active_policies,
    sum(lifetime_premium)                               as premium_collected,
    sum(claim_value)                                    as claims_paid,
    case
        when sum(lifetime_premium) > 0
        then round(sum(claim_value) / sum(lifetime_premium), 4)
    end                                                 as loss_ratio,
    sum(case when profitability_band = 'loss_making' then 1 else 0 end)
                                                        as loss_making_clients,
    max(run_date)                                       as run_date
from segments
group by province
