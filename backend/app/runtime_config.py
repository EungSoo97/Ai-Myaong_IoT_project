import os
from pathlib import Path

BACKEND_ENV = Path(__file__).resolve().parents[1] / ".env"


def runtime_env(key: str, default: str = "") -> str:
    file_values = read_env_values(BACKEND_ENV, (key,))
    return file_values.get(key) or _clean_env_value(os.getenv(key, default))


def read_env_values(path: Path, keys: tuple[str, ...]) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key in keys:
            values[key] = _clean_env_value(value)
    return values


def _clean_env_value(value: str) -> str:
    stripped = value.strip()
    if len(stripped) >= 2 and stripped[0] == stripped[-1] and stripped[0] in {'"', "'"}:
        return stripped[1:-1]
    return stripped
