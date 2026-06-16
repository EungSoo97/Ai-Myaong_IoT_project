from datetime import date, datetime, timezone
import json
from pathlib import Path
import mimetypes
import os
import subprocess
import sys
from time import time
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
import database.clips  # noqa: F401
import database.daily_activity_summaries  # noqa: F401
import database.detection_logs  # noqa: F401
import database.emergency_clips  # noqa: F401
import database.feed_logs  # noqa: F401
import database.oauth2_providers  # noqa: F401
import database.pet_health_reports  # noqa: F401
import database.settings  # noqa: F401
import database.user_credentials  # noqa: F401
import database.user_oauth_connections  # noqa: F401
import database.water_logs  # noqa: F401
from database.alerts import Alert
from database.base import get_db
from database.daily_activity_summaries import DailyActivitySummary
from database.pets import Pet
from database.user import User


router = APIRouter(prefix="/api/vision", tags=["vision"])


class DetectionBox(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    w: int = Field(ge=0)
    h: int = Field(ge=0)
    label: str
    confidence: float = Field(ge=0, le=1)


class DetectionPayload(BaseModel):
    frame_width: int = Field(gt=0)
    frame_height: int = Field(gt=0)
    boxes: list[DetectionBox] = []
    source: str | None = None
    status: Literal["ok"] = "ok"


class VisionRecordingRequest(BaseModel):
    on: bool


class VisionEventCreate(BaseModel):
    type: Literal["away_person", "capture_saved", "clip_saved"]
    title: str
    message: str
    source: str | None = None
    storage_path: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class VisionActivityCreate(BaseModel):
    activity_score: float = Field(ge=0)
    status: Literal["NO_MOTION", "LOW", "NORMAL", "ACTIVE"]
    detected_seconds: float = Field(ge=0)
    window_seconds: float = Field(gt=0)


class VisionRevealRequest(BaseModel):
    path: str


PROJECT_ROOT = Path(__file__).resolve().parents[3]
ALLOWED_MEDIA_DIRS = [
    PROJECT_ROOT / "desktop" / "opencv" / "captures",
    PROJECT_ROOT / "desktop" / "opencv" / "clips",
]

_latest_detection: dict = {
    "frame_width": 0,
    "frame_height": 0,
    "boxes": [],
    "source": None,
    "status": "empty",
    "updated_at": 0.0,
}

_control_state: dict = {
    "capture_request_id": 0,
    "capture_requested_at": 0.0,
    "recording": False,
    "recording_updated_at": 0.0,
    "active_user_id": None,
}


def _current_user(authorization: str | None, db: Session) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    payload = decode_access_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


def _remember_active_user(user: User) -> None:
    _control_state["active_user_id"] = user.user_id

def _resolve_media_path(raw_path: str) -> Path:
    if not raw_path:
        raise HTTPException(status_code=400, detail="media path is required")

    path = Path(raw_path)
    if not path.is_absolute():
        path = PROJECT_ROOT / path

    resolved = path.resolve()
    allowed = False
    for directory in ALLOWED_MEDIA_DIRS:
        try:
            resolved.relative_to(directory.resolve())
            allowed = True
            break
        except ValueError:
            continue

    if not allowed:
        raise HTTPException(status_code=403, detail="media path is not allowed")
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="media file not found")

    return resolved


def _vision_alert_type(event_type: str) -> str:
    return f"vision.{event_type}"


def _event_type_from_alert(alert_type: str) -> str:
    return alert_type.removeprefix("vision.")


def _event_link(event_type: str) -> str:
    return "/vision" if event_type == "away_person" else "/activity"


def _single_pet(db: Session, user_id: int | None = None) -> Pet:
    query = db.query(Pet)
    if user_id is not None:
        query = query.filter(Pet.user_id == user_id)
    pet = query.order_by(Pet.pet_id.asc()).first()
    if not pet:
        raise HTTPException(status_code=400, detail="Pet is required before saving vision events.")
    return pet


def _alert_to_vision_event(alert: Alert) -> dict:
    try:
        data = json.loads(alert.message or "{}")
    except json.JSONDecodeError:
        data = {"desc": alert.message or ""}

    event_type = _event_type_from_alert(alert.alert_type)
    created_at = alert.created_at
    if created_at:
        created_at_text = created_at.replace(tzinfo=timezone.utc).isoformat()
    else:
        created_at_text = datetime.now(timezone.utc).isoformat()

    return {
        "id": alert.alert_id,
        "type": event_type,
        "title": data.get("title") or alert.alert_type,
        "message": data.get("desc") or data.get("message") or "",
        "source": data.get("source"),
        "storage_path": data.get("media_path") or data.get("storage_path"),
        "confidence": data.get("confidence"),
        "created_at": created_at_text,
    }


