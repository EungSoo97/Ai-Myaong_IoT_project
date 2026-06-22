from datetime import datetime, timedelta, timezone


KST = timezone(timedelta(hours=9), name="Asia/Seoul")


def now_kst_naive() -> datetime:
    """Return Seoul wall-clock time for Oracle DATE columns."""
    return datetime.now(KST).replace(tzinfo=None)


def today_kst():
    return datetime.now(KST).date()


def as_kst_aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=KST)
    return value.astimezone(KST)


def kst_iso(value: datetime | None) -> str | None:
    aware = as_kst_aware(value)
    return aware.isoformat() if aware else None
