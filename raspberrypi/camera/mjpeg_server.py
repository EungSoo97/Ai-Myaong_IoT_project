import base64
import os
import time
from collections.abc import Iterator

import uvicorn
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI(title="Ai-Myaong MJPEG Server", version="0.1.0")

_FRAME = base64.b64decode(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z"
)


@app.get("/stream")
def stream() -> StreamingResponse:
    return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame")


def frames() -> Iterator[bytes]:
    while True:
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + _FRAME + b"\r\n"
        time.sleep(0.25)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("STREAM_PORT", "8080")))
