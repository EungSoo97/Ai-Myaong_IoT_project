"""
Lightweight vision worker for frontend overlay work.

Current step:
- Read frames from Raspberry Pi MJPEG stream or local camera.
- Run YOLO object detection.
- Draw only object bounding boxes in a preview window.

Next step:
- Send detected box coordinates to the backend for frontend overlay.
"""

import os
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
import requests
from dotenv import load_dotenv
from ultralytics import YOLO


ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
MODEL_PATH = Path(__file__).with_name("yolov8n.pt")
CAPTURE_DIR = Path(__file__).with_name("captures")
CLIP_DIR = Path(__file__).with_name("clips")

load_dotenv(ENV_PATH)
CAPTURE_DIR.mkdir(exist_ok=True)
CLIP_DIR.mkdir(exist_ok=True)

DEFAULT_CLASS_LABELS = {
    0: "Person",
    15: "Cat",
    16: "Dog",
}


def resolve_capture_source():
    source = os.getenv("MJPEG_STREAM_URL") or os.getenv("CAMERA_SOURCE") or "0"
    source = source.strip()
    return int(source) if source.isdigit() else source


def resolve_backend_url():
    return os.getenv("BACKEND_API_URL", "http://127.0.0.1:8000").strip().rstrip("/")


def resolve_model_path():
    if MODEL_PATH.exists():
        return str(MODEL_PATH)
    return "yolov8n.pt"


def resolve_class_filter():
    raw = os.getenv("VISION_CLASSES", "0,15,16").strip()
    if not raw:
        return set(DEFAULT_CLASS_LABELS)

    class_ids = set()
    for item in raw.split(","):
        item = item.strip()
        if item:
            class_ids.add(int(item))
    return class_ids


def mjpeg_frame_generator(url):
    buffer = b""
    response = requests.get(url, stream=True, timeout=10)
    response.raise_for_status()

    try:
        for chunk in response.iter_content(chunk_size=4096):
            if not chunk:
                continue

            buffer += chunk
            start = buffer.find(b"\xff\xd8")
            end = buffer.find(b"\xff\xd9")

            if start == -1 or end == -1 or end <= start:
                continue

            jpg = buffer[start:end + 2]
            buffer = buffer[end + 2:]
            frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if frame is not None:
                yield frame
    finally:
        response.close()


def opencv_frame_generator(source):
    cap = cv2.VideoCapture(source)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, int(os.getenv("CAMERA_WIDTH", "640")))
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(os.getenv("CAMERA_HEIGHT", "360")))

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
            yield frame
    finally:
        cap.release()


def open_frame_source(source):
    if isinstance(source, str) and source.startswith(("http://", "https://")):
        return mjpeg_frame_generator(source)
    return opencv_frame_generator(source)


def detect_boxes(model, frame, class_filter):
    result = model(frame, verbose=False, conf=float(os.getenv("VISION_CONF", "0.35")))[0]
    boxes = result.boxes if result.boxes is not None else []
    detections = []

    for box in boxes:
        class_id = int(box.cls[0])
        if class_id not in class_filter:
            continue

        x1, y1, x2, y2 = map(int, box.xyxy[0])
        confidence = float(box.conf[0]) if box.conf is not None else 0.0
        detections.append(
            {
                "x": x1,
                "y": y1,
                "w": x2 - x1,
                "h": y2 - y1,
                "label": DEFAULT_CLASS_LABELS.get(class_id, str(class_id)),
                "confidence": confidence,
            }
        )

    return detections


def draw_boxes(frame, detections):
    for item in detections:
        x, y, w, h = item["x"], item["y"], item["w"], item["h"]
        label = f"{item['label']} {item['confidence']:.0%}"

        cv2.rectangle(frame, (x, y), (x + w, y + h), (80, 220, 120), 2)
        cv2.rectangle(frame, (x, max(0, y - 22)), (x + max(96, len(label) * 8), y), (30, 30, 30), -1)
        cv2.putText(frame, label, (x + 6, max(15, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (230, 230, 230), 1)


def post_detections(backend_url, source, frame, detections):
    h, w = frame.shape[:2]
    payload = {
        "frame_width": w,
        "frame_height": h,
        "source": str(source),
        "boxes": detections,
    }
    requests.post(f"{backend_url}/api/vision/detections", json=payload, timeout=0.5)


def fetch_control_state(backend_url):
    response = requests.get(f"{backend_url}/api/vision/control", timeout=0.5)
    response.raise_for_status()
    return response.json()


def post_event(backend_url, event_type, title, message, source=None, storage_path=None, confidence=None):
    event_text = {
        "capture_saved": (
            "캡처 저장됨",
            "현재 카메라 화면을 이미지로 저장했어요.",
        ),
        "away_person": (
            "외출 모드 중 사람 감지",
            "외출 모드 상태에서 사람이 감지되었어요.",
        ),
        "clip_saved": (
            "클립 저장 완료",
            "영상 클립 저장을 완료했어요.",
        ),
    }
    if event_type in event_text:
        title, message = event_text[event_type]

    payload = {
        "type": event_type,
        "title": title,
        "message": message,
        "source": str(source) if source is not None else None,
        "storage_path": str(storage_path) if storage_path is not None else None,
        "confidence": confidence,
    }
    requests.post(f"{backend_url}/api/vision/events", json=payload, timeout=0.5)


def save_capture(frame):
    path = CAPTURE_DIR / f"capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    ok = cv2.imwrite(str(path), frame)
    if not ok:
        print(f"[Vision] Capture save failed: {path}")
        return None
    print(f"[Vision] Capture saved: {path}")
    return path


class ClipRecorder:
    def __init__(self):
        self.writer = None
        self.path = None
        self.started_at = None

    @property
    def recording(self):
        return self.writer is not None

    def start(self, frame):
        if self.recording:
            return None

        h, w = frame.shape[:2]
        fps = float(os.getenv("VISION_RECORD_FPS", os.getenv("CAMERA_FPS", "10")))
        self.started_at = datetime.now()

        timestamp = self.started_at.strftime("%Y%m%d_%H%M%S")
        candidates = [
            ("webm", "VP80"),
            ("webm", "VP90"),
            ("mp4", "avc1"),
            ("mp4", "mp4v"),
        ]

        for ext, codec in candidates:
            path = CLIP_DIR / f"clip_{timestamp}.{ext}"
            writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*codec), fps, (w, h))
            if writer.isOpened():
                self.path = path
                self.writer = writer
                print(f"[Vision] Clip recording started: {self.path} ({codec})")
                return self.path
            writer.release()

        print("[Vision] Clip writer failed: no compatible codec")
        self.writer = None
        self.path = None
        self.started_at = None
        return None

    def write(self, frame):
        if self.writer is not None:
            self.writer.write(frame)

    def stop(self):
        if self.writer is None:
            return None

        path = self.path
        started_at = self.started_at
        ended_at = datetime.now()
        duration_seconds = int((ended_at - started_at).total_seconds()) if started_at else 0
        self.writer.release()
        print(f"[Vision] Clip saved: {path}")
        self.writer = None
        self.path = None
        self.started_at = None
        return {
            "path": path,
            "started_at": started_at,
            "ended_at": ended_at,
            "duration_seconds": duration_seconds,
        }


