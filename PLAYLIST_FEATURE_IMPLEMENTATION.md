# Playlist Feature Implementation

## Overview
This implementation adds comprehensive playlist functionality to the Raish music streaming system with the following key design principles:

1. **Temporary Catalog Promotion Pattern**: Uses the same caching strategy as search
2. **Single Queue Authority**: All playback uses the same queue system
3. **DB Pollution Prevention**: Tracks promoted to catalog only when explicitly played/queued/saved
4. **Source-First Approach**: Leverages existing search cache for metadata

---

## Architecture

### Backend Changes

#### 1. **New Playlist Endpoints** (`app/api/routes/playlists.py`)

##### `POST /playlists`
- Create a new playlist
- Returns: `{id, name, is_public}`

##### `GET /playlists`
- List all playlists for current user
- Returns: `[{id, name, is_public}, ...]`

##### `DELETE /playlists/{playlist_id}`
- Delete a playlist
- Only playlist owner can delete

##### `POST /playlists/{playlist_id}/add-track-from-source`
**NEW - Source-based Track Addition**
- Add track from search results to playlist
- Uses temporary search cache (NO 422 error risk)
- Metadata from cache: `{source, source_track_id, title, duration}`
- Flow:
  1. Verify playlist ownership
  2. Get or create track (from cache metadata)
  3. Add to playlist at next position
- Returns: `{status: "added", track_id}`

##### `POST /playlists/{playlist_id}/tracks`
- Add already-cataloged track (by track_id) to playlist
- Used when track already exists in DB

##### `GET /playlists/{playlist_id}/tracks`
**UPDATED - Returns Source Info**
- Get all tracks in playlist (ordered)
- Returns:
  ```json
  [
    {
      "track_id": "uuid",
      "title": "Song Name",
      "source": "jiosaavn",
      "source_track_id": "abc123",
      "duration": 180,
      "position": 0
    }
  ]
  ```
- Includes source info to enable "play by source" functionality

##### `DELETE /playlists/{playlist_id}/tracks/{track_id}`
- Remove track from playlist

##### `PUT /playlists/{playlist_id}/tracks/reorder`
- Reorder tracks in playlist

##### `POST /playlists/{playlist_id}/play`
**Updated - Uses Queue System**
- Play entire playlist
- Replaces queue with playlist tracks
- Delegates to single queue authority
- Individual track clicks use `/queue/play-now` (not play-by-id)

---

### Frontend Changes

#### Search Results Section
**New UI for Each Song:**
- Title (clickable to play)
- ➕ Button: Add to Queue
- 📋 Button: Add to Playlist (NEW)

#### Playlist Library Section
- Shows all user's playlists
- ➕ New Button: Create new playlist
- Click playlist name to view/manage tracks
- ❌ Delete button per playlist

#### Playlist View (Active Playlist)
- ← Back button to return to library
- ▶ Play button to play entire playlist
- Track list with:
  - Title (clickable to play individual track)
  - ➕ Button: Add track to queue
  - ❌ Button: Remove from playlist

#### Modals
1. **Create Playlist Modal**
   - Text input for name
   - Checkbox for public/private
   - Create button

2. **Add to Playlist Modal**
   - Lists all user's playlists
   - Click to select target playlist
   - Auto-adds song and closes

---

## Caching & Promotion Strategy

### Search Cache (Existing)
- Cleared only on NEW `/search` request
- Contains metadata for search results
- Key: `"{source}:{source_track_id}"`

### Promotion Flow (Same as Queue/Add)

When user clicks "Add to Playlist":
1. ✅ Uses search cache (metadata already available)
2. ✅ Creates track in DB if needed (from cache)
3. ✅ Adds to playlist
4. ❌ Cache is NOT cleared (only clears on new search)
5. ❌ No DB pollution (track only added on explicit action)

When user clicks song in playlist to play:
1. ✅ Uses `/queue/play-now` with source metadata
2. ✅ Same promotion as search click
3. ✅ Track already cataloged (from add-to-playlist)

### Benefits
- **No 422 Errors**: Cache guarantees metadata for every track
- **Clean DB**: Only user-intentional actions cause catalog writes
- **Consistent**: Same pattern as search/queue system
- **Efficient**: Reuses existing cache infrastructure

---

## User Flows

### Creating & Managing Playlists

```
1. Right sidebar → ➕ New button
2. Enter name, optionally check "Public"
3. Playlist appears in "My Playlists" list
```

### Adding Songs to Playlist

```
Search Results:
1. Find song via /search
2. Click 📋 button
3. Modal shows all your playlists
4. Click target playlist → ADDED
5. Cache remains (supports multiple adds)
6. Next /search clears cache & resets UI
```

