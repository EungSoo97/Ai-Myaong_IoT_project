import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.models.command import (
    AwayModeRequest,
    CameraRequest,
    CommandResponse,
    MoveRequest,
    RobotStatus,
    SensorUpdateRequest,
)
from app.runtime_config import runtime_env
from app.services.local_serial import LocalSerialError
from database.alerts import Alert
from database.base import get_db
from database.pets import Pet

router = APIRouter(prefix="/api/robot", tags=["robot"])

_last_rear_obstacle_alert_at = 0.0


@router.post("/move", response_model=CommandResponse)
def move_robot(payload: MoveRequest, request: Request):
    # 후방 충돌 방지: 후방 장애물이 '실시간으로' 감지된 상태면 후진(BACKWARD)을 하드 차단한다.
    # (프론트 버튼 잠금이 우회되거나 다른 클라이언트로 명령이 와도 로봇이 후진하지 않도록)
    if payload.command == "BACKWARD":
        sim = request.app.state.simulator
        last_at = getattr(sim, "sensor_updated_at", 0.0)
        fresh = last_at > 0 and (time.monotonic() - last_at) <= 5.0  # 끊긴 옛 값으로는 잠그지 않음
        # 안전 차단은 '즉시 위험(생값 기준)'으로 판정 — 필터 확정을 기다리지 않고 첫 근접에 바로 차단.
        if fresh and sim.sensor.get("rear_obstacle_immediate"):
            dist = sim.sensor.get("rear_distance_raw_cm", sim.sensor.get("rear_distance_cm"))
            raise HTTPException(
                status_code=409,
                detail=f"후방 장애물 감지로 후진이 차단되었습니다 (거리 {dist}cm)",
            )
    try:
        return request.app.state.robot_service.move(payload.command)
    except LocalSerialError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post("/camera", response_model=CommandResponse)
def move_camera(payload: CameraRequest, request: Request):
    try:
        return request.app.state.robot_service.camera(payload.direction)
    except LocalSerialError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post("/away-mode", response_model=CommandResponse)
def set_away_mode(payload: AwayModeRequest, request: Request):
    try:
        return request.app.state.robot_service.away_mode(payload.on)
    except LocalSerialError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post("/capture", response_model=CommandResponse)
def capture_snapshot(request: Request):
    try:
        return request.app.state.robot_service.capture()
    except LocalSerialError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get("/status", response_model=RobotStatus)
def robot_status(request: Request):
    return request.app.state.robot_service.status()


@router.post("/sensor")
def update_sensor(payload: SensorUpdateRequest, request: Request, db: Session = Depends(get_db)):
    status = request.app.state.simulator.update_sensor(
        distance_cm=payload.distance_cm,
        rear_obstacle=payload.rear_obstacle,
        threshold_cm=payload.threshold_cm,
        source=payload.source,
    )
    alert_created = _create_rear_obstacle_alert_if_needed(payload, db)
    return {"ok": True, "alert_created": alert_created, "sensor": status.get("sensor", {})}


@router.get("/dashboard")
def dashboard(request: Request):
    return request.app.state.robot_service.dashboard()


def _create_rear_obstacle_alert_if_needed(payload: SensorUpdateRequest, db: Session) -> bool:
    global _last_rear_obstacle_alert_at

    if not payload.rear_obstacle or payload.distance_cm is None:
        return False

    now = time.monotonic()
    cooldown = float(runtime_env("REAR_OBSTACLE_ALERT_COOLDOWN_SEC", "60"))
    if now - _last_rear_obstacle_alert_at < cooldown:
        return False

    pet = db.query(Pet).order_by(Pet.pet_id.asc()).first()
    if not pet:
        print("[robot:sensor] rear obstacle alert skipped: no pet registered")
        _last_rear_obstacle_alert_at = now
        return False

    message = {
        "title": "후방 장애물 감지",
        "desc": f"후방 장애물이 {payload.distance_cm}cm 거리에 있습니다.",
        "link": "/vision",
        "distance_cm": payload.distance_cm,
        "threshold_cm": payload.threshold_cm,
        "source": payload.source,
        "device_id": payload.device_id,
    }
    alert = Alert(
        user_id=pet.user_id,
        pet_id=pet.pet_id,
        alert_type="rear_obstacle",
        message=json.dumps(message, ensure_ascii=False),
        is_confirmed="N",
    )
    db.add(alert)
    db.commit()
    _last_rear_obstacle_alert_at = now
    print(f"[robot:sensor] rear obstacle alert created: {payload.distance_cm}cm")
    return True
