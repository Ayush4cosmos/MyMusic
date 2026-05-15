# app/api/routes/audio.py
import re
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter()

STORAGE_ROOT = Path("storage/audio").resolve()
CHUNK_SIZE = 1024 * 1024  # 1 MB


def parse_range(range_header: str):
    match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not match:
        return None
    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else None
    return start, end


def file_iterator(path: Path, start: int, length: int):
    with open(path, "rb") as f:
        f.seek(start)
        remaining = length
        while remaining > 0:
            chunk = f.read(min(CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


@router.get("/audio/{track_id}")
def stream_audio(track_id: str, request: Request):
    path = STORAGE_ROOT / f"{track_id}.mp3"

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="Audio not downloaded. Call /play first.",
        )

    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        parsed = parse_range(range_header)
        if not parsed:
            raise HTTPException(416, "Invalid Range header")

        start, requested_end = parsed
        end = requested_end if requested_end is not None else file_size - 1
        end = min(end, file_size - 1)

        if start >= file_size:
            raise HTTPException(416, "Range out of bounds")

        length = end - start + 1
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": "audio/mpeg",
        }

        return StreamingResponse(
            file_iterator(path, start, length),
            status_code=206,
            headers=headers,
        )

    headers = {
        "Content-Range": f"bytes 0-{file_size - 1}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": "audio/mpeg",
    }

    return StreamingResponse(
        file_iterator(path, 0, file_size),
        status_code=206,
        headers=headers,
    )