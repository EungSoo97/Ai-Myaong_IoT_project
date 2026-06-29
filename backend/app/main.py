import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import device, feed, network, robot, stream, ws, auth, settings, pets, vision, alerts,health_reports
from app.mqtt.mqtt_client import MqttClient
from app.services.database import Database
from app.services.feed_service import FeedService
from app.services.retention import cleanup_old_records
from app.services.robot_service import RobotService
from app.services.simulator import DeviceSimulator

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Ai-Myaong Backend", version="0.1.0")

default_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", ",".join(default_cors_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+):(?:3000|5173)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

database = Database(os.getenv("DATABASE_PATH", "./backend/aimyaong.sqlite3"))
mqtt_client = MqttClient()
simulator = DeviceSimulator()

app.state.database = database
app.state.mqtt_client = mqtt_client
app.state.simulator = simulator
app.state.robot_service = RobotService(mqtt_client, database, simulator)
app.state.feed_service = FeedService(mqtt_client, database, simulator)

app.include_router(robot.router)
app.include_router(feed.router)
app.include_router(stream.router)
app.include_router(ws.router)  
app.include_router(network.router)
app.include_router(auth.router)
app.include_router(pets.router)
app.include_router(health_reports.router)
app.include_router(settings.router)
app.include_router(alerts.router)
app.include_router(device.router)
app.include_router(vision.router)


@app.on_event("startup")
def startup() -> None:
    database.init()
    try:
        cleanup_old_records()
    except Exception as error:
        print(f"[Retention] cleanup skipped: {error}", flush=True)
    mqtt_client.start()
    database.log_event("system", "FastAPI 서버 시작", simulator.status())
    # 자동 배식/급수 스케줄러 시작 (settings.feed_schedule / water_schedule 기반)
    # ⚠️ 여러 기계(PC 백엔드 + 라즈베리파이)가 같은 DB에 붙으면 스케줄러가 중복 실행되어
    #    한 번 예약에 N번 배식/기록된다. → 스케줄러는 '한 곳'에서만 돌려야 한다.
    #    스케줄러를 끌 기계의 .env 에  RUN_FEED_SCHEDULER=false  를 넣으면 그 기계는 실행 안 함.
    import os
    if os.getenv("RUN_FEED_SCHEDULER", "true").strip().lower() not in ("false", "0", "no"):
        from app.services.feed_scheduler import start_feed_scheduler
        start_feed_scheduler(app.state.feed_service)
        print("[feed-scheduler] 시작됨 (이 기계에서 자동 배식 스케줄 실행)", flush=True)
    else:
        print("[feed-scheduler] RUN_FEED_SCHEDULER=false → 이 기계에서는 스케줄러 비활성", flush=True)


@app.on_event("shutdown")
def shutdown() -> None:
    mqtt_client.stop()


@app.get("/")
def health():
    return {"name": "Ai-Myaong", "status": "ok", "simulation": mqtt_client.simulation_mode}
