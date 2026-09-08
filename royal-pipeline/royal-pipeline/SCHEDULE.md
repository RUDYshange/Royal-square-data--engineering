# 21-Day Compressed Plan

The stack in this repo is the syllabus. You are not learning nine modules; you
are fixing one system nine times.

Rule for the whole three weeks: if you cannot break it, you do not understand
it. Every block below ends with deliberately breaking something.

---

## Days 1–3 — Stand it up

- `make up`, `make smoke`, get every check passing.
- Read `postgres/init/01_schema.sql` and confirm the normalisation is genuinely
  3NF. Find the denormalisation you would make on purpose and note why.
- Watch CDC events land in Redpanda Console while `make seed-stream` runs.
- **Break it.** Stop the connector mid-stream, restart it, verify no gaps and
  no duplicates in bronze. Then drop the replication slot and watch what fails.

Covers Weeks 1, 2, 3.

---

## Days 4–7 — Spark properly

This is where most people stay shallow. Do not.

- Run `bronze_to_silver.py` and read the Spark UI on :8080 for every job.
  Identify the shuffle. Understand why the window function causes it.
- Change `repartition(4)` to 1, then 200. Measure both. Explain the shape of
  the result rather than the number.
- Broadcast the small `clients` dataframe in the gold join and compare plans
  with `.explain()`.
- Multiply the seed data by 50 and re-run. Find where it first hurts.
- **Break it.** Force a skewed key — one policy with a hundred thousand claims —
  and watch one task hold up the whole stage.

Covers Week 5 processing.

---

## Days 8–11 — Airflow beyond "it ran"

- Set `catchup=True`, clear the DAG, and backfill a week. Confirm the outputs
  are identical to single runs. If they are not, you have found real
  non-idempotence.
- Add a sensor that waits for bronze data instead of assuming it exists.
- Make a task fail deliberately and watch retry behaviour, then fix it forward
  without deleting state.
- Add SLA and failure callbacks so the pipeline tells you rather than you
  checking.
- **Break it.** Trigger two runs concurrently with `max_active_runs` raised and
  watch the partition corruption. Then explain why the guard exists.

Covers Week 5 orchestration.

---

## Days 12–14 — Kafka semantics

- Trace one row change from `UPDATE` through WAL, connector, topic, consumer,
  Redis. Draw it from memory afterwards.
- Reset the `serving-view` consumer group to earliest and replay. Watch counters
  double. That is ADR-004's cost, made visible.
- Add a second consumer instance and observe partition assignment. Then add a
  third with only one partition available.
- Rename a source column and see exactly where it fails. Decide where it
  *should* have failed.
- **Break it.** Kill the consumer mid-batch before commit and confirm
  redelivery.

Covers Week 5 streaming, Week 7 CDC.

---

## Days 15–18 — Modelling, quality, governance

- `dbt run` then `dbt test`. Make a test fail on purpose by corrupting a
  province value in the source, and follow the failure back upstream.
- Add tests that would catch a fan-out join: relationship tests, row count
  reconciliation between silver and gold.
- Generate `dbt docs` and read your own lineage graph.
- Write the governance section: who owns each layer, retention per bucket,
  what happens on a POPIA deletion request. That last one is a genuinely hard
  question in an immutable lake — answer it honestly.
- **Break it.** Delete a client in the source and trace whether they truly
  disappear from every layer.

Covers Week 6.

---

## Days 19–21 — Harden and rehearse

- Close every open question at the bottom of `DECISIONS.md`, or state
  explicitly why it stays open. Both are acceptable answers; silence is not.
- Rehearse the demo with live traffic running: source change to API response in
  under ten seconds, on screen.
- Prepare for the three questions that always come:
  1. Why Kafka rather than a scheduled query? (ADR-001)
  2. Why both batch and stream? (ADR-003)
  3. What happens when this gets a hundred times bigger? (name the first thing
     that breaks — a specific component, not "we would scale it")
- Have one honest weakness ready. Reviewers trust a candidate who names their
  own limitation far more than one who claims there is none.

Covers Weeks 7–9.

---

## What this plan does not compress

The team capstone needs teammates. The Week 9 defence has a fixed date and
external reviewers. Confirm with WeThinkCode_ whether accelerated progression
is permitted before assuming this replaces the coursework — in a gated,
auto-graded cohort programme it may only be preparation for it. Excellent
preparation, but plan for that answer.
