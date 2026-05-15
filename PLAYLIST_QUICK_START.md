# Playlist Feature - Quick Start Guide

## Frontend UI Overview

### 1. Search Results (Left Panel)
```
[Search Box]
├─ Song Title — Artist
│  ├─ 📋 (Add to Playlist button)
│  └─ ➕ (Add to Queue button)
├─ Song Title — Artist
│  ├─ 📋 
│  └─ ➕
└─ [Audio Player]
```
**Click song title** to play immediately

### 2. Right Sidebar Sections

#### Queue Section
```
Queue
├─ [🗑 Clear Button]
├─ Song 1 ❌
├─ Song 2 ❌ (currently playing)
└─ Song 3 ❌
```

#### My Playlists Section (NEW!)
```
My Playlists
├─ [➕ New Button]
├─ Playlist 1 ❌
├─ Playlist 2 ❌
└─ Playlist 3 ❌
```

#### Playlist View (NEW! - Shown when clicked)
```
[← Back Button]

Playlist Name
├─ [▶ Play Button]
├─ Song 1 [➕] [❌]
├─ Song 2 [➕] [❌]
└─ Song 3 [➕] [❌]
```

---

## Key Features

### Feature 1: Create Playlist
1. Click **➕ New** in "My Playlists"
2. Modal appears with:
   - Text field: Enter playlist name
   - Checkbox: Make it public (optional)
   - Button: Create
3. Playlist now appears in library

### Feature 2: Add Song to Playlist
**From Search Results:**
1. Search for a song
2. Click **📋** button next to song
3. Modal shows all your playlists
4. Click playlist name → **Added!**
5. Can add same song to multiple playlists from same search
6. Cache clears only on next new search

**From Playlist View:**
1. Open a playlist (click name in library)
2. Can't add from here, but can manage songs

### Feature 3: View Playlist
1. Click playlist name in "My Playlists"
2. Shows all songs in playlist
3. Each song has:
   - **Title** (clickable) - Play this song now
   - **➕** - Add to current queue
   - **❌** - Remove from playlist
4. **▶ Play** button plays entire playlist

### Feature 4: Play Playlist
**Option A: Play Entire Playlist**
1. Click playlist name to view
2. Click **▶ Play** button
3. Entire playlist becomes your queue
4. Plays from first song

**Option B: Play Individual Song**
1. View playlist
2. Click any song title
3. Song plays immediately
4. Song added to queue
5. Next/Previous still works

### Feature 5: Add Playlist Song to Queue
1. View a playlist
2. Click **➕** next to any song
3. Song appends to current queue
4. Doesn't stop current playback

### Feature 6: Delete Playlist
1. In "My Playlists" list
2. Click **❌** next to playlist name
3. Confirm deletion
4. Playlist disappears (songs remain in DB)

### Feature 7: Delete Song from Playlist
1. View a playlist
2. Click **❌** next to any song
3. Song removed from playlist
4. Song still in DB/other playlists

---

## Caching Behavior

### What is Search Cache?
- Temporary storage of search results
- Contains: source, source_track_id, title, duration
- **Cleared only**: When you do a new search

### How it Helps Add-to-Playlist
```
1. User searches "beatles"
   └─ Cache populated with 20 results

2. User clicks 📋 on song 1
   └─ Uses cache metadata
   └─ Creates track in DB
   └─ Adds to Playlist A

3. User clicks 📋 on song 2
   └─ Uses SAME cache metadata
   └─ Adds to Playlist B
   └─ Cache still active

4. User searches "elvis"
   └─ Cache cleared & refilled
   └─ Old songs no longer in cache
   └─ UI resets

5. When user plays any song:
   └─ Track was already created
   └─ Metadata available
   └─ No 422 errors!
```

### Why This Matters
- **No 422 Errors**: Metadata guaranteed available
- **Clean Database**: Tracks only added when user explicitly saves
- **Efficient**: Reuses existing search infrastructure
- **User-Friendly**: Users can add multiple songs per search

---

## API Endpoints (For Reference)

### Playlist Management
```
POST   /playlists
GET    /playlists
DELETE /playlists/{id}
```

### Playlist Tracks
```
POST   /playlists/{id}/add-track-from-source    [NEW - From Search]
POST   /playlists/{id}/tracks                    [Add by track_id]
GET    /playlists/{id}/tracks                    [Get all songs]
DELETE /playlists/{id}/tracks/{track_id}         [Remove song]
PUT    /playlists/{id}/tracks/reorder            [Reorder songs]
POST   /playlists/{id}/play                      [Play entire playlist]
```

### Example: Add Song from Search
```javascript
POST /playlists/{playlist_id}/add-track-from-source
{
  "source": "jiosaavn",
  "source_track_id": "abc123",
  "title": "Song Name",
  "duration": 180
}
```
Returns: `{status: "added", track_id: "uuid"}`

---

## Troubleshooting

### Q: I can't add songs to playlist
**A:** Make sure you:
1. Created at least one playlist (➕ New)
2. Clicked 📋 button (not the song title)
3. Selected a playlist from modal
4. Check browser console for errors

### Q: Songs aren't playing from playlist
**A:** Try:
1. Click the song title (not the buttons)
2. Check queue loads with next tracks
3. Verify player has correct source metadata

### Q: Playlist songs disappeared
**A:** This happens if:
1. You deleted the playlist (❌ button)
2. You removed individual songs (❌ in playlist view)
3. Intentional operation

### Q: "Track already exists in playlist"
**A:** This means:
1. You tried adding same song twice
2. To same playlist
3. Feature: Playlists don't allow duplicates

---

## Best Practices

1. **Organize Multiple Playlists**
   - Create playlists by mood/genre/artist
   - Use descriptive names
   - Can reuse songs across playlists

2. **Mix & Match Playback**
   - Use Queue for temporary additions
   - Use Playlists for permanent collections
   - Both work together seamlessly

3. **Efficient Searching**
   - Search once, add to multiple playlists
   - Cache saves you time (no new search needed)
   - Just click 📋 multiple times

4. **Mobile-Friendly**
   - All modals work on phone/tablet
   - Touch-friendly button sizes
   - Responsive layout

---

## Feature Comparison: Queue vs Playlist

| Feature | Queue | Playlist |
|---------|-------|----------|
| Persistent | ❌ No | ✅ Yes |
| Auto-cleared | After restart | Never |
| Multiple adds | ✅ Yes | ✅ Yes (no duplicates) |
| Reordering | ❌ Manual | ✅ Auto-ordered |
| Sharing | ❌ No | 🔄 Planned |
| Edit mode | ❌ Limited | ✅ Full |
| Use case | Quick play | Collections |

---

## File Changes Summary

### Backend
- **app/api/routes/playlists.py**
  - Added: `add-track-from-source` endpoint
  - Updated: `list_playlist_tracks` response
  - New imports: TrackRepository, search_cache

### Frontend  
- **static/index.html**
  - Complete rewrite with new UI
  - Added: Playlist library management
  - Added: Modals for create/add
  - Added: Comprehensive JavaScript handlers
  - Improved: Styling and responsive design

---

## Next Steps (Optional Enhancements)

1. **Playlist Images**: Add cover art
2. **Collaborative Playlists**: Share with friends
3. **Bulk Operations**: Select multiple songs
4. **Playlist Stats**: Duration, song count
5. **Import/Export**: Share via file
6. **Smart Playlists**: Auto-generated (e.g., "Recently Added")

---

Generated: February 7, 2026
Status: ✅ Complete & Ready to Test
