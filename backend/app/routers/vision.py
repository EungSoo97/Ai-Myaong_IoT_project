from time import time
from typing import Literal

from fastapi import APIRouter
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
def get_control_state():
    return _control_state
