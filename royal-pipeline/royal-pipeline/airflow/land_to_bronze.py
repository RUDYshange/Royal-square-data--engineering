"""
Week 4 — ingestion. Drains CDC topics into the bronze bucket as raw JSON.

Deliberately dumb: no parsing, no filtering, no schema enforcement. Bronze is
an immutable record of what arrived. If a transform is wrong you re-run it from
bronze rather than re-reading the source system.
"""
from __future__ import annotations

import io
import json
import os
from datetime import datetime

import boto3
from kafka import KafkaConsumer, TopicPartition

TABLES = ["clients", "policies", "claims", "premium_payments"]
BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "redpanda:29092")
MAX_IDLE_MS = 8000  # stop when the topic goes quiet


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("S3_ENDPOINT", "http://minio:9000"),
        aws_access_key_id=os.getenv("MINIO_USER", "minioadmin"),
        aws_secret_access_key=os.getenv("MINIO_PASSWORD", "minioadmin_local_only"),
    )


def drain_table(table: str, run_date: str) -> int:
    topic = f"rs.ops.{table}"
    consumer = KafkaConsumer(
        topic,
        bootstrap_servers=BOOTSTRAP,
        # A named group means offsets are committed — re-running the DAG picks
        # up where it stopped instead of reprocessing everything.
        group_id="bronze-lander",
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda v: v.decode("utf-8") if v else None,
        consumer_timeout_ms=MAX_IDLE_MS,
    )

    buffer = io.StringIO()
    count = 0
    for message in consumer:
        if message.value is None:      # tombstone from a delete
            continue
        buffer.write(message.value + "\n")
        count += 1

    consumer.close()

    if count == 0:
        print(f"{table}: nothing new")
        return 0

    key = f"{table}/ingest_date={run_date}/part-{datetime.utcnow():%H%M%S}.json"
    s3_client().put_object(
        Bucket="bronze", Key=key, Body=buffer.getvalue().encode("utf-8")
    )
    print(f"{table}: landed {count} records -> s3a://bronze/{key}")
    return count


def run(run_date: str) -> dict:
    return {t: drain_table(t, run_date) for t in TABLES}


if __name__ == "__main__":
    import sys

    date = sys.argv[1] if len(sys.argv) > 1 else datetime.utcnow().strftime("%Y-%m-%d")
    print(json.dumps(run(date), indent=2))
