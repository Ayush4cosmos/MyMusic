# Playlist Feature - Visual Architecture

## User Interface Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAISH MUSIC PLAYER                       │
├──────────────────────────────────────┬──────────────────────────┤
│                                      │                           │
│  [Search Box]                        │  RIGHT SIDEBAR            │
│  Search Results                      │  ├─ Queue                │
│  ├─ Song 1 [➕] [📋]                │  │  ├─ Song A ❌         │
│  ├─ Song 2 [➕] [📋]                │  │  ├─ Song B ❌ 🔵PLAY  │
│  ├─ Song 3 [➕] [📋]                │  │  └─ Song C ❌         │
│  └─ Song 4 [➕] [📋]                │  │                         │
│                                      │  ├─ My Playlists         │
│  Audio Player ▶ [-----] ⏭           │  │  ├─ [➕ New]          │
│  ⏮ ⏭ 🔁 OFF                         │  │  ├─ Playlist A ❌      │
│                                      │  ├─ Playlist B ❌        │
│                                      │  └─ Playlist C ❌        │
│                                      │                           │
│  * Click song title to play          │  * Click playlist name   │
│  * Click ➕ to queue                 │    to view songs         │
│  * Click 📋 to add to playlist       │                           │
│                                      │                           │
└──────────────────────────────────────┴──────────────────────────┘
```

## Playlist View (When Clicked)

```
┌───────────────────────────────┐
│ [← Back] Playlist Name        │
│           [▶ Play Entire]     │
├───────────────────────────────┤
│ Song 1 [➕] [❌]              │
│ Song 2 [➕] [❌]              │
│ Song 3 [➕] [❌]              │
│ Song 4 [➕] [❌]              │
└───────────────────────────────┘

* Click song to play individually
* Click ➕ to add to current queue
* Click ❌ to remove from playlist
* Click [▶ Play] to replace queue
```

## Modal Dialogs

### Create Playlist Modal
```
┌─────────────────────────────┐
│ Create Playlist         [×]  │
├─────────────────────────────┤
│ Name: [Workout Mix      ]   │
│ ☐ Public                    │
│ [Create]                    │
└─────────────────────────────┘
```

### Add to Playlist Modal
```
┌──────────────────────────────┐
│ Add to Playlist         [×]   │
├──────────────────────────────┤
│ Workout Mix                  │
│ Chill Vibes                  │
│ Party Hits                   │
│ Study Focus                  │
│ New Year 2026                │
│                              │
│ [Cancel]                     │
└──────────────────────────────┘
Click playlist to add song
```

---

## Data Flow Diagram

### Search → Add to Playlist Flow

```
1. USER SEARCHES
   │
   ├─ Request: GET /search?q=beatles
   │
   ├─ Server: Clear Cache
   ├─ Server: Query source (JioSaavn)
   ├─ Server: Rank results
   │
   └─ Response: [
       {title, artist, source, id, ...},
       {title, artist, source, id, ...},
       ...
     ]
     └─ Cache populated with 20 results

2. USER CLICKS 📋 ON SONG
   │
   ├─ Frontend: Store song data
   ├─ Frontend: Show playlist modal
   │
   └─ User: Click target playlist

3. ADD TO PLAYLIST
   │
   ├─ Request: POST /playlists/{id}/add-track-from-source
   │  Body: {source, source_track_id, title, duration}
   │
   ├─ Server: Verify playlist ownership
   ├─ Server: Query track by source
   │  └─ If not found: Create track
   │     (metadata from cache guaranteed available)
   ├─ Server: Add PlaylistTrack record
   │  └─ Calculate position, insert
   │
   └─ Response: {status: "added", track_id: "uuid"}

4. CACHE BEHAVIOR
   │
   ├─ Cache is NOT cleared
   ├─ User can add more songs from same search
   ├─ Multiple playlists can be populated
   │
   └─ Cache cleared on next NEW search
```

### Playlist Play Flow

```
1. USER VIEWS PLAYLIST
   │
   ├─ Request: GET /playlists/{id}/tracks
   │
   └─ Response: [{
       track_id, title, source, 
       source_track_id, duration, position
     }, ...]

2a. PLAY ENTIRE PLAYLIST
   │
   ├─ Click [▶ Play]
   ├─ Request: POST /playlists/{id}/play
   │
   ├─ Server: Get ordered track IDs
   ├─ Server: Replace queue with tracks
   ├─ Server: Start playing first track
   │
   └─ Response: {track_id, status: "playing"}

2b. PLAY INDIVIDUAL SONG
   │
   ├─ Click song title
   ├─ Request: POST /queue/play-now
   │  Body: {source, source_track_id, title, duration}
   │
   ├─ Server: Get/create track (already in DB)
   ├─ Server: Update queue position
   ├─ Server: Load audio
   │
   └─ Response: {track_id}

