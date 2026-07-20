from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from database.base import get_db
from database.robot_devices import RobotDevice, RobotDeviceMember


def current_user_id(authorization: str | None = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token is required.")

    payload = decode_access_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid authorization token.")
    return int(payload["sub"])


def require_robot_device_access(
    user_id: int = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> int:
    owned_device = (
        db.query(RobotDevice)
        .filter(
            RobotDevice.owner_user_id == user_id,
            RobotDevice.is_active == "Y",
        )
        .first()
    )
    if owned_device:
        return user_id

    member_device = (
        db.query(RobotDeviceMember)
        .join(RobotDevice, RobotDevice.device_id == RobotDeviceMember.device_id)
        .filter(
            RobotDeviceMember.user_id == user_id,
            RobotDevice.is_active == "Y",
        )
        .first()
    )
    if member_device:
        return user_id

    raise HTTPException(status_code=403, detail="Robot device access is required.")
