import database.alerts
import database.clips
import database.detection_logs
import database.emergency_clips
import database.feed_logs
import database.pet_health_reports
import database.settings
import database.water_logs
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.auth import SignupRequest, LoginRequest, AuthResponse, UserResponse, PetResponse, GoogleAuthRequest
from database.base import get_db
from database.user import User
from database.pets import Pet


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")

    user = User(
        username=body.username,
        email=body.email,
        password=hash_password(body.password),
        nickname=body.nickname,
    )
    db.add(user)
    db.flush()

    for pet_data in body.pets:
        pet = Pet(
            user_id=user.user_id,
            name=pet_data.name,
            species=pet_data.species,
            breed=pet_data.breed,
            gender=pet_data.gender,
            birth_date=pet_data.birth_date,
            weight_kg=pet_data.weight_kg,
            height_cm=pet_data.height_cm,
            circumference=pet_data.circumference,
            leg_length=pet_data.leg_length,
        )
        db.add(pet)

    db.commit()
    db.refresh(user)

    token = create_access_token(user.user_id, user.email)
    return AuthResponse(
        access_token=token,
        user=UserResponse(user_id=user.user_id, username=user.username, email=user.email, nickname=user.nickname),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not user.password or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(user.user_id, user.email)
    return AuthResponse(
        access_token=token,
        user=UserResponse(user_id=user.user_id, username=user.username, email=user.email, nickname=user.nickname),
    )


@router.get("/me", response_model=UserResponse)
def me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 없습니다.")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user = db.query(User).filter(User.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return UserResponse(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        nickname=user.nickname,
        oauth_provider=user.oauth_provider,
        pets=[PetResponse.model_validate(p) for p in user.pets],
    )


@router.post("/google", response_model=AuthResponse)
def google_login(body: GoogleAuthRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.oauth_id == body.oauth_id).first()

    if not user:
        user = db.query(User).filter(User.email == body.email).first()
        if user:
            user.oauth_provider = "google"
            user.oauth_id = body.oauth_id
            db.commit()
        else:
            user = User(
                email=body.email,
                nickname=body.name,
                oauth_provider="google",
                oauth_id=body.oauth_id,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    token = create_access_token(user.user_id, user.email)
    return AuthResponse(
        access_token=token,
        user=UserResponse(user_id=user.user_id, username=user.username, email=user.email, nickname=user.nickname),
    )