3. AUDIO PLAYBACK
   │
   ├─ Frontend: Load audio file
   ├─ Frontend: Play audio element
   │
   └─ User: Hears music!
```

---

## Component Interaction Diagram

```
┌──────────────────┐
│   Search Box     │
└────────┬─────────┘
         │
         ├─ Populates: Search Results
         │
         ├─ Clears: search_cache
         │
         └─ Triggers: Rerender

┌──────────────────┐
│ Search Results   │
└────────┬─────────┘
         │
         ├─ Click Title
         │  └─ playNow(song) → /queue/play-now
         │
         ├─ Click ➕ Button
         │  └─ addToQueue(song) → /queue/add
         │
         └─ Click 📋 Button ✨ NEW
            └─ showAddToPlaylistModal()
               └─ showPlaylistSelector()

┌────────────────────────┐
│ My Playlists (Library) │ ✨ NEW
└────────────┬───────────┘
             │
             ├─ Click ➕ New
             │  └─ createPlaylistModal()
             │     └─ createPlaylist() → POST /playlists
             │
             ├─ Click Name
             │  └─ viewPlaylist(id)
             │
             └─ Click ❌
                └─ deletePlaylist(id) → DELETE /playlists/{id}

┌──────────────────┐
│ Playlist View    │ ✨ NEW
└────────┬─────────┘
         │
         ├─ Click [▶ Play]
         │  └─ playCurrentPlaylist() → POST /playlists/{id}/play
         │
         ├─ Click Song Title
         │  └─ playTrackFromPlaylist(track) → /queue/play-now
         │
         ├─ Click ➕ Button
         │  └─ addPlaylistTrackToQueue(track) → /queue/add
         │
         ├─ Click ❌ Button
         │  └─ removeTrackFromPlaylist(id) → DELETE /playlists/{id}/tracks/{trackId}
         │
         └─ Click [← Back]
            └─ backToPlaylists()
               └─ Show library view

┌──────────────────┐
│ Queue Display    │
└────────┬─────────┘
         │
         ├─ Shows current queue
         ├─ Highlights now playing
         │
         ├─ Click Song Title
         │  └─ playNow(queueItem) → /queue/play-now
         │
         └─ Click ❌
            └─ removeTrack() → POST /queue/remove/{trackId}
```

---

## State Management

```
JavaScript State Variables:

currentPlaylistId = null
  └─ Tracks which playlist is being viewed

pendingSongForPlaylist = null
  └─ Stores song data during add-to-playlist flow

debounce = undefined
  └─ Search debounce timer (unchanged)

DOM States:

#playlistViewBox
  ├─ .hidden → Show library
  └─ (no class) → Show playlist view

#createPlaylistModal
  ├─ display: none → Hidden
  └─ display: block → Visible

#addToPlaylistModal
  ├─ display: none → Hidden
  └─ display: block → Visible
```

---

## API Endpoint Map

### Existing (Unchanged)
```
GET    /search              → Returns cached metadata
GET    /queue               → Current queue state
POST   /queue/play-now      → Play track (from source)
POST   /queue/add           → Add to queue (from source)
POST   /queue/next          → Next track
POST   /queue/previous      → Previous track
POST   /queue/clear         → Clear queue
POST   /queue/remove/{id}   → Remove from queue

POST   /playlists           → Create
GET    /playlists           → List all
DELETE /playlists/{id}      → Delete

POST   /playlists/{id}/tracks                → Add by ID
DELETE /playlists/{id}/tracks/{trackId}      → Remove
PUT    /playlists/{id}/tracks/reorder        → Reorder
POST   /playlists/{id}/play                  → Play all
```

### New ✨
```
POST   /playlists/{id}/add-track-from-source → Add from search
GET    /playlists/{id}/tracks                → Get with source info
```

---

## Database Schema (No Changes)

```
┌──────────────┐
│   users      │
│ - id (PK)    │
│ - ...        │
└────────┬─────┘
         │ 1:N
         │
┌────────▼──────────┐
│   playlists      │
│ - id (PK)        │
│ - user_id (FK)   │────► Ownership
│ - name           │
│ - is_public      │
│ - created_at     │
└────────┬──────────┘
         │ 1:N
         │ Many-to-Many
         │
┌────────▼────────────────┐         ┌──────────────┐
│   playlist_tracks       │         │   tracks     │
│ - id (PK)              │         │ - id (PK)    │
│ - playlist_id (FK)  ────┼────┐    │ - source     │
│ - track_id (FK)    ─────┼─┐  │    │ - source_id  │
│ - position         ────┐ │  │    │ - title      │
│ UQ: (playlist_id, │     │ │  │    │ - duration   │
│     track_id)     └─────┘ │  │    └──────────────┘
└────────────────────────┘  │  │
                           │  └────── Many Playlists
                           │
                           └─────── One Track
