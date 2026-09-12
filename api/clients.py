"""
Clients CRUD — Create, Read, Update, Delete for policyholders.

Serves the operator-facing directory over the CDC source table
`ops.clients`. Writes here are exactly the Week-7 demo: a row inserted
through this API appears in the Redpanda topic and the Redis pipeline
counts within seconds, source to screen.

POPIA: the ID number is stored only as a hash (ADR-007); this API never
accepts or returns a raw ID number. All writes require the ops_lead role;
reads are open to any active operator, like the users router.
"""
from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import current_user

Role = Literal["assessor", "senior_assessor", "ops_lead", "batch_engineer", "risk_analyst"]
Risk = Literal["low", "moderate", "high"]

router = APIRouter(prefix="/clients", tags=["clients"])


def require_ops_lead(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "ops_lead":
        raise HTTPException(403, "client directory changes require the Operations Lead role")
    return user


class ClientIn(BaseModel):
    """Payload for POST /clients. id_number is hashed on arrival, never stored."""
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: str | None = Field(default=None, max_length=160)
    province: str = Field(min_length=2, max_length=60)
    risk_profile: Risk = "moderate"
    id_number: str | None = Field(default=None, min_length=6, max_length=40,
                                  description="hashed on write, never stored raw")


class ClientUpdate(BaseModel):
    """Payload for PATCH /clients/{id} — all fields optional."""
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: str | None = Field(default=None, max_length=160)
    province: str | None = Field(default=None, min_length=2, max_length=60)
    risk_profile: Risk | None = None


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Deterministic pepper keeps the hash stable without storing a per-row salt
# (this is a pseudonymisation key for joins, not a password digest).
_ID_PEPPER = os_pepper = secrets.token_bytes(16).hex()


def _hash_id(id_number: str) -> str:
    return hashlib.sha256((_ID_PEPPER + id_number).encode()).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_email(email: str | None) -> str | None:
    if email is not None and email != "" and not EMAIL_RE.match(email):
        raise HTTPException(422, f"invalid email format: {email}")
    return email or None


def _row_to_dict(row) -> dict:
    return {
        "client_id":    row["client_id"],
        "first_name":   row["first_name"],
        "last_name":    row["last_name"],
        "full_name":    f"{row['first_name']} {row['last_name']}",
        "email":        row["email"],
        "province":     row["province"],
        "risk_profile": row["risk_profile"],
        "policy_count": row.get("policy_count", 0),
        "created_at":   row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at":   row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


# POST /clients — Create (ops_lead only) --------------------------------------
@router.post("", status_code=201)
def create_client(payload: ClientIn, lead: dict = Depends(require_ops_lead)):
    from main import db      # container runs main.py as a flat module
    _validate_email(payload.email)

    id_hash = _hash_id(payload.id_number) if payload.id_number else \
        "anon-" + secrets.token_hex(16)

    with db() as conn:
        dup = conn.execute(
            "SELECT 1 FROM ops.clients WHERE id_number_hash = %s", (id_hash,)
        ).fetchone()
        if dup:
            raise HTTPException(409, "a client with this ID number already exists")

        row = conn.execute(
            """
            INSERT INTO ops.clients (id_number_hash, first_name, last_name, email,
                                     province, risk_profile)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING client_id, first_name, last_name, email, province,
                      risk_profile, created_at, updated_at
            """,
            (id_hash, payload.first_name, payload.last_name, payload.email,
             payload.province, payload.risk_profile),
        ).fetchone()
    return _row_to_dict(row)


# GET /clients + GET /clients/{id} — Read (any authenticated operator) --------
@router.get("")
def list_clients(
    q: str | None = Query(default=None, description="search name or email"),
    province: str | None = Query(default=None),
    risk_profile: Risk | None = Query(default=None),
    has_policies: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(current_user),
):
    from main import db
    clauses, params = [], []

    if q:
        clauses.append("(first_name ILIKE %s OR last_name ILIKE %s OR email ILIKE %s)")
        params += [f"%{q}%"] * 3
    if province:
        clauses.append("province ILIKE %s")
        params.append(province)
    if risk_profile:
        clauses.append("risk_profile = %s")
        params.append(risk_profile)
    if has_policies is True:
        clauses.append("EXISTS (SELECT 1 FROM ops.policies p WHERE p.client_id = c.client_id)")
    if has_policies is False:
        clauses.append("NOT EXISTS (SELECT 1 FROM ops.policies p WHERE p.client_id = c.client_id)")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) AS n FROM ops.clients c {where}", tuple(params)
        ).fetchone()["n"]
        rows = conn.execute(
            f"""
            SELECT c.client_id, c.first_name, c.last_name, c.email, c.province,
                   c.risk_profile, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM ops.policies p
                     WHERE p.client_id = c.client_id) AS policy_count
            FROM ops.clients c {where}
            ORDER BY c.client_id
            LIMIT %s OFFSET %s
            """,
            tuple(params) + (limit, offset),
        ).fetchall()

    return {"count": total, "limit": limit, "offset": offset,
            "clients": [_row_to_dict(r) for r in rows]}


