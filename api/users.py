"""
Users CRUD — Create, Read, Update, Delete for operator accounts.

A classic serving-layer CRUD over `ops.app_users`: unlike the analytics
endpoints these rows are written by the platform itself, so responses do
not carry source/freshness envelopes — the write path IS the source.

Secrets deliberately live in the identity provider, not here (POPIA):
these records are account metadata only.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field

from auth import current_user

# EmailStr needs the email-validator package; fall back gracefully so the
# API still boots if it is absent.
try:
    from pydantic import EmailStr  # noqa: F811
    _HAS_EMAIL_VALIDATOR = True
except Exception:  # pragma: no cover
    _HAS_EMAIL_VALIDATOR = False
    EmailStr = str  # type: ignore[misc,assignment]

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

Role = Literal["assessor", "senior_assessor", "ops_lead", "batch_engineer", "risk_analyst"]
Status = Literal["active", "invited", "suspended"]

router = APIRouter(prefix="/users", tags=["users"])


def require_ops_lead(user: dict = Depends(current_user)) -> dict:
    """Writing to the operator directory is an Operations-Lead action.
    Reads stay open to any authenticated operator; every write needs this."""
    if user["role"] != "ops_lead":
        raise HTTPException(
            403,
            "operator directory changes require the Operations Lead role",
        )
    return user


class UserIn(BaseModel):
    """Payload for POST /users."""
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: Role
    province: str = Field(default="Gauteng", min_length=2, max_length=60)
    status: Status = "active"
    assigned_claims: int = Field(default=0, ge=0, le=100_000)


class UserUpdate(BaseModel):
    """Payload for PATCH /users/{id} — all fields optional."""
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    role: Role | None = None
    province: str | None = Field(default=None, min_length=2, max_length=60)
    status: Status | None = None
    assigned_claims: int | None = Field(default=None, ge=0, le=100_000)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_email_format(email: str) -> str:
    """Cheap format guard used when EmailStr is unavailable."""
    if not _HAS_EMAIL_VALIDATOR and not EMAIL_RE.match(email):
        raise HTTPException(422, f"invalid email format: {email}")
    return email


def _row_to_dict(row) -> dict:
    return {
        "user_id":  row["user_id"],
        "full_name": row["full_name"],
        "email":     row["email"],
        "role":      row["role"],
        "province":  row["province"],
        "status":    row["status"],
        "assigned_claims": row["assigned_claims"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


# POST /users — Create (ops_lead only) ---------------------------------------
@router.post("", status_code=201)
def create_user(payload: UserIn, lead: dict = Depends(require_ops_lead)):
    _validate_email_format(payload.email)
    from main import db      # container runs main.py as a flat module
    with db() as conn:
        dup = conn.execute(
            "SELECT 1 FROM ops.app_users WHERE email = %s", (payload.email,)
        ).fetchone()
        if dup:
            raise HTTPException(409, f"a user with email {payload.email} already exists")

        row = conn.execute(
            """
            INSERT INTO ops.app_users (full_name, email, role, province, status, assigned_claims)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING user_id, full_name, email, role, province, status,
                      assigned_claims, created_at, updated_at
            """,
            (payload.full_name, payload.email, payload.role, payload.province,
             payload.status, payload.assigned_claims),
        ).fetchone()
    return _row_to_dict(row)


# GET /users + GET /users/{id} — Read (any authenticated operator) -----------
@router.get("")
def list_users(
    status: Status | None = Query(default=None),
    role: Role | None = Query(default=None),
    province: str | None = Query(default=None),
    q: str | None = Query(default=None, description="search full_name or email"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(current_user),
):
    from main import db
    clauses, params = [], []

    if status:
        clauses.append("status = %s");  params.append(status)
    if role:
        clauses.append("role = %s");    params.append(role)
    if province:
        clauses.append("province ILIKE %s"); params.append(province)
    if q:
        clauses.append("(full_name ILIKE %s OR email ILIKE %s)")
        params += [f"%{q}%", f"%{q}%"]

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) AS n FROM ops.app_users {where}", tuple(params)
        ).fetchone()["n"]
        rows = conn.execute(
            f"""
            SELECT user_id, full_name, email, role, province, status,
                   assigned_claims, created_at, updated_at
            FROM ops.app_users {where}
            ORDER BY created_at DESC, user_id DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params) + (limit, offset),
        ).fetchall()

    return {"count": total, "limit": limit, "offset": offset,
            "users": [_row_to_dict(r) for r in rows]}


@router.get("/{user_id}")
def get_user(user_id: int, user: dict = Depends(current_user)):
    from main import db
    with db() as conn:
        row = conn.execute(
            """
            SELECT user_id, full_name, email, role, province, status,
                   assigned_claims, created_at, updated_at
            FROM ops.app_users WHERE user_id = %s
            """,
            (user_id,),
        ).fetchone()
    if not row:
        raise HTTPException(404, f"user {user_id} not found")
    return _row_to_dict(row)


# PATCH /users/{id} — Update (ops_lead only) ----------------------------------
@router.patch("/{user_id}")
def update_user(user_id: int, payload: UserUpdate, lead: dict = Depends(require_ops_lead)):
    if payload.email is not None:
        _validate_email_format(payload.email)

    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(422, "no fields to update")

    from main import db
    with db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM ops.app_users WHERE user_id = %s", (user_id,)
        ).fetchone()
        if not exists:
            raise HTTPException(404, f"user {user_id} not found")

        if "email" in updates:
            dup = conn.execute(
                "SELECT 1 FROM ops.app_users WHERE email = %s AND user_id <> %s",
                (updates["email"], user_id),
            ).fetchone()
            if dup:
                raise HTTPException(409, f"a user with email {updates['email']} already exists")

        set_sql = ", ".join(f"{k} = %s" for k in updates)
        params = list(updates.values()) + [user_id]
        row = conn.execute(
            f"""
            UPDATE ops.app_users SET {set_sql}, updated_at = now()
            WHERE user_id = %s
            RETURNING user_id, full_name, email, role, province, status,
                      assigned_claims, created_at, updated_at
            """,
            tuple(params),
        ).fetchone()
    return _row_to_dict(row)


# DELETE /users/{id} — Delete (ops_lead only) ----------------------------------
@router.delete("/{user_id}")
def delete_user(user_id: int, lead: dict = Depends(require_ops_lead)):
    if lead["user_id"] == user_id:
        raise HTTPException(409, "you cannot delete your own account")
    from main import db
    with db() as conn:
        row = conn.execute(
            "DELETE FROM ops.app_users WHERE user_id = %s RETURNING user_id",
            (user_id,),
        ).fetchone()
    if not row:
        raise HTTPException(404, f"user {user_id} not found")
    return {"deleted": user_id, "deleted_at": _now()}
