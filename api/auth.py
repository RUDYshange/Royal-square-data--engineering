"""
Auth — POST /auth/login issues a JWT after verifying credentials against
ops.app_users; GET /auth/me resolves the current operator from the token.

Design notes:
- Passwords: PBKDF2-SHA256, 200k iterations, hex(salt)$hex(dk) — stdlib
  hashlib, no extra dependency. Hashes live only in Postgres.
- Tokens: HS256 JWT via PyJWT, 8-hour expiry (matches the "Keep session
  active for 8 hours" promise on the login screen). The signing secret is
  read from AUTH_JWT_SECRET in production; local dev gets a fallback.
- The register page's request flow is intentionally separate: new accounts
  start 'invited' and cannot log in until an ops lead activates them.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

JWT_SECRET = os.getenv("AUTH_JWT_SECRET", "dev-only-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_TTL_HOURS = 8

# Ops-role display names for the identity payload.
ROLE_TITLES = {
    "assessor":        "Claims Assessor",
    "senior_assessor": "Senior Assessor",
    "ops_lead":        "Operations Lead",
    "batch_engineer":  "Batch Engineer",
    "risk_analyst":    "Risk Analyst",
}

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


class LoginIn(BaseModel):
    email: str
    password: str


def _verify_password(password: str, stored: str) -> bool:
    """Constant-time PBKDF2 verification of hex(salt)$hex(dk) hashes."""
    try:
        salt_hex, dk_hex = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt_hex), 200_000
    )
    return hmac.compare_digest(candidate.hex(), dk_hex)


def _issue_token(user_id: int, email: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    """FastAPI dependency: validates the Bearer token, loads the operator."""
    if creds is None:
        raise HTTPException(401, "missing bearer token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "session expired — sign in again")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "invalid token")

    from db_deps import fetch_user_by_id   # flat-module import, see users.py
    user = fetch_user_by_id(int(payload["sub"]))
    if not user or user["status"] != "active":
        raise HTTPException(401, "account is not active")

    return {
        "user_id":    user["user_id"],
        "full_name":  user["full_name"],
        "email":      user["email"],
        "role":       user["role"],
        "role_title": ROLE_TITLES.get(user["role"], user["role"]),
        "province":   user["province"],
    }


# POST /auth/login ------------------------------------------------------------
@router.post("/login")
def login(payload: LoginIn):
    from db_deps import fetch_user_by_email
    user = fetch_user_by_email(payload.email)

    # Same 401 whether the email is unknown or the password is wrong —
    # do not leak which accounts exist.
    if not user or not user.get("password_hash") or not _verify_password(
        payload.password, user["password_hash"]
    ):
        raise HTTPException(401, "invalid email or password")

    if user["status"] == "suspended":
        raise HTTPException(403, "account suspended — contact an operations lead")
    if user["status"] == "invited":
        raise HTTPException(403, "account not yet activated — awaiting supervisor sign-off")

    return {
        "access_token": _issue_token(user["user_id"], user["email"], user["role"]),
        "token_type": "bearer",
        "expires_in": JWT_TTL_HOURS * 3600,
        "user": {
            "user_id":    user["user_id"],
            "full_name":  user["full_name"],
            "email":      user["email"],
            "role":       user["role"],
            "role_title": ROLE_TITLES.get(user["role"], user["role"]),
            "province":   user["province"],
        },
    }


# GET /auth/me ------------------------------------------------------------------
@router.get("/me")
def me(user: dict = Depends(current_user)):
    return {"user": user}
