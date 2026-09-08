"""
Week 5 — orchestration.

One DAG, four concerns: land -> refine -> model -> validate.
Every task is idempotent and parameterised on the logical date, so a backfill
of any past day produces exactly the same output as the original run.
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

sys.path.append("/opt/airflow")
from land_to_bronze import run as land_run  # noqa: E402

SPARK_SUBMIT = (
    "spark-submit --master spark://spark-master:7077 "
    "--packages org.apache.hadoop:hadoop-aws:3.3.4,"
    "com.amazonaws:aws-java-sdk-bundle:1.12.262,"
    "org.postgresql:postgresql:42.7.3 "
)

default_args = {
    "owner": "itumeleng",
    "retries": 2,
    "retry_delay": timedelta(minutes=2),
    "depends_on_past": False,
}

with DAG(
    dag_id="royal_batch_pipeline",
    description="CDC -> bronze -> silver -> gold -> dbt marts",
    start_date=datetime(2026, 9, 1),
    schedule="0 2 * * *",          # 02:00 daily, after the source system settles
    catchup=False,                  # flip to True to practise backfills
    max_active_runs=1,              # never let two runs write the same partition
    default_args=default_args,
    tags=["royal-square", "batch"],
) as dag:

    land = PythonOperator(
        task_id="land_cdc_to_bronze",
        python_callable=lambda **ctx: land_run(ctx["ds"]),
    )

    refine = []
    for table in ["clients", "policies", "claims", "premium_payments"]:
        refine.append(
            BashOperator(
                task_id=f"silver_{table}",
                bash_command=(
                    SPARK_SUBMIT
                    + f"/opt/jobs/bronze_to_silver.py --table {table} "
                    + "--run-date {{ ds }}"
                ),
            )
        )

    gold = BashOperator(
        task_id="build_gold_mart",
        bash_command=SPARK_SUBMIT + "/opt/jobs/silver_to_gold.py --run-date {{ ds }}",
    )

    dbt_run = BashOperator(
        task_id="dbt_run",
        bash_command="cd /opt/dbt && dbt run --profiles-dir .",
    )

    dbt_test = BashOperator(
        task_id="dbt_test",
        bash_command="cd /opt/dbt && dbt test --profiles-dir .",
    )

    land >> refine >> gold >> dbt_run >> dbt_test
