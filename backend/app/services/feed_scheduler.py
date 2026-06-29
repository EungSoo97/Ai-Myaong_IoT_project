"""자동 배식/급수 스케줄러.

settings.feed_schedule / water_schedule 에 저장된 일정(JSON)을 매 분 검사해서,
현재 시각(HH:MM)과 일치하고 on=true 인 항목이 있으면:
  1) 기기에 배식/급수 명령(MQTT) 시도
  2) FEED_LOGS / WATER_LOGS 에 기록 (feed_type/water_type = "auto")
을 수행한다. HTTP 의 amount<=20 제한과 무관하게 동작한다(서버측 직접 처리).

별도 의존성 없이 데몬 스레드 + 분 단위 체크로 구현.
"""

import json
import socket
import threading
import time

# ORM 매퍼가 관계(User/Pet 등)를 해석하도록 관련 모델을 모두 등록
import database.alerts  # noqa: F401
import database.clips  # noqa: F401
import database.detection_logs  # noqa: F401
import database.emergency_clips  # noqa: F401
import database.oauth2_providers  # noqa: F401
import database.pet_health_reports  # noqa: F401
import database.user  # noqa: F401
import database.user_credentials  # noqa: F401
import database.user_oauth_connections  # noqa: F401
from database.base import SessionLocal
from database.feed_logs import FeedLog
from database.pets import Pet
from database.settings import Settings
from database.time_utils import now_kst_naive
from database.water_logs import WaterLog


def _parse(raw):
    try:
        arr = json.loads(raw or "[]")
        return arr if isinstance(arr, list) else []
    except Exception:
        return []


def _first_pet_id(db, user_id):
    pet = db.query(Pet).filter(Pet.user_id == user_id).first()
    return pet.pet_id if pet else None


def _run_once(feed_service, hhmm):
    """현재 분(hhmm)과 일치하는 on=true 스케줄을 배식/급수 + DB 기록."""
    if SessionLocal is None:
        return
    db = SessionLocal()
    try:
        for s in db.query(Settings).all():
            pet_id = None  # 필요할 때 한 번만 조회

            for item in _parse(s.feed_schedule):
                if item.get("on", True) and str(item.get("time")) == hhmm:
                    amount = float(item.get("amount") or 0)
                    if amount <= 0:
                        continue
                    if feed_service:
                        try:
                            feed_service.feed(int(round(amount)))
                        except Exception:
                            pass
                    if pet_id is None:
                        pet_id = _first_pet_id(db, s.user_id)
                    if pet_id:
                        db.add(FeedLog(user_id=s.user_id, pet_id=pet_id, food_amount_g=amount, feed_type="auto"))

            for item in _parse(s.water_schedule):
                if item.get("on", True) and str(item.get("time")) == hhmm:
                    amount = float(item.get("amount") or 0)
                    if amount <= 0:
                        continue
                    if feed_service:
                        try:
                            feed_service.water(int(round(amount)))
                        except Exception:
                            pass
                    if pet_id is None:
                        pet_id = _first_pet_id(db, s.user_id)
                    if pet_id:
                        db.add(WaterLog(user_id=s.user_id, pet_id=pet_id, water_amount_ml=amount, water_type="auto"))

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


_scheduler_thread = None  # 같은 프로세스 내 중복 시작 방지
_lock_socket = None       # 프로세스 간 단일 실행 락 (소켓 점유 = 락 보유)
_SCHED_LOCK_PORT = 8771   # 스케줄러 싱글톤 락 전용 포트 (서비스 포트 아님)


def _acquire_singleton_lock() -> bool:
    """프로세스 간 단일 스케줄러 보장.
    고정 포트에 bind 성공한 1개 프로세스만 스케줄러를 돌린다.
    (uvicorn --reload 가 만드는 여러 프로세스 중복 실행 차단. 프로세스 종료 시 OS가 포트 자동 해제)."""
    global _lock_socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", _SCHED_LOCK_PORT))
        s.listen(1)
        _lock_socket = s  # 프로세스 살아있는 동안 점유 유지
        return True
    except OSError:
        s.close()
        return False  # 이미 다른 프로세스가 스케줄러 실행 중


def start_feed_scheduler(feed_service=None):
    """매 분 정각 근처에 스케줄을 검사하는 백그라운드 데몬 스레드 시작.
    같은 프로세스에서 이미 실행 중이거나, 다른 프로세스가 락을 쥐고 있으면 새로 만들지 않는다."""
    global _scheduler_thread
    if _scheduler_thread is not None and _scheduler_thread.is_alive():
        return _scheduler_thread
    if not _acquire_singleton_lock():
        return None  # 다른 프로세스가 이미 스케줄러를 돌리는 중 → 중복 실행 방지

    def loop():
        last = None
        while True:
            hhmm = now_kst_naive().strftime("%H:%M")
            if hhmm != last:  # 같은 분에 중복 실행 방지
                last = hhmm
                try:
                    _run_once(feed_service, hhmm)
                except Exception:
                    pass
            time.sleep(20)  # 분 경계를 놓치지 않도록 20초마다 확인

    thread = threading.Thread(target=loop, daemon=True, name="feed-scheduler")
    thread.start()
    _scheduler_thread = thread
    return thread
