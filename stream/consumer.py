"""
Week 5/7 — the stream half of the platform.

Same CDC topics as the batch job, entirely different contract:
  batch  = complete, hours old, cheap to recompute
  stream = incomplete, seconds old, expensive to recompute

This consumer maintains a Redis view for the real-time API. It never touches
the lake. If it dies, the batch pipeline still produces correct numbers — that
separation is the whole reason a lambda-style split exists.
"""
from __future__ import annotations

import json
import logging
import os
import signal
import sys
from decimal import Decimal

import redis
from kafka import KafkaConsumer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("stream-consumer")

TOPICS = ["rs.ops.claims", "rs.ops.premium_payments", "rs.ops.policies"]

_running = True


def _stop(*_):
    global _running
    _running = False
    log.info("shutdown requested, committing offsets and exiting")


signal.signal(signal.SIGTERM, _stop)
signal.signal(signal.SIGINT, _stop)


def handle_claim(r: redis.Redis, payload: dict) -> None:
    stage = payload.get("stage")
    claim_id = payload.get("claim_id")
    amount = Decimal(str(payload.get("claim_amount", "0")))

    # Live pipeline counts, keyed by stage — what an ops dashboard actually needs
    r.hincrby("claims:stage_counts", stage, 1)
    r.hset(f"claim:{claim_id}", mapping={"stage": stage, "amount": str(amount)})

    if stage in ("lodged", "assessing"):
        r.zadd("claims:open", {str(claim_id): float(amount)})
    else:
        r.zrem("claims:open", str(claim_id))

    r.set("claims:last_event_ts", payload.get("__ts_ms", 0))


def handle_payment(r: redis.Redis, payload: dict) -> None:
    policy_id = payload.get("policy_id")
    amount = float(Decimal(str(payload.get("amount", "0"))))
    r.incrbyfloat("payments:today_total", amount)
    r.incrbyfloat(f"policy:{policy_id}:collected", amount)


def handle_policy(r: redis.Redis, payload: dict) -> None:
    r.hset(
        f"policy:{payload.get('policy_id')}",
        mapping={
            "status": payload.get("status", ""),
            "premium": str(payload.get("premium_amount", "0")),
        },
    )


HANDLERS = {
    "rs.ops.claims": handle_claim,
    "rs.ops.premium_payments": handle_payment,
    "rs.ops.policies": handle_policy,
}


def main() -> int:
    r = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"), port=6379, decode_responses=True
    )
    consumer = KafkaConsumer(
        *TOPICS,
        bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP", "localhost:9092"),
        group_id="serving-view",
        auto_offset_reset="earliest",
        # Manual commits: only acknowledge a message after Redis is updated,
        # which gives at-least-once delivery. Handlers must therefore be safe
        # to apply twice — hset is, hincrby is not, so counters can drift on
        # replay. Document the tradeoff rather than pretending it isn't there.
        enable_auto_commit=False,
        value_deserializer=lambda v: json.loads(v) if v else None,
        consumer_timeout_ms=1000,
    )

    log.info("consuming %s", TOPICS)
    while _running:
        for message in consumer:
            if message.value is None:
                continue
            handler = HANDLERS.get(message.topic)
            if not handler:
                continue
            try:
                handler(r, message.value)
                consumer.commit()
            except Exception:
                log.exception("failed on %s offset %s", message.topic, message.offset)
                # Do not commit — the message will be redelivered.

    consumer.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
