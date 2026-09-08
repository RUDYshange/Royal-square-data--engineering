"""
Week 5 — batch layer, stage 1.

Reads raw CDC JSON landed in the bronze bucket, deduplicates to the latest
version of each row, and writes typed Parquet to silver, partitioned by date.

Run:
  spark-submit --master spark://spark-master:7077 \
      --packages org.apache.hadoop:hadoop-aws:3.3.4,com.amazonaws:aws-java-sdk-bundle:1.12.262 \
      /opt/jobs/bronze_to_silver.py --table clients --run-date 2026-09-08
"""
import argparse
import os

from pyspark.sql import SparkSession, Window
from pyspark.sql import functions as F


def build_spark(app_name: str) -> SparkSession:
    return (
        SparkSession.builder.appName(app_name)
        # MinIO speaks the S3 API, so the same code runs unchanged on real S3.
        .config("spark.hadoop.fs.s3a.endpoint", os.getenv("S3_ENDPOINT", "http://minio:9000"))
        .config("spark.hadoop.fs.s3a.access.key", os.getenv("MINIO_USER", "minioadmin"))
        .config("spark.hadoop.fs.s3a.secret.key", os.getenv("MINIO_PASSWORD", "minioadmin_local_only"))
        .config("spark.hadoop.fs.s3a.path.style.access", "true")
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
        .config("spark.sql.sources.partitionOverwriteMode", "dynamic")
        .getOrCreate()
    )


PRIMARY_KEYS = {
    "clients": "client_id",
    "policies": "policy_id",
    "claims": "claim_id",
    "premium_payments": "payment_id",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", required=True, choices=sorted(PRIMARY_KEYS))
    parser.add_argument("--run-date", required=True)
    args = parser.parse_args()

    spark = build_spark(f"bronze_to_silver::{args.table}")
    spark.sparkContext.setLogLevel("WARN")

    pk = PRIMARY_KEYS[args.table]
    src = f"s3a://bronze/{args.table}/ingest_date={args.run_date}/"
    dst = f"s3a://silver/{args.table}/"

    raw = spark.read.json(src)
    if raw.rdd.isEmpty():
        print(f"no bronze data for {args.table} on {args.run_date} — exiting cleanly")
        spark.stop()
        return

    # CDC gives every version of a row. Keep only the newest per key, and drop
    # anything the source deleted. This is the whole point of __op / __ts_ms.
    latest = Window.partitionBy(F.col(pk)).orderBy(F.col("__ts_ms").desc())

    deduped = (
        raw.withColumn("_rn", F.row_number().over(latest))
        .filter(F.col("_rn") == 1)
        .filter(F.col("__op") != "d")
        .drop("_rn")
        .withColumn("ingest_date", F.lit(args.run_date))
    )

    (
        deduped.repartition(4)
        .write.mode("overwrite")
        .partitionBy("ingest_date")
        .parquet(dst)
    )

    print(f"silver::{args.table} rows written: {deduped.count()}")
    spark.stop()


if __name__ == "__main__":
    main()
