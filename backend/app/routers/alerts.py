"""알림(alerts) DB 연동 라우터.

프론트의 알림을 ALERTS 테이블에 저장/조회한다.
message 컬럼(VARCHAR 500)에는 프론트가 {title, desc, link} 를 JSON 문자열로 담아
완전 복원이 가능하다. (백엔드는 문자열 그대로 저장/반환)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

# ORM 매퍼 관계 해석을 위해 관련 모델 등록
import database.clips  # noqa: F401
import database.detection_logs  # noqa: F401
import database.emergency_clips  # noqa: F401
import database.feed_logs  # noqa: F401
import database.pet_health_reports  # noqa: F401
import database.settings  # noqa: F401
import database.user_credentials  # noqa: F401
import database.user_oauth_connections  # noqa: F401
import database.water_logs  # noqa: F401
from app.core.security import decode_access_token
from database.alerts import Alert
from database.base import get_db
from database.pets import Pet
from database.user import User

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _current_user(authorization: Optional[str], db: Session) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    payload = decode_access_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    user = db.query(User).filter(User.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


def _first_pet_id(user: User, db: Session) -> int:
    pet = db.query(Pet).filter(Pet.user_id == user.user_id).first()
    if not pet:
        raise HTTPException(status_code=400, detail="등록된 반려동물이 없어 알림을 저장할 수 없습니다.")
    return pet.pet_id


class AlertCreate(BaseModel):
    alert_type: str
    message: Optional[str] = None


class AlertResponse(BaseModel):
    alert_id: int
    alert_type: str
    message: Optional[str] = None
    is_confirmed: str = "N"
    created_at: Optional[str] = None


def _to_response(a: Alert) -> AlertResponse:
    return AlertResponse(
        alert_id=a.alert_id,
        alert_type=a.alert_type,
        message=a.message,
        is_confirmed=a.is_confirmed or "N",
        created_at=(a.created_at.isoformat() + "Z") if a.created_at else None,
    )


@router.get("", response_model=List[AlertResponse])
def list_alerts(limit: int = 100, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    rows = (
        db.query(Alert)
        .filter(Alert.user_id == user.user_id)
        .order_by(Alert.created_at.desc(), Alert.alert_id.desc())
        .limit(limit)
        .all()
    )
    return [_to_response(a) for a in rows]


@router.post("", response_model=AlertResponse)
def create_alert(body: AlertCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    pet_id = _first_pet_id(user, db)
    alert = Alert(
        user_id=user.user_id,
        pet_id=pet_id,
        alert_type=body.alert_type,
        message=body.message,
        is_confirmed="N",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _to_response(alert)


@router.delete("")
def delete_all(authorization: str = Header(None), db: Session = Depends(get_db)):
    """내 알림 전체 삭제."""
    user = _current_user(authorization, db)
    db.query(Alert).filter(Alert.user_id == user.user_id).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.patch("/confirm-all")
def confirm_all(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    db.query(Alert).filter(Alert.user_id == user.user_id, Alert.is_confirmed != "Y").update(
        {Alert.is_confirmed: "Y"}, synchronize_session=False
    )
    db.commit()
    return {"ok": True}


@router.patch("/{alert_id}/confirm")
def confirm_alert(alert_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    alert = db.query(Alert).filter(Alert.alert_id == alert_id, Alert.user_id == user.user_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
    alert.is_confirmed = "Y"
    db.commit()
    return {"ok": True}


@router.delete("/{alert_id}")
def delete_alert(alert_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    db.query(Alert).filter(Alert.alert_id == alert_id, Alert.user_id == user.user_id).delete()
    db.commit()
    return {"ok": True}
