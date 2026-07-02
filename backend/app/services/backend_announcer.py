"""백엔드 자기 주소(LAN URL)를 MQTT로 알리는 디스커버리 송신측.

라즈베리파이는 `system/backend/announce` 토픽을 구독해 여기서 받은 URL로
센서값(POST /api/robot/sensor)을 보낸다. retain=True 로 보내므로, Pi 가
나중에 접속하더라도 즉시 마지막 URL을 받는다. IP 변경/브로커 재시작에 대비해
주기적으로도 재발행한다.

팀원마다 각자 PC 백엔드가 자기 LAN URL을 알리므로, 같은 Pi 를 쓰는 경우
'마지막으로 실행 중인 백엔드'가 Pi 를 가져간다(순차 테스트에 적합).
"""
import json  # noqa: F401  (publish 가 dict 직렬화하므로 직접 사용은 안 하지만 의도 표시)
import socket
import threading
import time

from app.runtime_config import runtime_env

ANNOUNCE_TOPIC = "system/backend/announce"

_announcer_thread: threading.Thread | None = None


def _primary_private_ip() -> str:
    """인터넷으로 나가는 인터페이스의 사설 IP. (WSL/Hyper-V 가상 IP가 아닌 실제 LAN IP)"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except Exception:
        return ""
    finally:
        sock.close()


def backend_public_url() -> str:
    """Pi 에게 알릴 이 백엔드의 URL. BACKEND_PUBLIC_URL 이 있으면 우선 사용."""
    configured = runtime_env("BACKEND_PUBLIC_URL", "").strip().rstrip("/")
    if configured:
        return configured
    host = _primary_private_ip()
    port = runtime_env("BACKEND_PUBLIC_PORT", "8000").strip() or "8000"
    return f"http://{host}:{port}" if host else ""


def announce_once(mqtt_client) -> bool:
    """현재 URL을 한 번 발행. 성공 여부 반환."""
    url = backend_public_url()
    if not url:
        return False
    return mqtt_client.publish(ANNOUNCE_TOPIC, {"url": url}, retain=True)


def start_backend_announcer(mqtt_client, interval: float | None = None) -> threading.Thread | None:
    """백그라운드로 주기적 announce 시작 (중복 시작 방지)."""
    global _announcer_thread
    if _announcer_thread is not None and _announcer_thread.is_alive():
        return _announcer_thread

    period = interval if interval is not None else float(runtime_env("BACKEND_ANNOUNCE_INTERVAL", "30"))

    def _loop() -> None:
        last_url = None
        while True:
            try:
                url = backend_public_url()
                if url:
                    mqtt_client.publish(ANNOUNCE_TOPIC, {"url": url}, retain=True)
                    if url != last_url:
                        print(f"[announce] backend url -> {url}", flush=True)
                        last_url = url
            except Exception as exc:  # 발행 실패해도 루프는 계속
                print(f"[announce] publish failed: {exc}", flush=True)
            time.sleep(period)

    _announcer_thread = threading.Thread(target=_loop, name="backend-announcer", daemon=True)
    _announcer_thread.start()
    return _announcer_thread
