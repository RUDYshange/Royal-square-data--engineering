"""
Week 7 — the serving layer, and the part reviewers will poke at hardest.

Two backends, one API surface:
  /realtime/*   -> Redis, updated by the stream consumer (millisecond reads)
  /analytics/*  -> Postgres analytics schema, built by Spark + dbt (hours old)

Every response says which one answered and how fresh it is. Silently mixing
fresh and stale numbers in one payload is how dashboards start lying.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime, timezone

import psycopg
import redis
from fastapi import FastAPI, HTTPException, Query
from psycopg.rows import dict_row
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from users import router as users_router
from auth import router as auth_router
from clients import router as clients_router

app = FastAPI(
    title="Royal Square Data Platform API",
    description="Batch marts and real-time views over one CDC stream.",
    version="1.0.0",
)

_redis = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"), port=6379, decode_responses=True
)
PG_DSN = os.getenv("PG_DSN", "postgresql://rs:rs_local_dev_only@localhost:5432/royalsquare")


@contextmanager
def db():
    with psycopg.connect(PG_DSN, row_factory=dict_row) as conn:
        yield conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/health")
def health():
    checks = {}
    try:
        _redis.ping()
        checks["redis"] = "up"
    except Exception as exc:
        checks["redis"] = f"down: {exc}"
    try:
        with db() as conn:
            conn.execute("SELECT 1")
        checks["postgres"] = "up"
    except Exception as exc:
        checks["postgres"] = f"down: {exc}"

    status = "healthy" if all(v == "up" for v in checks.values()) else "degraded"
    return {"status": status, "checks": checks, "checked_at": _now()}


# ----------------------------- real-time views -----------------------------

@app.get("/realtime/claims/pipeline")
def claims_pipeline():
    """Live claim counts by stage. Sub-second behind the source database."""
    counts = _redis.hgetall("claims:stage_counts")
    if not counts:
        raise HTTPException(503, "stream view not yet populated")
    last_ts = _redis.get("claims:last_event_ts")
    return {
        "source": "redis:stream",
        "freshness": "sub-second",
        "last_event_ts": last_ts,
        "stages": {k: int(v) for k, v in counts.items()},
        "served_at": _now(),
    }


@app.get("/realtime/claims/open")
def open_claims(limit: int = Query(20, ge=1, le=200)):
    """Largest open claims by value — the queue an assessor works from."""
    rows = _redis.zrevrange("claims:open", 0, limit - 1, withscores=True)
    return {
        "source": "redis:stream",
        "count": len(rows),
        "claims": [{"claim_id": cid, "amount": amt} for cid, amt in rows],
        "served_at": _now(),
    }


# ----------------------------- operator accounts (CRUD) -----------------------------

app.include_router(users_router)
app.include_router(auth_router)
app.include_router(clients_router)


# ----------------------------- batch analytics -----------------------------

@app.get("/analytics/clients/{client_id}")
def client_value(client_id: int):
    with db() as conn:
        exists = conn.execute(
            "SELECT to_regclass('analytics.client_value') IS NOT NULL AS ok"
        ).fetchone()
        if not exists["ok"]:
            # A missing mart is an expected state (batch has not run yet),
            # not a server fault — tell the client exactly that.
            raise HTTPException(
                503,
                "daily mart not built yet — run: make batch",
            )
        row = conn.execute(
            "SELECT * FROM analytics.client_value WHERE client_id = %s", (client_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, f"client {client_id} not in the mart")
    return {"source": "postgres:batch_mart", "freshness": "daily", "client": row}


@app.get("/analytics/loss-ratio")
def loss_ratio_by_province(min_policies: int = Query(1, ge=1)):
    """The mart's headline question: which provinces are we losing money in?"""
    with db() as conn:
        exists = conn.execute(
            "SELECT to_regclass('analytics.client_value') IS NOT NULL AS ok"
        ).fetchone()
        if not exists["ok"]:
            raise HTTPException(
                503,
                "daily mart not built yet — run: make batch",
            )
        rows = conn.execute(
            """
            SELECT province,
                   COUNT(*)                     AS clients,
                   SUM(policy_count)            AS policies,
                   SUM(lifetime_premium)        AS premium,
                   SUM(claim_value)             AS claims,
                   ROUND(
                     CASE WHEN SUM(lifetime_premium) > 0
                          THEN SUM(claim_value) / SUM(lifetime_premium)
                     END, 4)                    AS loss_ratio
            FROM analytics.client_value
            WHERE policy_count >= %s
            GROUP BY province
            ORDER BY loss_ratio DESC NULLS LAST
            """,
            (min_policies,),
        ).fetchall()
    return {"source": "postgres:batch_mart", "freshness": "daily", "rows": rows}


@app.get("/analytics/freshness")
def freshness():
    """Reviewers will ask how you know the pipeline ran. This is the answer."""
    with db() as conn:
        exists = conn.execute(
            "SELECT to_regclass('analytics.client_value') IS NOT NULL AS ok"
        ).fetchone()
        batch = (
            conn.execute(
                "SELECT MAX(run_date) AS last_run, COUNT(*) AS rows FROM analytics.client_value"
            ).fetchone()
            if exists["ok"]
            else None
        )
    if batch is None:
        raise HTTPException(
            503,
            "daily mart not built yet — run: make batch",
        )
    return {
        "batch": batch,
        "stream_last_event_ts": _redis.get("claims:last_event_ts"),
        "served_at": _now(),
    }
# Mounted at /app/web/dist by docker-compose. The guard keeps the API
# working for anyone who clones this without building the frontend.
#
# The SPA has client-side routes (/login). StaticFiles(html=True) only
# resolves exact files, so deep links would 404. This fallback rewrites
# any non-API GET to index.html after the real routes have had their
# chance — same reason the mount itself must stay last.
@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    candidate = WEB_DIST / full_path
    if WEB_DIST.is_dir() and full_path and candidate.is_file():
        return FileResponse(candidate)
    if WEB_DIST.is_dir():
        return FileResponse(WEB_DIST / "index.html")
    raise HTTPException(404, "frontend not built — run: cd web && npm run build")


WEB_DIST = Path(__file__).parent / "web" / "dist"
if WEB_DIST.is_dir():
    app.mount("/", StaticFiles(directory=WEB_DIST, html=True), name="ui")