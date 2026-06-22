"""Run emergency detection against a saved video instead of a live camera."""

import argparse
import os
import time
from datetime import datetime
from pathlib import Path

import cv2
from dotenv import load_dotenv
from ultralytics import YOLO

from vision_to_frontend import (
    EmergencyTracker,
    detect_boxes,
    draw_boxes,
    resolve_backend_url,
    resolve_class_filter,
    resolve_model_path,
)


ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_PATH)


class ConsoleEmergencyTracker(EmergencyTracker):
    """Emergency tracker that prints events without writing to the backend."""

    def _fire(self, event_type, title, message, now, confidence=None):
        if now - self.last_fired.get(event_type, 0.0) < self.cooldown_seconds:
            return False

        self.last_fired[event_type] = now
        self.latest_alert = {"type": event_type, "time": now}
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(
            f"[EmergencyVideo][{event_type}] {timestamp} "
            f"confidence={confidence} message={message}",
            flush=True,
        )
        return True


def resolve_video_path(cli_path):
    raw_path = (
        cli_path
        or os.getenv("EMERGENCY_VIDEO_TEST_PATH", "").strip()
        or os.getenv("VIDEO_TEST_PATH", "").strip()
    )
    if not raw_path:
        raise ValueError(
            "Video path is required. Pass a path argument or set "
            "EMERGENCY_VIDEO_TEST_PATH in desktop/.env."
        )

    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        candidate = Path.cwd() / path
        local_candidate = Path(__file__).resolve().parent / path
        path = candidate if candidate.exists() else local_candidate
    return path.resolve()


def draw_debug_panel(frame, tracker, detector_now, time_scale):
    center_motion = tracker.last_center_motion
    roi_motion = tracker.last_roi_motion
    no_motion_elapsed = (
        detector_now - tracker.no_motion_started_at
        if tracker.no_motion_started_at is not None
        else 0.0
    )
    seizure_ratio = 0.0
    if tracker.seizure_history:
        seizure_ratio = sum(1 for _, high in tracker.seizure_history if high) / len(
            tracker.seizure_history
        )

    rows = [
        f"time scale: x{time_scale:g}",
        f"center motion: {center_motion:.4f}" if center_motion is not None else "center motion: --",
        f"ROI motion: {roi_motion:.4f}" if roi_motion is not None else "ROI motion: --",
        f"no motion: {no_motion_elapsed:.1f}s",
        f"fall candidate: {'YES' if tracker.fall_candidate_at is not None else 'NO'}",
        f"seizure ratio: {seizure_ratio:.2f}",
    ]

    panel_height = 24 + len(rows) * 20
    overlay = frame.copy()
    cv2.rectangle(overlay, (8, 44), (300, 44 + panel_height), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
    for index, text in enumerate(rows):
        cv2.putText(
            frame,
            text,
            (18, 68 + index * 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.48,
            (230, 230, 230),
            1,
        )


def create_tracker(video_path, post_backend):
    backend_url = resolve_backend_url()
    tracker_class = EmergencyTracker if post_backend else ConsoleEmergencyTracker
    return tracker_class(backend_url, str(video_path))


def main():
    parser = argparse.ArgumentParser(
        description="Run fall, no-motion, and seizure-suspicion detection on a saved video."
    )
    parser.add_argument("video", nargs="?", help="Path to a test video file.")
    parser.add_argument("--loop", action="store_true", help="Replay until Q or ESC is pressed.")
    parser.add_argument(
        "--post-backend",
        action="store_true",
        help="Write detected events to the backend ALERTS table.",
    )
    parser.add_argument(
        "--time-scale",
        type=float,
        default=float(os.getenv("EMERGENCY_TEST_TIME_SCALE", "1")),
        help="Multiply detector time. Example: 20 makes 30 seconds count as 10 minutes.",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=1.0,
        help="Playback speed. Use 0 for fastest possible processing.",
    )
    args = parser.parse_args()

    if args.time_scale <= 0 or args.speed < 0:
        parser.error("--time-scale must be positive and --speed cannot be negative.")

    try:
        video_path = resolve_video_path(args.video)
    except ValueError as error:
        print(f"[EmergencyVideo] {error}")
        return

    if not video_path.exists():
        print(f"[EmergencyVideo] Video file not found: {video_path}")
        return

    model = YOLO(resolve_model_path())
    class_filter = resolve_class_filter()

    print(f"[EmergencyVideo] Source: {video_path}")
    print(f"[EmergencyVideo] Classes: {sorted(class_filter)}")
    print(f"[EmergencyVideo] Time scale: x{args.time_scale:g}")
    print(f"[EmergencyVideo] Backend posting: {'ON' if args.post_backend else 'OFF'}")
    print("[EmergencyVideo] Press Q or ESC to exit.")

    should_exit = False
    try:
        while True:
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                print(f"[EmergencyVideo] Failed to open video: {video_path}")
                break

            fps = cap.get(cv2.CAP_PROP_FPS) or 15.0
            delay_ms = 1 if args.speed == 0 else max(1, int(1000 / (fps * args.speed)))
            frame_index = 0
            tracker = create_tracker(video_path, args.post_backend)

            try:
                while True:
                    ok, frame = cap.read()
                    if not ok or frame is None:
                        break

                    video_seconds = frame_index / fps
                    simulated_seconds = video_seconds * args.time_scale
                    detector_now = 1000.0 + simulated_seconds
                    detections = detect_boxes(model, frame, class_filter)
                    tracker.update(frame, detections, detector_now)
                    draw_boxes(frame, detections)
                    tracker.draw(frame, detector_now)
                    draw_debug_panel(frame, tracker, detector_now, args.time_scale)

                    cv2.imshow("Emergency Video Test", frame)
                    key = cv2.waitKey(delay_ms) & 0xFF
                    if key in (ord("q"), 27):
                        should_exit = True
                        break
                    frame_index += 1
            finally:
                cap.release()

            if should_exit or not args.loop:
                break
    finally:
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
