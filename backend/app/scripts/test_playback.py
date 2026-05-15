from app.services.playback_service import PlaybackService

# ⚠️ Use a track that is EXTERNAL (is_available = false)
TRACK_ID = "a8c62b80-dfba-43d3-a3cb-4c42f28aed47"
USER_ID = "test-user"

service = PlaybackService()

print("\n▶️ Requesting playback...\n")
stream = service.play(TRACK_ID, USER_ID)

# If play() returns a dict, extract generator
if isinstance(stream, dict):
    raise RuntimeError("play() returned decision only, not stream")

print("🔁 Consuming first 5 chunks...\n")

for i, chunk in enumerate(stream):
    print(f"Chunk {i + 1}: size={len(chunk)} bytes")
    print(f"First 16 bytes: {chunk[:16]}\n")

    if i >= 4:  # only 5 chunks
        break

print("✅ External stream byte test complete\n")