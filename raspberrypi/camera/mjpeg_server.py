import os
import time
from collections.abc import Iterator

from dotenv import load_dotenv
from flask import Flask, Response

load_dotenv()

app = Flask(__name__)

BOUNDARY = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"


@app.get("/stream")
def stream() -> Response:
    return Response(frames(), mimetype="multipart/x-mixed-replace; boundary=frame")


def frames() -> Iterator[bytes]:
    backend = os.getenv("CAMERA_BACKEND", "picamera2").strip().lower()
    if backend == "opencv":
        yield from opencv_frames()
        return

    try:
        yield from picamera2_frames()
    except Exception as error:
        print(f"[camera] Picamera2 stream failed: {error}")
        yield from opencv_frames()


def picamera2_frames() -> Iterator[bytes]:
    from picamera2 import Picamera2

    width = int(os.getenv("CAMERA_WIDTH", "640"))
    height = int(os.getenv("CAMERA_HEIGHT", "360"))
    fps = max(1, int(os.getenv("CAMERA_FPS", "15")))
    quality = int(os.getenv("CAMERA_JPEG_QUALITY", "82"))
    frame_delay = 1 / fps

    camera = Picamera2()
    config = camera.create_video_configuration(
        main={"size": (width, height), "format": "RGB888"},
        controls={"FrameRate": fps},
    )
    camera.configure(config)
    camera.start()
    print(f"[camera] Picamera2 MJPEG stream started at {width}x{height} {fps}fps")

    try:
        import cv2

        while True:
            frame = camera.capture_array()
            ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
            if ok:
                yield BOUNDARY + encoded.tobytes() + b"\r\n"
            time.sleep(frame_delay)
    finally:
        camera.stop()
        camera.close()


def opencv_frames() -> Iterator[bytes]:
    try:
        import cv2
    except ImportError:
        print("[camera] OpenCV is not installed; install python3-opencv or use Picamera2.")
        return

    source = os.getenv("CAMERA_SOURCE", "0").strip()
    capture_source = int(source) if source.isdigit() else source
    width = int(os.getenv("CAMERA_WIDTH", "640"))
    height = int(os.getenv("CAMERA_HEIGHT", "360"))
    fps = max(1, int(os.getenv("CAMERA_FPS", "15")))
    quality = int(os.getenv("CAMERA_JPEG_QUALITY", "82"))
    frame_delay = 1 / fps

    capture = cv2.VideoCapture(capture_source)
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    capture.set(cv2.CAP_PROP_FPS, fps)

    if not capture.isOpened():
        print(f"[camera] could not open camera source: {source}")
        return

    print(f"[camera] OpenCV MJPEG stream started from {source} at {width}x{height} {fps}fps")

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                time.sleep(0.05)
                continue

            ok, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
            if ok:
                yield BOUNDARY + encoded.tobytes() + b"\r\n"
            time.sleep(frame_delay)
    finally:
        capture.release()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("STREAM_PORT", "8080")), threaded=True)
