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
from app.models.auth import SignupRequest, LoginRequest, AuthResponse, UserResponse, PetResponse, GoogleAuthRequest, UpdateMeRequest
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


@router.patch("/me", response_model=UserResponse)
def update_me(body: UpdateMeRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 없습니다.")
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user = db.query(User).filter(User.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if body.nickname is not None:
        user.nickname = body.nickname
    if body.email is not None and body.email != user.email:
        # 이메일 중복 검사
        if db.query(User).filter(User.email == body.email, User.user_id != user.user_id).first():
            raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")
        user.email = body.email

    db.commit()
    db.refresh(user)

    return UserResponse(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        nickname=user.nickname,
        oauth_provider=user.oauth_provider,
        pets=[PetResponse.model_validate(p) for p in user.pets],
    )


@router.delete("/me")
def delete_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 없습니다.")
    payload = decode_access_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user = db.query(User).filter(User.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # 연결된 펫 먼저 삭제 (FK) → 유저 삭제
    db.query(Pet).filter(Pet.user_id == user.user_id).delete()
    db.delete(user)
    db.commit()
    return {"ok": True}


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
            # 로그인 흐름(allow_create=False)인데 계정이 없으면 → 회원가입으로 유도
            if not body.allow_create:
                raise HTTPException(
                    status_code=404,
                    detail="가입된 계정이 없어요. 회원가입을 먼저 진행해 주세요.",
                )
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