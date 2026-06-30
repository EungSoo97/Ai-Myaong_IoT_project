from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.models.command import CommandResponse, FeedRequest, WaterRequest
from database.base import get_db
from database.user import User
from database.pets import Pet
from database.feed_logs import FeedLog
from database.time_utils import kst_iso, now_kst_naive
from database.water_logs import WaterLog

router = APIRouter(prefix="/api/dispenser", tags=["dispenser"])


@router.post("/feed", response_model=CommandResponse)
def feed(payload: FeedRequest, request: Request):
    return request.app.state.feed_service.feed(payload.amount)


@router.post("/water", response_model=CommandResponse)
def water(payload: WaterRequest, request: Request):
    return request.app.state.feed_service.water(payload.amount)


# ── 배식/급수 기록 (기존 FEED_LOGS / WATER_LOGS 테이블에 저장) ──

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


def _resolve_pet_id(user: User, pet_id: Optional[int], db: Session) -> int:
    # pet_id 가 주어지면 본인 펫인지 확인, 없으면 첫 펫으로
    if pet_id:
        pet = db.query(Pet).filter(Pet.pet_id == pet_id, Pet.user_id == user.user_id).first()
    else:
        pet = db.query(Pet).filter(Pet.user_id == user.user_id).first()
    if not pet:
        raise HTTPException(status_code=400, detail="등록된 반려동물이 없어 기록할 수 없습니다.")
    return pet.pet_id


def _minute_window():
    start = now_kst_naive().replace(second=0, microsecond=0)
    return start, start + timedelta(minutes=1)


def _find_auto_feed_log_this_minute(db: Session, user_id: int, pet_id: int):
    minute_start, minute_end = _minute_window()
    return (
        db.query(FeedLog)
        .filter(
            FeedLog.user_id == user_id,
            FeedLog.pet_id == pet_id,
            FeedLog.feed_type == "auto",
            FeedLog.created_at >= minute_start,
            FeedLog.created_at < minute_end,
        )
        .first()
    )


def _find_auto_water_log_this_minute(db: Session, user_id: int, pet_id: int):
    minute_start, minute_end = _minute_window()
    return (
        db.query(WaterLog)
        .filter(
            WaterLog.user_id == user_id,
            WaterLog.pet_id == pet_id,
            WaterLog.water_type == "auto",
            WaterLog.created_at >= minute_start,
            WaterLog.created_at < minute_end,
        )
        .first()
    )


class FeedLogCreate(BaseModel):
    amount_g: float
    feed_type: str = "manual"   # manual | auto | quick
    pet_id: Optional[int] = None


class WaterLogCreate(BaseModel):
    amount_ml: float
    water_type: str = "manual"
    pet_id: Optional[int] = None


@router.post("/feed-log")
def create_feed_log(body: FeedLogCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    pet_id = _resolve_pet_id(user, body.pet_id, db)
    if body.feed_type == "auto":
        existing = _find_auto_feed_log_this_minute(db, user.user_id, pet_id)
        if existing:
            return {
                "feed_id": existing.feed_id,
                "pet_id": existing.pet_id,
                "food_amount_g": existing.food_amount_g,
                "feed_type": existing.feed_type,
            }

    log = FeedLog(
        user_id=user.user_id,
        pet_id=pet_id,
        food_amount_g=body.amount_g,
        feed_type=body.feed_type,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "feed_id": log.feed_id,
        "pet_id": log.pet_id,
        "food_amount_g": log.food_amount_g,
        "feed_type": log.feed_type,
    }


@router.post("/water-log")
def create_water_log(body: WaterLogCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    pet_id = _resolve_pet_id(user, body.pet_id, db)
    if body.water_type == "auto":
        existing = _find_auto_water_log_this_minute(db, user.user_id, pet_id)
        if existing:
            return {
                "water_log_id": existing.water_log_id,
                "pet_id": existing.pet_id,
                "water_amount_ml": existing.water_amount_ml,
                "water_type": existing.water_type,
            }

    log = WaterLog(
        user_id=user.user_id,
        pet_id=pet_id,
        water_amount_ml=body.amount_ml,
        water_type=body.water_type,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "water_log_id": log.water_log_id,
        "pet_id": log.pet_id,
        "water_amount_ml": log.water_amount_ml,
        "water_type": log.water_type,
    }


@router.get("/logs")
def list_logs(days: int = 400, authorization: str = Header(None), db: Session = Depends(get_db)):
    """현재 유저의 배식/급수 기록을 서울 시간으로 반환."""
    user = _current_user(authorization, db)
    since = now_kst_naive() - timedelta(days=days)

    feeds = (
        db.query(FeedLog)
        .filter(FeedLog.user_id == user.user_id, FeedLog.created_at >= since)
        .order_by(FeedLog.created_at.asc())
        .all()
    )
    waters = (
        db.query(WaterLog)
        .filter(WaterLog.user_id == user.user_id, WaterLog.created_at >= since)
        .order_by(WaterLog.created_at.asc())
        .all()
    )

    return {
        "feed": [
            {"amount_g": f.food_amount_g, "feed_type": f.feed_type, "created_at": kst_iso(f.created_at)}
            for f in feeds
        ],
        "water": [
            {"amount_ml": w.water_amount_ml, "water_type": w.water_type, "created_at": kst_iso(w.created_at)}
            for w in waters
        ],
    }
