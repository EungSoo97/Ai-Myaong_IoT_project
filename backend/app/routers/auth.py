import database.alerts
import database.clips
import database.detection_logs
import database.emergency_clips
import database.feed_logs
import database.oauth2_providers
import database.pet_health_reports
import database.pets
import database.settings
import database.user_credentials
import database.user_oauth_connections
import database.water_logs
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.models.auth import (
    AuthResponse,
    GoogleAuthRequest,
    LoginRequest,
    PetResponse,
    SetCredentialsRequest,
    SignupRequest,
    UpdateMeRequest,
    UserResponse,
)
from app.services.supabase_storage import upload_image_to_supabase
from database.base import get_db
from database.oauth2_providers import OAuth2Provider
from database.pets import Pet
from database.user import User
from database.user_credentials import UserCredential
from database.user_oauth_connections import UserOAuthConnection


router = APIRouter(prefix="/api/auth", tags=["auth"])
USER_PHOTO_DIR = "user-photo"


def _username_for(user: User) -> str | None:
    return user.credential.username if user.credential else None


def _oauth_provider_for(user: User) -> str | None:
    if not user.oauth_connections:
        return None
    provider = user.oauth_connections[0].provider
    return provider.provider_name.lower() if provider else None


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        user_id=user.user_id,
        username=_username_for(user),
        email=user.email,
        nickname=user.nickname,
        oauth_provider=_oauth_provider_for(user),
        profile_photo_path=user.profile_photo_path,
        pets=[PetResponse.model_validate(p) for p in user.pets],
    )


