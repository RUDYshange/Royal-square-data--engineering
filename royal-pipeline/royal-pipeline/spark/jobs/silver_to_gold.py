"""
Week 5 — batch layer, stage 2.

Joins the silver tables into a client-level analytical mart and writes it to
both the gold bucket (lake) and Postgres analytics schema (warehouse serving).

This is where the lake-vs-warehouse distinction stops being theoretical: the
lake keeps the full-fidelity history, the warehouse keeps the query-shaped copy.
"""
import argparse
import os

from pyspark.sql import SparkSession
from pyspark.sql import functions as F

from bronze_to_silver import build_spark


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-date", required=True)
    args = parser.parse_args()

    spark = build_spark("silver_to_gold")
    spark.sparkContext.setLogLevel("WARN")

    clients = spark.read.parquet("s3a://silver/clients/")
    policies = spark.read.parquet("s3a://silver/policies/")
    claims = spark.read.parquet("s3a://silver/claims/")
    payments = spark.read.parquet("s3a://silver/premium_payments/")

    # Cast money to decimal, never float. Floats lose cents at scale.
    policies = policies.withColumn(
        "premium_amount", F.col("premium_amount").cast("decimal(12,2)")
    )
    claims = claims.withColumn(
        "claim_amount", F.col("claim_amount").cast("decimal(12,2)")
    )
    payments = payments.withColumn("amount", F.col("amount").cast("decimal(12,2)"))

    policy_claims = claims.groupBy("policy_id").agg(
        F.count("*").alias("claim_count"),
        F.sum("claim_amount").alias("claim_value"),
        F.sum(F.when(F.col("stage") == "paid", 1).otherwise(0)).alias("claims_paid"),
    )

    policy_payments = payments.groupBy("policy_id").agg(
        F.sum("amount").alias("premium_collected"),
        F.max("paid_at").alias("last_payment_at"),
    )

    enriched = (
        policies.join(policy_claims, "policy_id", "left")
        .join(policy_payments, "policy_id", "left")
        .fillna({"claim_count": 0, "claims_paid": 0})
    )

    mart = (
        enriched.groupBy("client_id")
        .agg(
            F.count("policy_id").alias("policy_count"),
            F.sum(F.when(F.col("status") == "active", 1).otherwise(0)).alias("active_policies"),
            F.sum("premium_amount").alias("monthly_premium"),
            F.sum("premium_collected").alias("lifetime_premium"),
            F.sum("claim_count").alias("claim_count"),
            F.sum("claim_value").alias("claim_value"),
            F.max("last_payment_at").alias("last_payment_at"),
        )
        .join(
            clients.select("client_id", "province", "risk_profile"),
            "client_id",
            "inner",
        )
        # Loss ratio is the one number the business actually argues about.
        .withColumn(
            "loss_ratio",
            F.when(
                F.col("lifetime_premium") > 0,
                F.round(F.col("claim_value") / F.col("lifetime_premium"), 4),
            ).otherwise(F.lit(None)),
        )
        .withColumn("run_date", F.lit(args.run_date))
    )

    mart.write.mode("overwrite").parquet("s3a://gold/client_value/")

    (
        mart.write.mode("overwrite")
        .format("jdbc")
        .option("url", "jdbc:postgresql://postgres:5432/royalsquare")
        .option("dbtable", "analytics.client_value")
        .option("user", os.getenv("PG_USER", "rs"))
        .option("password", os.getenv("PG_PASSWORD", "rs_local_dev_only"))
        .option("driver", "org.postgresql.Driver")
        .save()
    )

    print(f"gold::client_value rows: {mart.count()}")
    spark.stop()


if __name__ == "__main__":
    main()
