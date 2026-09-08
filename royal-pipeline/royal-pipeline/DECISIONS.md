# Architecture Decision Log

Week 9 is a defence, not a demo. Reviewers stop caring what you built about
four minutes in and start asking why. This file is the answer to every "why".

Add an entry the moment you make a choice, not afterwards — reconstructed
reasoning always sounds reconstructed.

---

## ADR-001 — CDC over polling for ingestion

**Decision.** Capture changes from the Postgres write-ahead log with Debezium
rather than running scheduled `SELECT * WHERE updated_at > last_run` queries.

**Why.** Polling misses deletes entirely, misses intermediate states between
polls, and puts read load on the transactional database that grows with table
size. Log-based CDC reads a stream the database is already writing, sees every
version of every row, and costs the source system almost nothing.

**Cost.** Requires `wal_level=logical` and a replication slot on the source. An
abandoned slot will retain WAL segments indefinitely and eventually fill the
source disk — a real production failure mode worth naming out loud.

**Rejected.** Trigger-based CDC (writes amplify on the hot path), dual writes
from the application (no atomicity between database and broker).

---

## ADR-002 — Bronze / silver / gold, not a single transform

**Decision.** Land raw CDC JSON untouched, refine to typed deduplicated
Parquet, then model into business aggregates.

**Why.** Bronze is immutable and replayable. When a transform turns out to be
wrong — and one will — the fix is a re-run from bronze rather than an apology to
the source system owner. It also separates schema drift (a bronze problem) from
business logic errors (a gold problem), which are debugged very differently.

**Cost.** Three copies of the data and more moving parts than one script.

---

## ADR-003 — Both batch and stream, deliberately

**Decision.** The same CDC topics feed a nightly Spark batch pipeline and a
continuous Redis-backed consumer.

**Why.** They answer different questions. "What is our provincial loss ratio"
tolerates being a day old and requires complete, correct, joined data. "How
many claims are open right now" needs to be current and tolerates approximation.
Forcing both through one path means either stale operational views or an
expensive, fragile attempt at exactly-once aggregation.

**Cost.** Two code paths that can disagree. Mitigated by the API labelling
every response with its source and freshness, and by treating the batch result
as the reconciling truth.

---

## ADR-004 — Redis as the high-velocity store

**Decision.** Serve real-time queries from Redis structures maintained by the
stream consumer.

**Why.** The access patterns are known and narrow: counts by stage, a sorted
set of open claims by value. Redis serves those in well under a millisecond
with data structures that match the queries exactly.

**Cost.** It is a derived, rebuildable cache and must be treated as one. The
consumer is at-least-once, so `hincrby` counters can drift on redelivery.
Accepted for now because the batch mart corrects them nightly; the correct fix
is to store per-entity state and derive counts, not to increment.

**Rejected.** Postgres for real-time reads (contends with the OLTP workload),
Elasticsearch (heavier than these access patterns justify).

---

## ADR-005 — Spark for volume, dbt for meaning

**Decision.** Spark does the distributed dedupe and join work; dbt owns the
business models and their tests, in SQL, against the warehouse.

**Why.** Spark is the right tool for shuffling a large CDC history and is
wasted on a hundred-row segmentation. dbt gives lineage, documentation, and
tests for free, and its models are readable by an analyst who does not write
PySpark. Splitting on the volume boundary keeps each tool where it is strongest.

**Cost.** Two transformation languages in one codebase. The boundary must stay
explicit, or logic starts drifting across it.

---

## ADR-006 — Decimal for money, everywhere

**Decision.** `NUMERIC(12,2)` in Postgres, `decimal(12,2)` in Spark, `Decimal`
in Python. No floats touch a monetary value at any stage.

**Why.** Binary floating point cannot represent most decimal fractions. Errors
accumulate under summation, and a loss ratio computed from drifted premiums is
wrong in a way nobody notices until an audit.

---

## ADR-007 — POPIA-aware schema from the start

**Decision.** Store a hash of the ID number, never the raw value. Marts carry
`client_id` and aggregates only. No PII travels to the lake.

**Why.** POPIA requires minimisation, and a data lake is the worst possible
place to discover you have been copying identity numbers for eight months.
Restricting PII to the OLTP layer keeps the compliance surface small.

**Cost.** Some analyses need a lookup back to the source with its own access
controls. That friction is the point.

---

## ADR-008 — Idempotent, date-parameterised tasks

**Decision.** Every task takes the logical date and overwrites its partition.
`max_active_runs=1`. Re-running any day produces identical output.

**Why.** Pipelines fail. If recovery requires reasoning about what a task
already did, recovery becomes a judgement call at 02:00. Idempotence turns it
into a re-run.

**Cost.** Overwrite semantics mean a task that fails midway leaves a partial
partition until the retry completes.

---

## Open questions to raise before reviewers do

- The stream consumer is at-least-once with non-idempotent counters. What
  breaks first at ten times the event rate?
- No schema registry. A source column rename currently fails silently in the
  Spark job rather than at ingestion. Where should that be caught?
- Backfill has not been tested past a few days. Does the bronze consumer group
  make a true historical replay possible, or does it need offset resets?
- Single Redpanda broker, replication factor one. Acceptable locally, not in
  production. What is the migration path?
