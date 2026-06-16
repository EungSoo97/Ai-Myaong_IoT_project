"""
Video-file activity test runner.

Use this when you want to validate pet detection and activity scoring with a
saved video instead of the Raspberry Pi stream.
"""

import argparse
import os
import time
from pathlib import Path

import cv2
from dotenv import load_dotenv
from ultralytics import YOLO

from vision_to_frontend import (
    ActivityTracker,
    detect_boxes,
    draw_boxes,
    resolve_class_filter,
    resolve_model_path,
)


ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_PATH)


def resolve_video_path(cli_path):
    raw_path = cli_path or os.getenv("VIDEO_TEST_PATH", "").strip()
    if not raw_path:
        raise ValueError("Video path is required. Pass a path argument or set VIDEO_TEST_PATH in desktop/.env.")

    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def main():
    parser = argparse.ArgumentParser(description="Run activity scoring against a saved video file.")
    parser.add_argument("video", nargs="?", help="Path to a test video file.")
    parser.add_argument("--loop", action="store_true", help="Replay the video until Q or ESC is pressed.")
    args = parser.parse_args()

    try:
        video_path = resolve_video_path(args.video)
    except ValueError as error:
        print(f"[ActivityVideo] {error}")
        return

    if not video_path.exists():
        print(f"[ActivityVideo] Video file not found: {video_path}")
        return

    model = YOLO(resolve_model_path())
    class_filter = resolve_class_filter()
    tracker = ActivityTracker()

    print(f"[ActivityVideo] Source: {video_path}")
    print(f"[ActivityVideo] Classes: {sorted(class_filter)}")
    print("[ActivityVideo] Press Q or ESC to exit.")

    should_exit = False
    try:
        while True:
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                print(f"[ActivityVideo] Failed to open video: {video_path}")
                break

            fps = cap.get(cv2.CAP_PROP_FPS) or 15
            delay_ms = max(1, int(1000 / fps))

            try:
                while True:
                    ok, frame = cap.read()
                    if not ok or frame is None:
                        break

                    detections = detect_boxes(model, frame, class_filter)
                    tracker.update(frame, detections, time.time())
                    draw_boxes(frame, detections)

                    cv2.imshow("Activity Video Test", frame)
                    key = cv2.waitKey(delay_ms) & 0xFF
                    if key in (ord("q"), 27):
                        should_exit = True
                        break
            finally:
                cap.release()

            if should_exit or not args.loop:
                break
    finally:
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
