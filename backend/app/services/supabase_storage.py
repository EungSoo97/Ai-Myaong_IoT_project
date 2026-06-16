import mimetypes
import os
from pathlib import PurePosixPath
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import uuid4

from fastapi import HTTPException, UploadFile


SUPABASE_BUCKET = "myaong"


def _supabase_config() -> tuple[str, str]:
    url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Supabase Storage 설정이 없습니다. SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.",
        )
    return url, key


def _image_extension(file: UploadFile) -> str:
    guessed = mimetypes.guess_extension(file.content_type or "") or ""
    if guessed == ".jpe":
        guessed = ".jpg"
    suffix = PurePosixPath(file.filename or "").suffix.lower()
    ext = guessed or suffix
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다.")
    return ext


def upload_image_to_supabase(folder: str, owner_id: int, file: UploadFile) -> str:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드할 수 있습니다.")

    supabase_url, service_role_key = _supabase_config()
    ext = _image_extension(file)
    object_path = f"{folder}/{owner_id}/{uuid4().hex}{ext}"
    upload_url = (
        f"{supabase_url}/storage/v1/object/{SUPABASE_BUCKET}/"
        f"{quote(object_path, safe='/')}"
    )
    data = file.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="빈 이미지 파일은 업로드할 수 없습니다.")

    request = Request(
        upload_url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
            "Content-Type": file.content_type or "application/octet-stream",
            "x-upsert": "true",
        },
    )
    try:
        with urlopen(request, timeout=30):
            pass
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") or str(exc)
        raise HTTPException(status_code=502, detail=f"Supabase 업로드 실패: {detail}") from exc
    except URLError as exc:
        raise HTTPException(status_code=502, detail=f"Supabase 연결 실패: {exc.reason}") from exc

    return f"{supabase_url}/storage/v1/object/public/{SUPABASE_BUCKET}/{quote(object_path, safe='/')}"