def _log_vision_event(alert: Alert, payload: VisionEventCreate) -> None:
    media = payload.storage_path or "-"
    print(
        f"[VisionEvent] type={payload.type} alert_id={alert.alert_id} "
        f"pet_id={alert.pet_id} media={media}",
        flush=True,
    )


def _active_pet(db: Session) -> Pet:
    active_user_id = _control_state.get("active_user_id")
    if active_user_id is None:
        raise HTTPException(status_code=409, detail="Active vision user is required before saving vision data.")
    return _single_pet(db, active_user_id)


@router.post("/detections")
def update_detections(payload: DetectionPayload):
    global _latest_detection
    _latest_detection = {
        **payload.model_dump(),
        "updated_at": time(),
    }
    return {"ok": True, "boxes": len(payload.boxes)}


@router.get("/detections/latest")
def latest_detections():
    return _latest_detection


@router.post("/capture")
def request_capture(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    _remember_active_user(user)
    _control_state["capture_request_id"] += 1
    _control_state["capture_requested_at"] = time()
    return {
        "ok": True,
        "capture_request_id": _control_state["capture_request_id"],
    }


@router.post("/recording")
def set_recording(payload: VisionRecordingRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    _remember_active_user(user)
    _control_state["recording"] = payload.on
    _control_state["recording_updated_at"] = time()
    return {"ok": True, "recording": _control_state["recording"]}


@router.get("/control")
def get_control_state(request: Request):
    status = request.app.state.simulator.status()
    return {
        **_control_state,
        "away_mode": bool(status.get("away_mode")),
    }


@router.post("/events")
def create_event(payload: VisionEventCreate, db: Session = Depends(get_db)):
    pet = _active_pet(db)
    message = {
        "title": payload.title,
        "desc": payload.message,
        "source": payload.source,
        "media_path": payload.storage_path,
        "storage_path": payload.storage_path,
        "confidence": payload.confidence,
        "link": _event_link(payload.type),
    }
    alert = Alert(
        user_id=pet.user_id,
        pet_id=pet.pet_id,
        alert_type=_vision_alert_type(payload.type),
        message=json.dumps(message, ensure_ascii=False),
        is_confirmed="N",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    _log_vision_event(alert, payload)
    return _alert_to_vision_event(alert)


@router.post("/activity")
def save_activity(payload: VisionActivityCreate, db: Session = Depends(get_db)):
    pet = _active_pet(db)
    summary_date = date.today()
    detected_minutes = max(1, int((payload.detected_seconds + 59) // 60))

    row = (
        db.query(DailyActivitySummary)
        .filter(
            DailyActivitySummary.pet_id == pet.pet_id,
            DailyActivitySummary.summary_date == summary_date,
        )
        .first()
    )

    if row:
        previous_minutes = row.detected_minutes or 0
        total_minutes = previous_minutes + detected_minutes
        previous_score = row.avg_activity_level or 0.0
        row.avg_activity_level = (
            (previous_score * previous_minutes) + (payload.activity_score * detected_minutes)
        ) / max(total_minutes, 1)
        row.detected_minutes = total_minutes
        row.status = payload.status
    else:
        row = DailyActivitySummary(
            user_id=pet.user_id,
            pet_id=pet.pet_id,
            summary_date=summary_date,
            avg_activity_level=payload.activity_score,
            status=payload.status,
            detected_minutes=detected_minutes,
        )
        db.add(row)

    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "summary_id": row.summary_id,
        "user_id": row.user_id,
        "pet_id": row.pet_id,
        "summary_date": row.summary_date.isoformat(),
        "avg_activity_level": row.avg_activity_level,
        "status": row.status,
        "detected_minutes": row.detected_minutes,
    }


@router.get("/events/recent")
def recent_events(limit: int = 20, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    _remember_active_user(user)
    limit = max(1, min(limit, 100))
    rows = (
        db.query(Alert)
        .filter(Alert.user_id == user.user_id, Alert.alert_type.like("vision.%"))
        .order_by(Alert.created_at.desc(), Alert.alert_id.desc())
        .limit(limit)
        .all()
    )
    return {"events": [_alert_to_vision_event(row) for row in rows]}


@router.get("/media")
def get_media(path: str = Query(...)):
    resolved = _resolve_media_path(path)
    media_type = mimetypes.guess_type(resolved.name)[0]
    return FileResponse(resolved, media_type=media_type)


@router.post("/reveal")
def reveal_media(payload: VisionRevealRequest):
    resolved = _resolve_media_path(payload.path)

    if os.name == "nt":
        subprocess.Popen(["explorer", f"/select,{resolved}"])
    else:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.Popen([opener, str(resolved.parent)])

    return {"ok": True, "path": str(resolved)}
