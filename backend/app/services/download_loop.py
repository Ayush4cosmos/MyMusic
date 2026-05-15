# backend/app/services/download_loop.py
import asyncio
import threading

_download_loop: asyncio.AbstractEventLoop | None = None
_loop_thread: threading.Thread | None = None


def _start_loop(loop: asyncio.AbstractEventLoop):
    asyncio.set_event_loop(loop)
    loop.run_forever()


def get_download_loop() -> asyncio.AbstractEventLoop:
    global _download_loop, _loop_thread

    if _download_loop and _download_loop.is_running():
        return _download_loop

    # 🔑 Create loop
    _download_loop = asyncio.new_event_loop()

    # 🔑 Run it in background thread
    _loop_thread = threading.Thread(
        target=_start_loop,
        args=(_download_loop,),
        daemon=True,
    )
    _loop_thread.start()

    return _download_loop