@router.get("/{client_id}")
def get_client(client_id: int, user: dict = Depends(current_user)):
    """Full profile: client row plus policies and claims across them."""
    from main import db
    with db() as conn:
        exists = conn.execute(
            "SELECT to_regclass('analytics.client_value') IS NOT NULL AS ok"
        ).fetchone()
        row = conn.execute(
            """
            SELECT client_id, first_name, last_name, email, province,
                   risk_profile, created_at, updated_at,
                   (SELECT COUNT(*) FROM ops.policies p
                     WHERE p.client_id = c.client_id) AS policy_count
            FROM ops.clients c WHERE client_id = %s
            """,
            (client_id,),
        ).fetchone()
        if not row:
            raise HTTPException(404, f"client {client_id} not found")

        policies = conn.execute(
            """
            SELECT p.policy_id, p.policy_number, p.premium_amount, p.status,
                   p.inception_date, p.product_id,
                   (SELECT COUNT(*) FROM ops.claims cl
                     WHERE cl.policy_id = p.policy_id) AS claim_count,
                   (SELECT COALESCE(SUM(cl.claim_amount), 0) FROM ops.claims cl
                     WHERE cl.policy_id = p.policy_id
                       AND cl.stage IN ('approved', 'paid')) AS paid_claims
            FROM ops.policies p
            WHERE p.client_id = %s
            ORDER BY p.inception_date DESC
            """,
            (client_id,),
        ).fetchall()

        claims = conn.execute(
            """
            SELECT cl.claim_id, cl.claim_amount, cl.stage, cl.lodged_at,
                   p.policy_number
            FROM ops.claims cl
            JOIN ops.policies p ON p.policy_id = cl.policy_id
            WHERE p.client_id = %s
            ORDER BY cl.lodged_at DESC
            LIMIT 10
            """,
            (client_id,),
        ).fetchall()

        totals = conn.execute(
            """
            SELECT COALESCE(SUM(p.premium_amount), 0) AS lifetime_premium,
                   COUNT(*) AS active_policies
            FROM ops.policies p
            WHERE p.client_id = %s AND p.status = 'active'
            """,
            (client_id,),
        ).fetchone()

        # Optional batch enrichment — only when the daily mart has run.
        mart = None
        if exists["ok"]:
            mart = conn.execute(
                "SELECT policy_count, lifetime_premium, loss_ratio, client_segment "
                "FROM analytics.client_value WHERE client_id = %s",
                (client_id,),
            ).fetchone()

    def _iso(v):
        return v.isoformat() if hasattr(v, "isoformat") else v

    return {
        "client": _row_to_dict(row),
        "totals": {
            "lifetime_premium": float(totals["lifetime_premium"] or 0),
            "active_policies": totals["active_policies"],
            "open_claims": sum(1 for c in claims if c["stage"] in ("lodged", "assessing")),
        },
        "policies": [
            {**{k: (_iso(v) if k == "inception_date" else
                    (float(v) if k in ("premium_amount", "paid_claims") else v))
                 for k, v in p.items()}} for p in policies
        ],
        "claims": [
            {**c, "claim_amount": float(c["claim_amount"]),
             "lodged_at": c["lodged_at"].isoformat()} for c in claims
        ],
        "mart": mart,
        "source": "postgres:oltp",
        "served_at": _now(),
    }


# PATCH /clients/{id} — Update (ops_lead only) --------------------------------
@router.patch("/{client_id}")
def update_client(client_id: int, payload: ClientUpdate, lead: dict = Depends(require_ops_lead)):
    from main import db
    if payload.email is not None:
        _validate_email(payload.email)

    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(422, "no fields to update")

    with db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM ops.clients WHERE client_id = %s", (client_id,)
        ).fetchone()
        if not exists:
            raise HTTPException(404, f"client {client_id} not found")

        set_sql = ", ".join(f"{k} = %s" for k in updates)
        params = list(updates.values()) + [client_id]
        row = conn.execute(
            f"""
            UPDATE ops.clients SET {set_sql}, updated_at = now()
            WHERE client_id = %s
            RETURNING client_id, first_name, last_name, email, province,
                      risk_profile, created_at, updated_at
            """,
            tuple(params),
        ).fetchone()
    return _row_to_dict(row)


# DELETE /clients/{id} — Delete (ops_lead only) --------------------------------
@router.delete("/{client_id}")
def delete_client(client_id: int, lead: dict = Depends(require_ops_lead)):
    """Removes the client and, by cascade policy, their policies and claims.

    Debezium carries every one of those deletes down the stream — the demo
    of POPIA's right-to-erasure reaching every derived layer.
    """
    from main import db
    with db() as conn:
        # Children first: the schema has no ON DELETE CASCADE.
        conn.execute(
            "DELETE FROM ops.claims WHERE policy_id IN "
            "(SELECT policy_id FROM ops.policies WHERE client_id = %s)",
            (client_id,),
        )
        conn.execute("DELETE FROM ops.policies WHERE client_id = %s", (client_id,))
        row = conn.execute(
            "DELETE FROM ops.clients WHERE client_id = %s RETURNING client_id",
            (client_id,),
        ).fetchone()
    if not row:
        raise HTTPException(404, f"client {client_id} not found")
    return {"deleted": client_id, "deleted_at": _now()}