def main():
    source = resolve_capture_source()
    backend_url = resolve_backend_url()
    class_filter = resolve_class_filter()
    model = YOLO(resolve_model_path())
    frame_source = open_frame_source(source)

    print(f"[Vision] Source: {source}")
    print(f"[Vision] Backend: {backend_url}")
    print(f"[Vision] Classes: {sorted(class_filter)}")
    print("[Vision] Press Q or ESC to exit.")

    last_post_error_at = 0.0
    last_control_error_at = 0.0
    last_control_poll_at = 0.0
    last_capture_requested_at = 0.0
    control_baseline_loaded = False
    recording_requested = False
    away_mode = False
    last_away_person_event_at = 0.0
    last_event_error_at = 0.0
    recorder = ClipRecorder()

    try:
        for frame in frame_source:
            raw_frame = frame.copy()
            now = time.time()

            if now - last_control_poll_at >= 0.25:
                last_control_poll_at = now
                try:
                    control = fetch_control_state(backend_url)
                    capture_requested_at = float(control.get("capture_requested_at") or 0)
                    if not control_baseline_loaded:
                        last_capture_requested_at = capture_requested_at
                        control_baseline_loaded = True
                    elif capture_requested_at > last_capture_requested_at:
                        capture_path = save_capture(raw_frame)
                        if capture_path:
                            try:
                                post_event(
                                    backend_url,
                                    "capture_saved",
                                    "캡처 저장됨",
                                    "현재 카메라 화면을 이미지로 저장했어요.",
                                    source,
                                    capture_path,
                                )
                            except requests.RequestException as error:
                                if now - last_event_error_at > 5:
                                    print(f"[Vision] Event post failed: {error}")
                                    last_event_error_at = now
                        last_capture_requested_at = capture_requested_at
                    recording_requested = bool(control.get("recording"))
                    away_mode = bool(control.get("away_mode"))
                except requests.RequestException as error:
                    if now - last_control_error_at > 5:
                        print(f"[Vision] Control poll failed: {error}")
                        last_control_error_at = now

            if recording_requested and not recorder.recording:
                recorder.start(raw_frame)
            elif not recording_requested and recorder.recording:
                clip = recorder.stop()
                if clip:
                    start_text = clip["started_at"].strftime("%H:%M:%S") if clip["started_at"] else "--:--:--"
                    end_text = clip["ended_at"].strftime("%H:%M:%S")
                    duration = clip["duration_seconds"]
                    minutes = duration // 60
                    seconds = duration % 60
                    duration_text = f"{minutes}분 {seconds}초" if minutes else f"{seconds}초"
                    try:
                        post_event(
                            backend_url,
                            "clip_saved",
                            "클립 저장 완료",
                            f"영상 촬영 {start_text} 시작, {end_text} 종료. 총 {duration_text} 녹화했어요.",
                            source,
                            clip["path"],
                        )
                    except requests.RequestException as error:
                        if now - last_event_error_at > 5:
                            print(f"[Vision] Event post failed: {error}")
                            last_event_error_at = now

            recorder.write(raw_frame)

            detections = detect_boxes(model, frame, class_filter)
            if away_mode:
                person = next((item for item in detections if item["label"] == "Person"), None)
                if person and now - last_away_person_event_at >= float(os.getenv("AWAY_PERSON_EVENT_COOLDOWN", "10")):
                    try:
                        post_event(
                            backend_url,
                            "away_person",
                            "외출 모드 중 사람 감지",
                            "외출 모드 상태에서 사람이 감지됐어요.",
                            source,
                            confidence=person.get("confidence"),
                        )
                        last_away_person_event_at = now
                    except requests.RequestException as error:
                        if now - last_event_error_at > 5:
                            print(f"[Vision] Event post failed: {error}")
                            last_event_error_at = now
            try:
                post_detections(backend_url, source, frame, detections)
            except requests.RequestException as error:
                now = cv2.getTickCount() / cv2.getTickFrequency()
                if now - last_post_error_at > 5:
                    print(f"[Vision] Detection post failed: {error}")
                    last_post_error_at = now

            draw_boxes(frame, detections)

            cv2.imshow("Frontend Object Detection Preview", frame)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
    finally:
        recorder.stop()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