### Playing Playlists

```
Option A: Play Entire Playlist
1. View playlist (click name in library)
2. Click ▶ Play button
3. Queue replaced with playlist tracks
4. First track plays

Option B: Play Individual Track
1. View playlist
2. Click track title
3. Uses /queue/play-now (same as search)
4. Queue managed normally
5. Next/Previous navigate within queue
```

### Adding Playlist Songs to Queue

```
1. View playlist (click name in library)
2. Click ➕ next to any song
3. Adds to current queue
4. Doesn't interrupt current playback
```

---

## API Design Decisions

### Why Not "Play by ID"?
- For playlist tracks, we always have source info
- `/queue/play-now` with source is consistent with search
- Avoids creating different code paths for same action

### Why Temporary Cache for Add-to-Playlist?
- Matches queue/add pattern (proven reliable)
- Guarantees metadata availability
- Prevents premature DB writes
- Handles multiple adds per search session

### Why Separate `/add-track-from-source` Endpoint?
- Search results use source metadata
- Existing `/tracks` endpoint uses track_id
- Two patterns allow flexibility:
  - Add from search: Use source endpoint
  - Add from DB: Use tracks endpoint

---

## Implementation Checklist

✅ Backend:
- [x] New `add-track-from-source` endpoint with cache promotion
- [x] Updated `list_playlist_tracks` with source/duration fields
- [x] Proper imports (TrackRepository, search_cache)
- [x] All error handling and uniqueness constraints

✅ Frontend:
- [x] Playlist library management (create, delete, view)
- [x] Add-to-Playlist modal with playlist selector
- [x] Playlist view with track controls
- [x] Individual track play (using play-now)
- [x] Playlist-wide play functionality
- [x] Add-to-queue for playlist songs
- [x] Modal system (create, add-to-playlist)
- [x] Responsive styling

---

## Testing Recommendations

1. **Playlist Creation**
   - Create new playlist via UI
   - Verify appears in library
   - Delete and confirm removal

2. **Add-to-Playlist Flow**
   - Search for songs
   - Click 📋 on multiple songs
   - Same playlist → works (uniqueness constraint)
   - Different playlists → works

3. **Playback**
   - Play entire playlist → all songs play in order
   - Click individual song → plays with queue behavior
   - Add to queue from playlist → appends to current queue

4. **Cache Behavior**
   - Add multiple songs to playlist
   - New search → cache clears
   - Add from search works seamlessly

5. **UI Flow**
   - Navigation back/forth between library and playlists
   - Modal opens/closes correctly
   - Buttons responsive and functional

---

## Files Modified

1. **[app/api/routes/playlists.py](app/api/routes/playlists.py)**
   - Added `AddTrackFromSourceRequest` schema
   - Added `add-track-from-source` endpoint
   - Updated imports (TrackRepository, search_cache)
   - Enhanced `list_playlist_tracks` response

2. **[static/index.html](static/index.html)**
   - Complete UI rewrite
   - Added playlist library section
   - Added playlist view with controls
   - Added modals (create, add-to-playlist)
   - Improved styling and responsive design
   - Added comprehensive JavaScript functions

---

## Future Enhancements

1. Playlist sharing (public/private)
2. Collaborative playlists
3. Playlist cover images
4. Batch operations (add multiple songs at once)
5. Playlist duplication
6. Import/Export playlists
7. Playlist statistics (duration, song count)
8. Drag-to-reorder in UI

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Search Results                        │
│  Song │ ➕ (Queue) │ 📋 (Add to Playlist)                │
└────────────────────┬──────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    /queue/add             Add-to-Playlist Modal
        │                         │
        │                         ├─► Select Playlist
        │                         │
        │                         └─► /playlists/{id}/
        │                              add-track-from-source
        │
    Uses Search Cache      Uses Search Cache
    (Metadata Available)    (Metadata Available)
        │                         │
        ▼                         ▼
    ┌──────────────────────────────────┐
    │   Track Created in DB            │
    │   (From Cache Metadata)           │
    └──────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    /queue/play-now         Playlist View
        │                         │
        │                    ▶ Play (entire)
        │                    Click Song (individual)
        │                    ➕ Add to Queue
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │   Queue (Single Authority)│
        │   Now Playing / Next      │
        └──────────────────────────┘
```

---

## Notes

- **Cache Persistence**: Cache is NOT cleared after add-to-playlist. This allows users to add multiple songs to different playlists from the same search, matching typical music app behavior.
- **Uniqueness**: DB constraint prevents same track appearing twice in same playlist.
- **Source Preservation**: Tracks retain source metadata, enabling consistent playback behavior.
- **Mobile Ready**: UI uses responsive design and modals work on all screen sizes.
