import json

import database.alerts
import database.clips
import database.detection_logs
import database.emergency_clips
import database.feed_logs
import database.pet_health_reports
import database.oauth2_providers
import database.user_credentials
import database.user_oauth_connections
import database.water_logs
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.models.settings import SettingsResponse, SettingsUpdate
from database.base import get_db
from database.user import User
from database.settings import Settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _normalize_schedule(raw: str | None) -> str | None:
    if raw is None:
        return None

    try:
        items = json.loads(raw or "[]")
    except Exception:
        return "[]"
    if not isinstance(items, list):
        return "[]"

    by_time = {}
    for item in items:
        if not isinstance(item, dict):
            continue

        schedule_time = str(item.get("time") or "").strip()
        if not schedule_time:
            continue

        try:
            amount = float(item.get("amount") or 0)
        except (TypeError, ValueError):
            continue
        if amount <= 0:
            continue

        by_time[schedule_time] = {
            "time": schedule_time,
            "amount": int(amount) if amount.is_integer() else amount,
            "on": item.get("on") is not False,
        }

    normalized = [by_time[key] for key in sorted(by_time)]
    return json.dumps(normalized, ensure_ascii=False, separators=(",", ":"))


def _normalize_settings_schedules(settings: Settings, db: Session) -> Settings:
    changed = False
    for field in ("feed_schedule", "water_schedule"):
        raw = getattr(settings, field)
        normalized = _normalize_schedule(raw)
        if raw != normalized:
            setattr(settings, field, normalized)
            changed = True

    if changed:
        db.commit()
        db.refresh(settings)
    return settings


def get_current_user_id(authorization: str = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 없습니다.")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return int(payload["sub"])


@router.get("", response_model=SettingsResponse)
def get_settings(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings:
        settings = Settings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return _normalize_settings_schedules(settings, db)


@router.put("", response_model=SettingsResponse)
def update_settings(
    body: SettingsUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings:
        settings = Settings(user_id=user_id)
        db.add(settings)
        db.flush()

    updates = body.model_dump(exclude_none=True)
    if "feed_schedule" in updates:
        updates["feed_schedule"] = _normalize_schedule(updates["feed_schedule"])
    if "water_schedule" in updates:
        updates["water_schedule"] = _normalize_schedule(updates["water_schedule"])

    for field, value in updates.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings
