import database.robot_devices
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.models.robot_devices import (
    RobotDeviceClaimRequest,
    RobotDeviceGrantMemberRequest,
    RobotDeviceListResponse,
    RobotDeviceMemberResponse,
    RobotDeviceMembersResponse,
    RobotDeviceResponse,
)
from database.base import get_db
from database.robot_devices import RobotDevice, RobotDeviceMember
from database.user import User


router = APIRouter(prefix="/api/robot-devices", tags=["robot-devices"])


def get_current_user_id(authorization: str = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token is required.")

    payload = decode_access_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid authorization token.")
    return int(payload["sub"])


def _device_response(device: RobotDevice, role: str) -> RobotDeviceResponse:
    return RobotDeviceResponse(
        device_id=device.device_id,
        robot_serial=device.robot_serial,
        role=role,
        is_active=device.is_active,
    )


def _owner_device_or_403(db: Session, user_id: int, robot_serial: str) -> RobotDevice:
    device = (
        db.query(RobotDevice)
        .filter(RobotDevice.robot_serial == robot_serial)
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Registered robot serial was not found.")
    if device.owner_user_id != user_id:
        raise HTTPException(status_code=403, detail="Only the robot owner can manage members.")
    return device


def _member_response(user: User, role: str) -> RobotDeviceMemberResponse:
    return RobotDeviceMemberResponse(
        user_id=user.user_id,
        email=user.email,
        nickname=user.nickname,
        role=role,
    )


@router.post("/claim", response_model=RobotDeviceResponse)
def claim_robot_device(
    body: RobotDeviceClaimRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    device = (
        db.query(RobotDevice)
        .filter(RobotDevice.robot_serial == body.robot_serial)
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Registered robot serial was not found.")
    if device.is_active != "Y":
        raise HTTPException(status_code=403, detail="This robot device is disabled.")

    if device.owner_user_id and device.owner_user_id != user_id:
        raise HTTPException(status_code=409, detail="This robot device is already registered.")

    device.owner_user_id = user_id

    member = (
        db.query(RobotDeviceMember)
        .filter(
            RobotDeviceMember.device_id == device.device_id,
            RobotDeviceMember.user_id == user_id,
        )
        .first()
    )
    if not member:
        member = RobotDeviceMember(
            device_id=device.device_id,
            user_id=user_id,
            role="OWNER",
        )
        db.add(member)
    else:
        member.role = "OWNER"

    db.commit()
    db.refresh(device)
    return _device_response(device, "OWNER")


@router.get("/me", response_model=RobotDeviceListResponse)
def list_my_robot_devices(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(RobotDevice, RobotDeviceMember.role)
        .join(RobotDeviceMember, RobotDeviceMember.device_id == RobotDevice.device_id)
        .filter(RobotDeviceMember.user_id == user_id)
        .all()
    )
    return RobotDeviceListResponse(
        devices=[_device_response(device, role) for device, role in rows]
    )


@router.get("/{robot_serial}/members", response_model=RobotDeviceMembersResponse)
def list_robot_device_members(
    robot_serial: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    device = _owner_device_or_403(db, user_id, robot_serial.strip().upper())
    rows = (
        db.query(User, RobotDeviceMember.role)
        .join(RobotDeviceMember, RobotDeviceMember.user_id == User.user_id)
        .filter(RobotDeviceMember.device_id == device.device_id)
        .order_by(RobotDeviceMember.role.asc(), User.email.asc())
        .all()
    )
    return RobotDeviceMembersResponse(
        members=[_member_response(user, role) for user, role in rows]
    )


@router.post("/members/grant", response_model=RobotDeviceMemberResponse)
def grant_robot_device_member(
    body: RobotDeviceGrantMemberRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    device = _owner_device_or_403(db, user_id, body.robot_serial)
    target_user = db.query(User).filter(User.email == body.user_email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User was not found.")
    if target_user.user_id == user_id:
        raise HTTPException(status_code=400, detail="Owner already has access.")

    member = (
        db.query(RobotDeviceMember)
        .filter(
            RobotDeviceMember.device_id == device.device_id,
            RobotDeviceMember.user_id == target_user.user_id,
        )
        .first()
    )
    if not member:
        member = RobotDeviceMember(
            device_id=device.device_id,
            user_id=target_user.user_id,
            role="MEMBER",
        )
        db.add(member)
    else:
        member.role = "MEMBER"

    db.commit()
    return _member_response(target_user, "MEMBER")
