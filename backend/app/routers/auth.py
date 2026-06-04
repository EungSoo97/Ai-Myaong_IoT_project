from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.auth import SignupRequest, LoginRequest, AuthResponse, UserResponse
from database.base import get_db
from database.user import User
from database.pets import Pet

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    user = User(
        email=body.email,
        password=hash_password(body.password),
    )
    db.add(user)
    db.flush()  # user_id 획득

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
        user=UserResponse(user_id=user.user_id, email=user.email, nickname=user.email),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(user.user_id, user.email)
    return AuthResponse(
        access_token=token,
        user=UserResponse(user_id=user.user_id, email=user.email, nickname=user.email),
    )


@router.get("/me", response_model=UserResponse)
def me(token: str, db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user = db.query(User).filter(User.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return UserResponse(user_id=user.user_id, email=user.email, nickname=user.email)

# 참고: USERS 테이블에 nickname 컬럼 없어서 지금은 email을 nickname으로 대신 쓴다. 나중에 컬럼 추가하면 교체하면 됨.