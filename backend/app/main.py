import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.mqtt.mqtt_client import MqttClient
from app.routers import feed, network, robot, stream, ws
from app.services.database import Database
from app.services.feed_service import FeedService
from app.services.robot_service import RobotService
from app.services.simulator import DeviceSimulator

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="Ai-Myaong Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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


@app.on_event("startup")
def startup() -> None:
    database.init()
    mqtt_client.start()
    database.log_event("system", "FastAPI 서버 시작", simulator.status())


@app.on_event("shutdown")
def shutdown() -> None:
    mqtt_client.stop()


@app.get("/")
def health():
    return {"name": "Ai-Myaong", "status": "ok", "simulation": mqtt_client.simulation_mode}
