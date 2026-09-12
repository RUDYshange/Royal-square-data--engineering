"""Shared DB access helpers for the auth/users routers (flat-module import
target, matching how the container runs main.py)."""
from __future__ import annotations

from main import db


def fetch_user_by_email(email: str) -> dict | None:
    with db() as conn:
        return conn.execute(
            """
            SELECT user_id, full_name, email, role, province, status,
                   assigned_claims, password_hash
            FROM ops.app_users WHERE email = %s
            """,
            (email,),
        ).fetchone()


def fetch_user_by_id(user_id: int) -> dict | None:
    with db() as conn:
        return conn.execute(
            """
            SELECT user_id, full_name, email, role, province, status,
                   assigned_claims, password_hash
            FROM ops.app_users WHERE user_id = %s
            """,
            (user_id,),
        ).fetchone()
