from typing import Any, Literal
from pydantic import BaseModel, Field


MoveCommand = Literal["FORWARD", "BACKWARD", "LEFT", "RIGHT", "STOP"]
CameraCommand = Literal["CAM_UP", "CAM_DOWN", "CAM_LEFT", "CAM_RIGHT", "CAM_CENTER"]


class MoveRequest(BaseModel):
    command: MoveCommand


class CameraRequest(BaseModel):
    direction: CameraCommand


class FeedRequest(BaseModel):
    amount: int = Field(default=1, ge=1, le=20)


class WaterRequest(BaseModel):
    amount: int = Field(default=1, ge=1, le=20)


class CommandResponse(BaseModel):
    request_id: str
    status: str
    topic: str
    payload: dict[str, Any]
    simulated: bool = True


class RobotStatus(BaseModel):
    connected: bool
    battery: int
    mode: str
    last_command: str | None = None
    position: dict[str, int]
    camera: dict[str, int]
    dispenser: dict[str, int | bool]
    sensor: dict[str, int | bool]
    updated_at: str
