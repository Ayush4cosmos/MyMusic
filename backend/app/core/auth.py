# app/core/auth.py
import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

DEV_USER_ID = "00000000-0000-0000-0000-000000000001"

def _get_guest_id(request: Request) -> Optional[str]:
    header_id = request.headers.get("x-guest-id")
    if header_id:
        return header_id.strip()
    cookie_id = request.cookies.get("guest_id")
    if cookie_id:
        return cookie_id.strip()
    return None

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """
    Auth rules:
    - No token -> guest id (string)
    - Valid JWT -> real user UUID (string)
    - Invalid token -> 401
    """
    if credentials is None:
        guest_id = _get_guest_id(request)
        if guest_id:
            return f"guest:{guest_id}"
        return DEV_USER_ID

    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return str(user_id)

async def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """
    Auth rules:
    - No token -> 401
    - Valid JWT -> real user UUID (string)
    - Invalid token -> 401
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return str(user_id)
