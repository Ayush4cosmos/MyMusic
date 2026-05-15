# app/scripts/test_catalog_believer.py

from app.services.catalog_service import CatalogService
from app.db.session import get_db

catalog = CatalogService()
db = next(get_db())

raw = {
    "source": "jiosaavn",
    "source_track_id": "BeXBcbVK",
    "title": "Believer",
    "artist": "Imagine Dragons",
    "duration": 204,
}

track = catalog.catalog_track(db, raw)
print("🆔 Internal UUID:", track.id)

# 42039381-c52e-46bd-b530-74bc7e9b1f9b