def _current_user(authorization: str | None, db: Session) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token is required.")
    payload = decode_access_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid authorization token.")
    user = db.query(User).filter(User.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User was not found.")
    return user


def _get_or_create_provider(db: Session, provider_name: str) -> OAuth2Provider:
    normalized = provider_name.upper()
    provider = db.query(OAuth2Provider).filter(OAuth2Provider.provider_name == normalized).first()
    if provider:
        return provider

    provider = OAuth2Provider(provider_name=normalized)
    db.add(provider)
    db.flush()
    return provider


@router.get("/check-username")
def check_username(username: str, db: Session = Depends(get_db)):
    value = username.strip()
    if not value:
        raise HTTPException(status_code=400, detail="Username is required.")

    exists = db.query(UserCredential).filter(UserCredential.username == value).first()
    return {"username": value, "available": exists is None}


@router.post("/signup", response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email is already in use.")
    if db.query(UserCredential).filter(UserCredential.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username is already in use.")

    user = User(
        email=body.email,
        nickname=body.nickname,
    )
    db.add(user)
    db.flush()

    credential = UserCredential(
        user_id=user.user_id,
        username=body.username,
        password_hash=hash_password(body.password),
    )
    db.add(credential)

    for pet_data in body.pets:
        pet = Pet(
            user_id=user.user_id,
            name=pet_data.name,
            species=pet_data.species,
            breed=pet_data.breed,
            gender=pet_data.gender,
            birth_date=pet_data.birth_date,
            age=pet_data.age,
            weight_kg=pet_data.weight_kg,
            height_cm=pet_data.height_cm,
            circumference=pet_data.circumference,
            leg_length=pet_data.leg_length,
        )
        db.add(pet)

    db.commit()
    db.refresh(user)

    token = create_access_token(user.user_id, user.email)
    return AuthResponse(access_token=token, user=_to_user_response(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    credential = db.query(UserCredential).filter(UserCredential.username == body.username).first()
    if not credential or not verify_password(body.password, credential.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    user = credential.user
    token = create_access_token(user.user_id, user.email)
    return AuthResponse(access_token=token, user=_to_user_response(user))


@router.get("/me", response_model=UserResponse)
def me(authorization: str = Header(None), db: Session = Depends(get_db)):
    return _to_user_response(_current_user(authorization, db))


@router.patch("/me", response_model=UserResponse)
def update_me(body: UpdateMeRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)

    if body.nickname is not None:
        user.nickname = body.nickname
    if body.email is not None and body.email != user.email:
        if db.query(User).filter(User.email == body.email, User.user_id != user.user_id).first():
            raise HTTPException(status_code=409, detail="Email is already in use.")
        user.email = body.email

    db.commit()
    db.refresh(user)
    return _to_user_response(user)


@router.post("/me/photo", response_model=UserResponse)
def upload_me_photo(
    file: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    public_url = upload_image_to_supabase(USER_PHOTO_DIR, user.user_id, file)
    user.profile_photo_path = public_url
    db.commit()
    db.refresh(user)
    return _to_user_response(user)


@router.post("/me/credentials", response_model=UserResponse)
def set_credentials(
    body: SetCredentialsRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user = _current_user(authorization, db)
    username = body.username.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if user.credential:
        raise HTTPException(status_code=409, detail="Local login is already configured.")
    if db.query(UserCredential).filter(UserCredential.username == username).first():
        raise HTTPException(status_code=409, detail="Username is already in use.")

    credential = UserCredential(
        user_id=user.user_id,
        username=username,
        password_hash=hash_password(body.password),
    )
    db.add(credential)
    db.commit()
    db.refresh(user)
    return _to_user_response(user)


@router.delete("/me")
def delete_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = _current_user(authorization, db)
    uid = user.user_id

    Alert = database.alerts.Alert
    EmergencyClip = database.emergency_clips.EmergencyClip
    DetectionLog = database.detection_logs.DetectionLog
    FeedLog = database.feed_logs.FeedLog
    WaterLog = database.water_logs.WaterLog
    PetHealthReport = database.pet_health_reports.PetHealthReport
    Clip = database.clips.Clip
    Settings = database.settings.Settings

    # 자식 레코드부터 FK 의존 순서대로 삭제해야 Oracle FK 제약(ORA-02292)으로
    # 롤백되지 않는다. (이게 빠져 탈퇴가 실패→계정/펫이 서버에 남던 버그)
    # 실패하면 롤백하고 실제 DB 오류를 그대로 반환 → 프론트에서 원인 확인 가능.
    try:
        # 1) emergency_clips → alerts(alert_id) 를 참조하므로 먼저 삭제
        alert_ids = [row[0] for row in db.query(Alert.alert_id).filter(Alert.user_id == uid).all()]
        if alert_ids:
            db.query(EmergencyClip).filter(EmergencyClip.alert_id.in_(alert_ids)).delete(synchronize_session=False)

        # 2) user/pet 을 참조하는 알림·로그·리포트·클립·설정 (pet 보다 먼저)
        db.query(Alert).filter(Alert.user_id == uid).delete(synchronize_session=False)
        db.query(DetectionLog).filter(DetectionLog.user_id == uid).delete(synchronize_session=False)
        db.query(FeedLog).filter(FeedLog.user_id == uid).delete(synchronize_session=False)
        db.query(WaterLog).filter(WaterLog.user_id == uid).delete(synchronize_session=False)
        db.query(PetHealthReport).filter(PetHealthReport.user_id == uid).delete(synchronize_session=False)
        db.query(Clip).filter(Clip.user_id == uid).delete(synchronize_session=False)
        db.query(Settings).filter(Settings.user_id == uid).delete(synchronize_session=False)

        # 3) 펫 · OAuth 연결 · 자격증명
        db.query(UserOAuthConnection).filter(UserOAuthConnection.user_id == uid).delete(synchronize_session=False)
        db.query(UserCredential).filter(UserCredential.user_id == uid).delete(synchronize_session=False)

        # 3-1) ORM 모델에 없는 외부 테이블(DAILY_ACTIVITY_SUMMARIES: PETS·USERS 둘 다 참조)을
        #      펫/유저 삭제 전에 raw SQL 로 비운다. (없는 환경이면 ORA-00942 무시)
        for table in ("DAILY_ACTIVITY_SUMMARIES",):
            try:
                db.execute(text(f"DELETE FROM {table} WHERE user_id = :uid"), {"uid": uid})
            except Exception as ex:  # noqa: BLE001
                if "ORA-00942" not in str(ex):  # 테이블 미존재가 아니면 재발생
                    raise

        db.query(Pet).filter(Pet.user_id == uid).delete(synchronize_session=False)

        # 4) 마지막으로 유저 본체 — ORM relationship 의 FK NULL화 부작용을 피하려
        #    db.delete(user) 가 아니라 bulk 삭제 사용
        db.query(User).filter(User.user_id == uid).delete(synchronize_session=False)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"회원 탈퇴 중 DB 삭제 실패: {e}")

    return {"ok": True}


@router.post("/google", response_model=AuthResponse)
def google_login(body: GoogleAuthRequest, db: Session = Depends(get_db)):
    provider = _get_or_create_provider(db, "GOOGLE")
    connection = (
        db.query(UserOAuthConnection)
        .filter(
            UserOAuthConnection.provider_id == provider.provider_id,
            UserOAuthConnection.provider_user_id == body.oauth_id,
        )
        .first()
    )
    user = connection.user if connection else None
    is_new_user = False

    if not user:
        user = db.query(User).filter(User.email == body.email).first()
        if not user:
            if not body.allow_create:
                raise HTTPException(
                    status_code=404,
                    detail="No account is linked to this Google login. Please sign up first.",
                )
            user = User(
                email=body.email,
                nickname=body.name,
                profile_photo_path=body.picture,
            )
            db.add(user)
            db.flush()
            is_new_user = True  # 이번에 계정을 새로 만든 경우만 신규

        connection = UserOAuthConnection(
            user_id=user.user_id,
            provider_id=provider.provider_id,
            provider_user_id=body.oauth_id,
        )
        db.add(connection)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.user_id, user.email)
    return AuthResponse(access_token=token, user=_to_user_response(user), is_new_user=is_new_user)
