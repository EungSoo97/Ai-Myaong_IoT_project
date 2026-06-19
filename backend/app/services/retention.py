from datetime import datetime, timedelta
from pathlib import Path
import json
import os

import database.clips  # noqa: F401
import database.daily_activity_summaries  # noqa: F401
import database.detection_logs  # noqa: F401
import database.emergency_clips  # noqa: F401
import database.feed_logs  # noqa: F401
import database.oauth2_providers  # noqa: F401
import database.pet_health_reports  # noqa: F401
import database.settings  # noqa: F401
import database.user_credentials  # noqa: F401
import database.user_oauth_connections  # noqa: F401
import database.water_logs  # noqa: F401
from database.alerts import Alert
from database.base import SessionLocal
from database.daily_activity_summaries import DailyActivitySummary
from database.detection_logs import DetectionLog


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MEDIA_DIRS = [
    PROJECT_ROOT / "desktop" / "opencv" / "captures",
    PROJECT_ROOT / "desktop" / "opencv" / "clips",
]


def _retention_days(name: str, default: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        days = int(raw)
    except ValueError:
        return default
    return max(1, days)


def cleanup_old_records() -> dict[str, int]:
    alert_days = _retention_days("ALERT_RETENTION_DAYS", 30)
    detection_days = _retention_days("DETECTION_LOG_RETENTION_DAYS", 30)
    activity_summary_days = _retention_days("ACTIVITY_SUMMARY_RETENTION_DAYS", 365)
    media_days = _retention_days("VISION_MEDIA_RETENTION_DAYS", 30)

    stats = {
        "alerts": 0,
        "detection_logs": 0,
        "daily_activity_summaries": 0,
        "media_files": 0,
    }

    stats["media_files"] = cleanup_old_media_files(media_days)

    if SessionLocal is None:
        print("[Retention] Oracle database is not configured; skipped DB cleanup.", flush=True)
        return stats

    db = SessionLocal()
    try:
        alert_cutoff = datetime.utcnow() - timedelta(days=alert_days)
        detection_cutoff = datetime.utcnow() - timedelta(days=detection_days)
        activity_summary_cutoff = datetime.utcnow().date() - timedelta(days=activity_summary_days)

        stats["alerts"] = (
            db.query(Alert)
            .filter(Alert.created_at < alert_cutoff)
            .delete(synchronize_session=False)
        )
        stats["detection_logs"] = (
            db.query(DetectionLog)
            .filter(DetectionLog.created_at < detection_cutoff)
            .delete(synchronize_session=False)
        )
        stats["daily_activity_summaries"] = (
            db.query(DailyActivitySummary)
            .filter(DailyActivitySummary.summary_date < activity_summary_cutoff)
            .delete(synchronize_session=False)
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print(
        "[Retention] cleanup complete: "
        f"alerts={stats['alerts']} detection_logs={stats['detection_logs']} "
        f"daily_activity_summaries={stats['daily_activity_summaries']} "
        f"media_files={stats['media_files']}",
        flush=True,
    )
    return stats


def cleanup_old_media_files(retention_days: int) -> int:
    cutoff = datetime.now().timestamp() - retention_days * 24 * 60 * 60
    deleted = 0

    for directory in MEDIA_DIRS:
        if not directory.exists():
            continue
        for path in directory.iterdir():
            if not path.is_file():
                continue
            try:
                if path.stat().st_mtime < cutoff:
                    path.unlink()
                    deleted += 1
            except OSError as error:
                print(f"[Retention] failed to delete media file: {path} ({error})", flush=True)

    return deleted


def parse_alert_message(message: str | None) -> dict:
    if not message:
        return {}
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}
