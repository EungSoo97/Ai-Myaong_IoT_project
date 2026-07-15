import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.mqtt.mqtt_client import MqttClient
from app.routers import (
    alerts,
    auth,
    device,
    feed,
    health_reports,
    network,
    pets,
    robot,
    settings,
    stream,
    vision,
    ws,
)
from app.services.database import Database
from app.services.feed_service import FeedService
from app.services.retention import cleanup_old_records
from app.services.robot_service import RobotService
from app.services.simulator import DeviceSimulator

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


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
    allow_origins=cors_origins,
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


def _handle_sensor_message(payload: dict) -> None:
    # 파이가 뿌리는 후방 센서값을 MQTT로 직접 받는다. HTTP POST(/api/robot/sensor)는
    # announce로 '선택된' 백엔드 한 대만 받지만, 이 경로는 브로커에 붙은 모든 백엔드가
    # 동시에 받는다. 알림 저장은 HTTP 경로에만 남겨 백엔드마다 중복 생성되지 않게 한다.
    simulator.update_sensor(
        distance_cm=payload.get("distance_cm"),
        rear_obstacle=payload.get("rear_obstacle"),
        threshold_cm=payload.get("threshold_cm"),
        source=payload.get("source"),
    )


mqtt_client.on_topic("ai-myaong/robot/sensor", _handle_sensor_message)

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

    from app.services.backend_announcer import start_backend_announcer

    start_backend_announcer(mqtt_client)
    database.log_event("system", "FastAPI server started", simulator.status())

    if env_bool("FEED_SCHEDULER_ENABLED", False):
        from app.services.feed_scheduler import start_feed_scheduler

        thread = start_feed_scheduler(app.state.feed_service)
        if thread is None:
            print("[FeedScheduler] skipped: another local scheduler is already running", flush=True)
        else:
            print("[FeedScheduler] started", flush=True)
    else:
        print("[FeedScheduler] disabled by FEED_SCHEDULER_ENABLED", flush=True)


@app.on_event("shutdown")
def shutdown() -> None:
    mqtt_client.stop()


@app.get("/")
def health():
    return {"name": "Ai-Myaong", "status": "ok", "simulation": mqtt_client.simulation_mode}
