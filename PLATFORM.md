# Royal Square Data Platform

A single local stack that covers the whole 9-week Data Engineering syllabus as
one working system rather than nine disconnected exercises.

One source database. One CDC stream. Two processing paths. One API.

```
  ops.* tables            Debezium            bronze/          Spark
  (PostgreSQL)  ──CDC──▶  Redpanda  ──land──▶  (MinIO)  ──────▶ silver/ ──▶ gold/
                             │                                        │
                             │                                        ▼
                             │                                 analytics.* (Postgres)
                             │                                        │  dbt run + test
                             ▼                                        ▼
                      stream consumer ──▶ Redis ──┐          ┌── FastAPI
                                                  └──────────┘
                                                   /realtime   /analytics
```

The batch path is complete but hours old. The stream path is seconds old but
partial. Both read the same CDC topics. Being able to explain why you need both
is most of what Week 9 is assessing.

## Quick start

**On Windows, read `WINDOWS.md` first** — memory limits and line endings will
bite you before anything else does. Short version: use WSL2, keep the repo in
the Linux filesystem, and give Docker 12 GB.

```bash
cp .env.example .env          # change the passwords if you like
make up                       # builds, starts, registers the CDC connector
make smoke                    # verifies every layer is actually alive
make seed-stream              # in a second terminal: live OLTP activity
```

Then:

| Service | URL | Login |
|---|---|---|
| API docs | http://localhost:8000/docs | — |
| Airflow | http://localhost:8081 | admin / admin |
| Redpanda Console | http://localhost:8085 | — |
| MinIO Console | http://localhost:9001 | from `.env` |
| Spark Master | http://localhost:8080 | — |

Run the batch side once there is data in the topics:

```bash
make batch      # triggers royal_batch_pipeline
make dbt        # dbt run + dbt test
curl localhost:8000/analytics/loss-ratio | python3 -m json.tool
curl localhost:8000/realtime/claims/pipeline | python3 -m json.tool
```

## Where each week lives

| Week | Topic | In this repo |
|---|---|---|
| 1 | ETL, Bash, Python | `Makefile`, `scripts/`, the pipeline itself |
| 2 | Storage, formats, Docker | `docker-compose.yml`, MinIO buckets, Parquet in `spark/jobs/` |
| 3 | RDBMS, normalisation, ACID | `postgres/init/01_schema.sql` |
| 4 | Warehouse vs lake, ingestion | `airflow/land_to_bronze.py`, bronze→silver→gold split |
| 5 | Spark, Kafka, Airflow, DAGs | `spark/jobs/`, `stream/consumer.py`, `airflow/dags/` |
| 6 | Governance and quality | `dbt/models/schema.yml`, PII handling in the schema |
| 7–8 | Capstone | all of it, plus `DECISIONS.md` |
| 9 | Demo and defence | `scripts/generate_activity.py`, `DECISIONS.md` |

## Layout

```
postgres/init/     3NF source schema + 500 clients, 750 policies, 6k payments
connect/           Debezium connector config and registration script
airflow/           Dockerfile, DAG, and the bronze landing module
spark/jobs/        bronze→silver (dedupe CDC) and silver→gold (the mart)
stream/            Kafka→Redis consumer for the real-time view
dbt/               staging + marts models with data quality tests
api/               FastAPI over both stores
scripts/           activity generator and smoke test
DECISIONS.md       architecture decision log — start adding to this on day one
SCHEDULE.md        the 21-day compressed plan
WINDOWS.md         WSL2 setup, memory sizing, PowerShell equivalents
make.ps1           PowerShell task runner (mirrors the Makefile)
```

## Notes

Everything runs locally. Nothing here bills you. When you are ready to prove
cloud competence, the S3A configuration in `spark/jobs/bronze_to_silver.py` is
the only thing that changes to point at real S3, GCS, or ADLS — that is the
reason MinIO is used rather than a local filesystem.

Passwords in `.env.example` are local-development placeholders. Do not reuse
them anywhere that is reachable from the internet.
