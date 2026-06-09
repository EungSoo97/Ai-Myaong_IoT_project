from collections import deque
from datetime import datetime, timezone
from pathlib import Path
import mimetypes
import os
import subprocess
import sys
from time import time
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


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
}

_event_seq = 0
_events = deque(maxlen=100)


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
def request_capture():
    _control_state["capture_request_id"] += 1
    _control_state["capture_requested_at"] = time()
    return {
        "ok": True,
        "capture_request_id": _control_state["capture_request_id"],
    }


@router.post("/recording")
def set_recording(payload: VisionRecordingRequest):
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
def create_event(payload: VisionEventCreate):
    global _event_seq
    _event_seq += 1
    event = {
        "id": _event_seq,
        **payload.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _events.appendleft(event)
    return event


@router.get("/events/recent")
def recent_events(limit: int = 20):
    limit = max(1, min(limit, 100))
    return {"events": list(_events)[:limit]}


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
