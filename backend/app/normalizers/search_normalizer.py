# backend/app/normalizers/search_normalizer.py
import re

def normalize(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())

def canonical_key(title: str, artist: str) -> str:
    return f"{normalize(title)}::{normalize(artist)}"