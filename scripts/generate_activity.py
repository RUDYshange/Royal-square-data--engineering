"""
Generates continuous OLTP activity so the CDC stream has something to carry.

Without this, the pipeline is technically correct and visibly dead. Run it in
a second terminal during your demo — the reviewers should watch numbers move.
"""
from __future__ import annotations

import argparse
import random
import time

import psycopg

DSN = "postgresql://rs:rs_local_dev_only@localhost:5432/royalsquare"
STAGES = ["lodged", "assessing", "approved", "rejected", "paid"]


def one_transaction(conn) -> str:
    action = random.choices(
        ["new_claim", "advance_claim", "payment", "lapse_policy"],
        weights=[3, 4, 6, 1],
    )[0]

    with conn.cursor() as cur:
        if action == "new_claim":
            cur.execute(
                """INSERT INTO ops.claims (policy_id, claim_amount, stage)
                   SELECT policy_id, round((1000 + random()*80000)::numeric, 2), 'lodged'
                   FROM ops.policies WHERE status = 'active'
                   ORDER BY random() LIMIT 1
                   RETURNING claim_id"""
            )
            row = cur.fetchone()
            return f"new claim {row[0] if row else '?'}"

        if action == "advance_claim":
            cur.execute(
                """UPDATE ops.claims SET stage = %s, updated_at = now()
                   WHERE claim_id = (
                     SELECT claim_id FROM ops.claims
                     WHERE stage IN ('lodged','assessing')
                     ORDER BY random() LIMIT 1)
                   RETURNING claim_id, stage""",
                (random.choice(STAGES[1:]),),
            )
            row = cur.fetchone()
            return f"claim {row[0]} -> {row[1]}" if row else "no open claims"

        if action == "payment":
            cur.execute(
                """INSERT INTO ops.premium_payments (policy_id, amount, method)
                   SELECT policy_id, premium_amount, 'debit_order'
                   FROM ops.policies WHERE status = 'active'
                   ORDER BY random() LIMIT 1
                   RETURNING payment_id"""
            )
            row = cur.fetchone()
            return f"payment {row[0] if row else '?'}"

        cur.execute(
            """UPDATE ops.policies SET status = 'lapsed', updated_at = now()
               WHERE policy_id = (
                 SELECT policy_id FROM ops.policies WHERE status = 'active'
                 ORDER BY random() LIMIT 1)
               RETURNING policy_id"""
        )
        row = cur.fetchone()
        return f"policy {row[0]} lapsed" if row else "no active policies"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--rate", type=float, default=2.0, help="transactions per second")
    p.add_argument("--duration", type=int, default=0, help="seconds, 0 = forever")
    args = p.parse_args()

    started = time.time()
    n = 0
    with psycopg.connect(DSN, autocommit=True) as conn:
        while args.duration == 0 or (time.time() - started) < args.duration:
            print(f"[{n:05d}] {one_transaction(conn)}")
            n += 1
            time.sleep(1 / args.rate)


if __name__ == "__main__":
    main()
