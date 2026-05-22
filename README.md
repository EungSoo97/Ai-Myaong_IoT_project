# Ai-Myaong

Ai-Myaong is split into two mostly independent systems:

- Remote robot: React/FastAPI -> MQTT -> Raspberry Pi -> serial robot controller
- Dispenser: React/FastAPI -> MQTT -> standalone ESP32 dispenser

The backend simulator can still process commands even without the real Raspberry Pi, robot controller, camera, or ESP32 hardware.

## Folder Layout

- `backend/`: FastAPI API, MQTT publishing, and simulator logic
- `frontend/`: React + Vite web UI
- `desktop/`: desktop MJPEG/OpenCV worker and MQTT robot publisher
- `raspberrypi/`: MJPEG camera service and serial bridge
- `arduino-uno/`: Arduino Uno robot controller sketch
- `esp32/`: ESP32 sketches, including the dispenser device
- `docs/`: notes for architecture, APIs, and hardware
- `scripts/`: helper scripts for local startup

## Robot Flow

1. Raspberry Pi serves the Pi camera stream as MJPEG.
2. The desktop worker receives the stream and runs OpenCV or other vision logic.
3. The desktop worker or web UI decides robot movement.
4. Commands are published to MQTT.
5. Raspberry Pi subscribes to robot topics and forwards serial commands.
6. Arduino Uno drives crawler motors and pan/tilt servos.

## Dispenser Flow

1. The web UI sends feed or water requests to the backend.
2. The backend publishes MQTT messages to dispenser topics.
3. The standalone ESP32 dispenser receives commands and actuates food or water hardware.

## Windows `cmd` Quick Start

### Backend

```cmd
cd /d C:\Users\soldesk\Desktop\Ai-Myaong\backend
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```cmd
cd /d C:\Users\soldesk\Desktop\Ai-Myaong\frontend
npm install
npm run dev
```

### Desktop Worker

```cmd
cd /d C:\Users\soldesk\Desktop\Ai-Myaong\desktop
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
python main.py
```

### Raspberry Pi Agent Local Test

```cmd
cd /d C:\Users\soldesk\Desktop\Ai-Myaong\raspberrypi
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
python main.py
```
