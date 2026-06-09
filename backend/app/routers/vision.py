from collections import deque
from datetime import datetime, timezone
from time import time
from typing import Literal

from fastapi import APIRouter, Request
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