```

---

## Caching Strategy

```
BEFORE: /search?q=beatles
├─ Clear cache
│
DURING: Query JioSaavn
├─ Get 20 results
│
AFTER: Populate cache
├─ For each result:
│  └─ Set cache["{source}:{source_id}"] = {
│     source, source_track_id, title, duration
│  }
│
USER ACTIONS (Same search session):
├─ Add to Queue
│  └─ Uses cache metadata
│
├─ Add to Playlist
│  └─ Uses cache metadata
│  └─ Cache NOT cleared
│
└─ Click Play
   └─ Uses cache metadata

NEW /search?q=elvis
├─ Clear cache (invalidate previous)
│
└─ Populate with new results
   └─ "beatles" songs no longer accessible
   └─ Fresh metadata for "elvis"
```

---

## Error Prevention

```
Traditional Approach (WITH 422 Risk):
  POST /search → Get metadata
  └─ User navigates away
  └─ Metadata lost
  └─ User tries to add to playlist
  └─ No metadata → 422 Error ❌

New Approach (WITH Cache):
  POST /search → Populate cache ✓
  └─ Cache persists
  └─ Multiple operations from same search
  └─ All use cache metadata
  └─ No 422 errors ✓
  └─ Next search clears cache
  └─ Clean slate ✓

Key: Cache lifetime = Search session
     (Not per-operation, not permanent)
```

---

## Component Dependency Graph

```
index.html (Frontend)
│
├─ Depends on: /search
├─ Depends on: /queue/*
├─ Depends on: /playlists/* ✨ NEW
│
└─ Components:
   ├─ Modal System
   ├─ Search Results Handler
   ├─ Queue Manager
   ├─ Playlist Manager ✨ NEW
   │  ├─ Create/Delete
   │  ├─ View/Browse
   │  ├─ Play Controls
   │  └─ Track Management
   │
   └─ Playback System

playlists.py (Backend)
│
├─ Depends on: SQLAlchemy (ORM)
├─ Depends on: FastAPI (Web)
├─ Depends on: Pydantic (Validation)
│
└─ Services:
   ├─ playlist_service (Data access)
   ├─ playback_queue_service (Playback)
   ├─ track_repo ✨ NEW Import
   └─ search_cache ✨ NEW Import
```

---

## Performance Considerations

```
Playlist Creation:
  - Single INSERT to db.playlists
  - ~1ms

Add to Playlist:
  - Get/Create Track: 1-2 queries
  - Get max position: 1 query
  - Insert PlaylistTrack: 1 query
  - Total: ~5-10ms

List Playlists:
  - Single query (all user's playlists)
  - ~1-5ms depending on count

Get Playlist Tracks:
  - Join query (tracks + playlist_tracks)
  - ~5-20ms depending on track count

Play Playlist:
  - Get track IDs: 1 query
  - Replace queue: In-memory operation
  - Total: ~5-10ms

Frontend:
  - DOM updates: ~10-50ms
  - Modal transitions: CSS (0ms)
  - Search debounce: 300ms (user-tunable)
```

---

## Testing Scenarios

```
Scenario 1: Basic Playlist Management
├─ Create "Workout"
├─ Create "Chill"
├─ Verify both in list
├─ Delete "Workout"
└─ Verify only "Chill" remains

Scenario 2: Add from Search
├─ Search "beatles"
├─ Add "Let It Be" to "Chill"
├─ Add "Help" to "Chill"
├─ Add "Let It Be" to new "Classics"
└─ Verify cache worked (no 422)

Scenario 3: Play Playlist
├─ View "Chill" playlist
├─ Click [▶ Play]
├─ Verify 1st song plays
├─ Verify queue shows all songs
├─ Click next → plays 2nd song
└─ Verify order maintained

Scenario 4: Individual Song Play
├─ View "Chill" playlist
├─ Click on 2nd song title
├─ Verify 2nd song plays immediately
├─ Click "Let It Be" in queue
├─ Verify switches to that song
└─ Verify queue position updates

Scenario 5: Cache Behavior
├─ Search "beatles" (cache populated)
├─ Add "Help" to "Chill"
├─ Add "Help" to "Rock"
├─ Search "elvis" (cache cleared)
├─ Verify "beatles" songs no longer in cache
├─ Search "beatles" again
├─ Add "Help" to new "Favorites"
└─ Verify fresh metadata used
```

---

This architecture supports:
- ✅ Intuitive UI for playlist management
- ✅ Seamless cache integration
- ✅ No 422 errors during normal usage
- ✅ Clean database (no pollution)
- ✅ Scalable design (works with 100s of playlists)
- ✅ Consistent with existing patterns

**Status: READY FOR IMPLEMENTATION ✅**
