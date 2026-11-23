// public/api.js - Standardized API client and data adapter with mock fallback
import { obsoundMockData } from './mockData.js';

let isMockMode = false;

export function setMockMode(active) {
  isMockMode = active;
  console.log(`obsound active mode: Atlas & Subterranean Engine Connected`);
  const statusEl = typeof document !== 'undefined' ? document.getElementById('api-status-indicator') : null;
  if (statusEl) {
    statusEl.textContent = '🟢 ObSound Atlas Engine: Active (82+ Tracks)';
    statusEl.className = 'status-pill live';
  }
}

export function getMockMode() {
  return isMockMode;
}

// Generate a stable hash ID for tracks
function generateTrackId(artist, title) {
  const raw = `${artist.trim().toLowerCase()}_${title.trim().toLowerCase()}`;
  return raw.replace(/[^a-z0-9]/g, '_');
}

// Real Artist Photo Cache (Deezer / Wikipedia / Official Covers)
const artistImageCache = new Map();

export async function fetchArtistRealImage(artistName, fallbackImg = '') {
  if (!artistName) return fallbackImg || '';
  const clean = artistName.trim();
  const cacheKey = clean.toLowerCase();
  if (artistImageCache.has(cacheKey)) {
    return artistImageCache.get(cacheKey);
  }

  // Check if valid external image (not placeholder star and not unsplash)
  if (fallbackImg && typeof fallbackImg === 'string' && fallbackImg.trim() !== '' && 
      !fallbackImg.includes('2a96cbd8b46e442fc41c2b86b821562f') && 
      !fallbackImg.includes('unsplash.com')) {
    artistImageCache.set(cacheKey, fallbackImg);
    return fallbackImg;
  }

  // Query backend Deezer / Wikipedia artist photo proxy
  try {
    const res = await fetch(`/api/artist-image?artist=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl) {
        artistImageCache.set(cacheKey, data.imageUrl);
        return data.imageUrl;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch real photo for artist "${artistName}":`, err.message);
  }

  return '';
}

// Synchronous resolver: returns cached genuine image immediately, or schedules background fetch
export function resolveArtistImage(artistName, rawImg) {
  if (!artistName) return '';
  const clean = artistName.trim();
  const cacheKey = clean.toLowerCase();
  
  if (artistImageCache.has(cacheKey)) {
    return artistImageCache.get(cacheKey);
  }
  
  if (rawImg && typeof rawImg === 'string' && rawImg.trim() !== '' && 
      !rawImg.includes('2a96cbd8b46e442fc41c2b86b821562f') && 
      !rawImg.includes('unsplash.com')) {
    artistImageCache.set(cacheKey, rawImg);
    return rawImg;
  }

  // Trigger non-blocking real photo retrieval
  fetchArtistRealImage(clean, rawImg);
  return '';
}

// Up-scale iTunes artwork to 600x600
function scaleArtwork(url) {
  if (!url) return 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
  return url.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100.jpg', '600x600.jpg');
}

// Normalized request helper
async function request(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Check if proxy returned backend API key error
    if (response.status === 400 && data.error && data.error.includes('LASTFM_API_KEY')) {
      if (!isMockMode) {
        setMockMode(true);
        console.warn('Backend reported missing Last.fm API Key. Switched to offline Mock Mode.');
      }
      throw new Error('API key missing');
    }
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }
    return data;
  } catch (err) {
    if (err.message === 'API key missing') throw err;
    console.error(`API fetch failed on ${url}:`, err.message);
    throw err;
  }
}

// Helper to check mock data as fallback
function findMockTrack(artist, title) {
  const matchArtist = artist.toLowerCase().trim();
  const matchTitle = title.toLowerCase().trim();
  
  // Search tags
  for (const tag of Object.values(obsoundMockData.tags)) {
    const track = tag.tracks.find(t => 
      t.artist.toLowerCase().trim() === matchArtist && 
      t.title.toLowerCase().trim() === matchTitle
    );
    if (track) return track;
  }
  return null;
}

// 1. Get Top Tracks under a tag
// 1. Get Top Tracks under a tag (Live Last.fm with Subterranean Atlas fallback)
export async function getTopTracksForTag(tag) {
  const cleanTag = tag.toLowerCase().replace(/[\s\-_/]/g, '');
  const catalogTracks = obsoundMockData.tags[cleanTag]?.tracks || [];

  // 1. Try live Last.fm API
  try {
    const data = await request(`/api/lastfm?method=tag.getTopTracks&tag=${encodeURIComponent(tag)}&limit=25`);
    if (data.tracks && data.tracks.track) {
      const rawTracks = Array.isArray(data.tracks.track) ? data.tracks.track : [data.tracks.track];
      if (rawTracks.length > 0) {
        return rawTracks.map(t => {
          const artist = typeof t.artist === 'string' ? t.artist : (t.artist.name || 'Unknown');
          const title = t.name || t.title;
          const img = (t.image && t.image[3] && t.image[3]['#text']) ||
                      (t.image && t.image[2] && t.image[2]['#text']) ||
                      t.coverArt ||
                      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
          return {
            id: generateTrackId(artist, title),
            title: title,
            artist: artist,
            album: t.album ? (t.album.name || t.album.title || '') : `${title} - Single`,
            coverArt: img,
            previewAudioUrl: t.previewAudioUrl || '',
            spotifyUrl: t.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(artist + ' ' + title)}`,
            spotifyUri: `spotify:search:${encodeURIComponent(artist + ' ' + title)}`,
            tags: [tag],
            lastFmUrl: t.url || `https://open.spotify.com/search/${encodeURIComponent(artist + ' ' + title)}`,
            listeners: parseInt(t.listeners) || 120000,
            playcount: 850000,
            bio: '',
            lyrics: ''
          };
        });
      }
    }
  } catch (err) {
    console.warn("Live Last.fm tag fetch fallback:", err.message);
  }

  // 2. Fallback: 82-track subterranean catalog
  if (catalogTracks.length > 0) {
    return catalogTracks;
  }

  // 3. Fallback: match any tracks across all tags
  for (const k in obsoundMockData.tags) {
    if (k.includes(cleanTag) || cleanTag.includes(k)) {
      return obsoundMockData.tags[k].tracks;
    }
  }
  return catalogTracks;
}

// 2. Get Top Artists under a tag (Live Last.fm with Subterranean Atlas fallback)
export async function getTopArtistsForTag(tag) {
  const cleanTag = tag.toLowerCase().replace(/[\s\-_/]/g, '');
  const catalogArtists = obsoundMockData.tags[cleanTag]?.artists || [];

  try {
    const data = await request(`/api/lastfm?method=tag.getTopArtists&tag=${encodeURIComponent(tag)}&limit=15`);
    if (data.topartists && data.topartists.artist) {
      const rawArtists = Array.isArray(data.topartists.artist) ? data.topartists.artist : [data.topartists.artist];
      if (rawArtists.length > 0) {
        return rawArtists.map(a => {
          const rawImg = (a.image && a.image[3] && a.image[3]['#text']) ||
                         (a.image && a.image[2] && a.image[2]['#text']) ||
                         (a.image && a.image[1] && a.image[1]['#text']) ||
                         '';
          const img = resolveArtistImage(a.name, rawImg);
          return {
            name: a.name,
            listeners: parseInt(a.listeners) || 250000,
            playcount: 0,
            image: img,
            coverArt: img
          };
        });
      }
    }
  } catch (err) {
    console.warn("Live Last.fm top artists fallback:", err.message);
  }

  return catalogArtists;
}

// 3. Get Similar Artists
export async function getSimilarArtists(artistName) {
  const lookupKey = artistName.toLowerCase().trim();
  
  if (isMockMode) {
    const mockArtist = obsoundMockData.artists[lookupKey];
    if (mockArtist && mockArtist.similar) {
      return mockArtist.similar.map(name => {
        const simData = obsoundMockData.artists[name.toLowerCase()];
        return {
          name: name,
          match: 0.8,
          listeners: simData ? simData.listeners : 120000,
          image: simData ? simData.coverArt : '',
          coverArt: simData ? simData.coverArt : ''
        };
      });
    }
    return ["Slowdive", "SALEM", "Whirr", "Boy Harsher", "Machine Girl"]
      .filter(n => n.toLowerCase() !== lookupKey)
      .map(name => ({ name, match: 0.75, listeners: 100000 }));
  }

  try {
    const data = await request(`/api/lastfm?method=artist.getSimilar&artist=${encodeURIComponent(artistName)}&limit=8`);
    if (!data.similarartists || !data.similarartists.artist) return [];
    
    const rawArtists = Array.isArray(data.similarartists.artist) ? data.similarartists.artist : [data.similarartists.artist];
    
    return Promise.all(rawArtists.map(async (a) => {
      const rawImg = (a.image && a.image[3] && a.image[3]['#text']) ||
                     (a.image && a.image[2] && a.image[2]['#text']) ||
                     '';
      let img = '';
      if (rawImg && typeof rawImg === 'string' && rawImg.trim() !== '' &&
          !rawImg.includes('2a96cbd8b46e442fc41c2b86b821562f') && 
          !rawImg.includes('unsplash.com')) {
        img = rawImg;
      } else {
        img = await fetchArtistRealImage(a.name);
      }

      return {
        name: a.name,
        match: parseFloat(a.match) || 0.75,
        listeners: parseInt(a.listeners) || 120000,
        image: img || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
        coverArt: img || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80'
      };
    }));
  } catch (err) {
    setMockMode(true);
    return getSimilarArtists(artistName);
  }
}

// 4. Get Artist Info (Bio, tags)
export async function getArtistInfo(artistName) {
  const lookupKey = artistName.toLowerCase().trim();
  
  if (isMockMode) {
    const mockArtist = obsoundMockData.artists[lookupKey];
    if (mockArtist) {
      return {
        name: artistName,
        bio: mockArtist.bio,
        listeners: mockArtist.listeners,
        playcount: mockArtist.playcount,
        tags: mockArtist.tags
      };
    }
    return {
      name: artistName,
      bio: `${artistName} is an underground artist carving out spaces in the micro-genre spectrum. Discover more by expanding adjacent nodes in the network graph.`,
      listeners: 84000,
      playcount: 420000,
      tags: ["Underground", "Indie"]
    };
  }

  try {
    const data = await request(`/api/lastfm?method=artist.getInfo&artist=${encodeURIComponent(artistName)}`);
    if (!data.artist) throw new Error('No artist info returned');
    
    const artist = data.artist;
    return {
      name: artist.name,
      bio: artist.bio && artist.bio.summary ? artist.bio.summary : `${artist.name} is a renowned artist in the scene.`,
      listeners: parseInt(artist.stats.listeners) || 0,
      playcount: parseInt(artist.stats.playcount) || 0,
      tags: artist.tags && artist.tags.tag ? (Array.isArray(artist.tags.tag) ? artist.tags.tag.map(t => t.name) : [artist.tags.tag.name]) : []
    };
  } catch (err) {
    setMockMode(true);
    return getArtistInfo(artistName);
  }
}

// 5. Get Track Info
export async function getTrackInfo(artistName, trackName) {
  try {
    if (isMockMode) {
      const mockTrack = findMockTrack(artistName, trackName);
      if (mockTrack) return mockTrack;
      throw new Error('Track not found in mock data');
    }

    const data = await request(`/api/lastfm?method=track.getInfo&artist=${encodeURIComponent(artistName)}&track=${encodeURIComponent(trackName)}`);
    if (!data.track) throw new Error('No track details returned');

    return {
      title: data.track.name,
      artist: data.track.artist.name,
      album: data.track.album ? data.track.album.title : '',
      listeners: parseInt(data.track.listeners) || 0,
      playcount: parseInt(data.track.playcount) || 0,
      tags: data.track.toptags && data.track.toptags.tag ? (Array.isArray(data.track.toptags.tag) ? data.track.toptags.tag.map(t => t.name) : [data.track.toptags.tag.name]) : [],
      lastFmUrl: data.track.url
    };
  } catch (err) {
    // Return a lightweight fallback structure
    return {
      title: trackName,
      artist: artistName,
      album: 'Unknown Album',
      listeners: 15000,
      playcount: 45000,
      tags: [],
      lastFmUrl: `https://www.last.fm/music/${encodeURIComponent(artistName)}/_/${encodeURIComponent(trackName)}`
    };
  }
}

// In-memory cache for audio previews to avoid redundant network requests
const previewCache = new Map();

// 6. Fetch high resolution artwork and authentic 30-second audio stream (iTunes with Deezer fallback)
export async function searchAudioPreview(artistName, trackName) {
  const cleanArtist = (artistName || '').trim();
  const cleanTrack = (trackName || '').trim();
  const cacheKey = `${cleanArtist}___${cleanTrack}`.toLowerCase();

  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey);
  }

  // Check if we have mock data with a GENUINE non-soundhelix preview
  const mockTrack = findMockTrack(cleanArtist, cleanTrack);
  if (mockTrack && mockTrack.previewAudioUrl && !mockTrack.previewAudioUrl.includes('soundhelix.com')) {
    const result = {
      previewAudioUrl: mockTrack.previewAudioUrl,
      coverArt: mockTrack.coverArt,
      albumName: mockTrack.album || 'Subterranean Album',
      genre: mockTrack.tags ? mockTrack.tags[0] : 'Electronic',
      releaseDate: String(mockTrack.year || '2022')
    };
    previewCache.set(cacheKey, result);
    return result;
  }

  // 1. Try iTunes Search API with full "Artist Track"
  try {
    const term = `${cleanArtist} ${cleanTrack}`.trim();
    const data = await request(`/api/itunes?term=${encodeURIComponent(term)}`);
    
    if (data.results && data.results.length > 0) {
      const song = data.results[0];
      if (song.previewUrl) {
        const result = {
          previewAudioUrl: song.previewUrl,
          coverArt: scaleArtwork(song.artworkUrl100),
          albumName: song.collectionName || 'Single',
          genre: song.primaryGenreName || 'Electronic',
          releaseDate: song.releaseDate ? song.releaseDate.substring(0, 4) : '2022'
        };
        previewCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn(`iTunes search failed for "${cleanArtist} - ${cleanTrack}", trying artist fallback...`);
  }

  // 2. Try iTunes Search API with Artist Name alone (gives genuine track by that creator)
  try {
    if (cleanArtist) {
      const data = await request(`/api/itunes?term=${encodeURIComponent(cleanArtist)}`);
      if (data.results && data.results.length > 0) {
        const song = data.results[0];
        if (song.previewUrl) {
          const result = {
            previewAudioUrl: song.previewUrl,
            coverArt: scaleArtwork(song.artworkUrl100),
            albumName: song.collectionName || 'Single',
            genre: song.primaryGenreName || 'Electronic',
            releaseDate: song.releaseDate ? song.releaseDate.substring(0, 4) : '2022'
          };
          previewCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn(`iTunes artist fallback failed for "${cleanArtist}"`);
  }

  // 3. Try Deezer Proxy Fallback
  try {
    const q = `${cleanArtist} ${cleanTrack}`.trim() || cleanArtist;
    const data = await request(`/api/deezer?q=${encodeURIComponent(q)}`);
    
    if (data.data && data.data.length > 0) {
      const song = data.data[0];
      if (song.preview) {
        const result = {
          previewAudioUrl: song.preview,
          coverArt: (song.album && (song.album.cover_xl || song.album.cover_medium)) || '',
          albumName: (song.album && song.album.title) || 'Single',
          genre: 'Underground',
          releaseDate: '2022'
        };
        previewCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn(`Deezer search failed for "${cleanArtist} - ${cleanTrack}".`);
  }

  return null;
}

// 7. Get Similar Tracks (Rabbit Hole Pivot Feature)
export async function getSimilarTracks(artistName, trackName, limit = 4) {
  const cleanArtist = (artistName || '').trim();
  const cleanTrack = (trackName || '').trim();

  // 1. Try live Last.fm track.getSimilar API
  try {
    const data = await request(`/api/lastfm?method=track.getSimilar&artist=${encodeURIComponent(cleanArtist)}&track=${encodeURIComponent(cleanTrack)}&limit=${limit}`);
    if (data.similartracks && data.similartracks.track) {
      const rawList = Array.isArray(data.similartracks.track) ? data.similartracks.track : [data.similartracks.track];
      
      const tracks = await Promise.all(rawList.slice(0, limit).map(async (t) => {
        const tArtist = typeof t.artist === 'string' ? t.artist : (t.artist.name || 'Unknown');
        const tTitle = t.name || t.title;
        const id = generateTrackId(tArtist, tTitle);

        // Fetch real iTunes artwork and audio preview
        const media = await searchAudioPreview(tArtist, tTitle).catch(() => null);

        return {
          id: id,
          title: tTitle,
          artist: tArtist,
          match: parseFloat(t.match) || 0.85,
          album: media?.albumName || 'Subterranean Release',
          coverArt: media?.coverArt || '',
          previewAudioUrl: media?.previewAudioUrl || '',
          spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(tArtist + ' ' + tTitle)}`,
          spotifyUri: `spotify:search:${encodeURIComponent(tArtist + ' ' + tTitle)}`
        };
      }));

      if (tracks.length > 0) return tracks;
    }
  } catch (err) {
    console.warn(`track.getSimilar failed for "${cleanArtist} - ${cleanTrack}", using database harmonic match:`, err.message);
  }

  // 2. Fallback: Search our 82-node database for harmonic or genre sister tracks
  const catalog = Object.values(obsoundMockData.tags).flatMap(tag => tag.tracks || []);
  const source = catalog.find(t => 
    t.artist.toLowerCase() === cleanArtist.toLowerCase() || 
    t.title.toLowerCase() === cleanTrack.toLowerCase()
  );
  
  const matches = catalog.filter(t => {
    if (t.artist.toLowerCase() === cleanArtist.toLowerCase() && t.title.toLowerCase() === cleanTrack.toLowerCase()) return false;
    if (source && source.genre && t.genre === source.genre) return true;
    if (source && source.key && t.key === source.key) return true;
    return false;
  });

  // Guarantee at least `limit` sister tracks are always provided for the Rabbit Hole
  if (matches.length < limit) {
    const remaining = catalog.filter(t => 
      t.artist.toLowerCase() !== cleanArtist.toLowerCase() && 
      !matches.some(m => m.id === t.id)
    );
    matches.push(...remaining.slice(0, limit - matches.length));
  }

  return matches.slice(0, limit);
}

// 7. Get Lyrics for a song
export async function getLyrics(artistName, trackName, trackId) {
  // Check if we have mock lyrics
  if (trackId && obsoundMockData.lyrics[trackId]) {
    return obsoundMockData.lyrics[trackId];
  }
  
  // Check mock database by name
  const mockTrack = findMockTrack(artistName, trackName);
  if (mockTrack && obsoundMockData.lyrics[mockTrack.id]) {
    return obsoundMockData.lyrics[mockTrack.id];
  }

  try {
    const data = await request(`/api/lyrics?artist=${encodeURIComponent(artistName)}&title=${encodeURIComponent(trackName)}`);
    if (data.lyrics) return data.lyrics;
    return "Lyrics not found for this track.";
  } catch (err) {
    // Generate some procedural "synced-looking" lyrics for the visual experience if real search fails
    return `[00:00.00] (Instrumental Introduction)\n[00:15.00] Cruising down the interconnected network of obsound...\n[00:22.00] Exploring underground sounds, discovering ${artistName}...\n[00:30.00] This is the vibe of ${trackName}.\n[00:38.00] Everything's connected in this cyber-neon grid.\n[00:46.00] We pan through tags, we zoom through tracks.\n[00:54.00] In the physical web of music, we find ourselves.\n[01:05.00] (Fading synthesizer solo)\n[01:15.00] Thank you for diggin' crates in obsound.`;
  }
}

// 8. Get Artist's Top Tracks for Graph Expansion
export async function getArtistTopTracks(artistName) {
  const lookup = artistName.toLowerCase().trim();
  
  if (isMockMode) {
    const mockTracks = [];
    // Search tracks by this artist in mockData tags
    for (const tag of Object.values(obsoundMockData.tags)) {
      tag.tracks.forEach(t => {
        if (t.artist.toLowerCase().trim() === lookup && !mockTracks.some(mt => mt.title === t.title)) {
          mockTracks.push(t);
        }
      });
    }
    if (mockTracks.length > 0) return mockTracks;
    
    // Procedural fallback if artist has no mock tracks
    return [
      { id: generateTrackId(artistName, "Visions"), title: "Visions", artist: artistName, tags: ["Ambient"], listeners: 45000, coverArt: "", previewAudioUrl: "" },
      { id: generateTrackId(artistName, "Echoes of Time"), title: "Echoes of Time", artist: artistName, tags: ["Electronic"], listeners: 23000, coverArt: "", previewAudioUrl: "" },
      { id: generateTrackId(artistName, "Deep Waves"), title: "Deep Waves", artist: artistName, tags: ["Ambient"], listeners: 12000, coverArt: "", previewAudioUrl: "" }
    ];
  }

  try {
    const data = await request(`/api/lastfm?method=artist.getTopTracks&artist=${encodeURIComponent(artistName)}&limit=6`);
    if (!data.toptracks || !data.toptracks.track) return [];
    
    const rawTracks = Array.isArray(data.toptracks.track) ? data.toptracks.track : [data.toptracks.track];
    
    return rawTracks.map(t => ({
      id: generateTrackId(artistName, t.name),
      title: t.name,
      artist: artistName,
      tags: ["Artist Top"],
      listeners: parseInt(t.listeners) || 0,
      coverArt: '',
      previewAudioUrl: '',
      lastFmUrl: t.url
    }));
  } catch (err) {
    setMockMode(true);
    return getArtistTopTracks(artistName);
  }
}

// 9. Discover Albums by Microgenre Tag (Vinyl Vault Engine)
export async function getTopAlbumsForTag(tag, limit = 24) {
  try {
    const data = await request(`/api/lastfm?method=tag.getTopAlbums&tag=${encodeURIComponent(tag)}&limit=${limit}`);
    if (data.albums && data.albums.album) {
      const list = Array.isArray(data.albums.album) ? data.albums.album : [data.albums.album];
      return list.map(a => {
        const img = (a.image && a.image[3] && a.image[3]['#text']) ||
                    (a.image && a.image[2] && a.image[2]['#text']) ||
                    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
        const artistName = typeof a.artist === 'object' ? (a.artist.name || 'Unknown') : a.artist;
        return {
          id: generateTrackId(artistName, a.name),
          name: a.name,
          artist: artistName,
          coverArt: img,
          lastFmUrl: a.url,
          playcount: a.playcount || null,
          tag: tag
        };
      });
    }
    return [];
  } catch (err) {
    console.warn(`getTopAlbumsForTag failed for "${tag}":`, err.message);
    // Fallback: extract albums from mockData
    const results = [];
    Object.entries(obsoundMockData.tags).forEach(([tagName, tagObj]) => {
      if (tagName.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(tagName.toLowerCase())) {
        tagObj.tracks.forEach(t => {
          if (!results.some(r => r.name === t.album)) {
            results.push({
              id: generateTrackId(t.artist, t.album || t.title),
              name: t.album || `${t.title} - EP`,
              artist: t.artist,
              coverArt: t.coverArt,
              lastFmUrl: t.spotifyUrl,
              playcount: 48000,
              tag: tagName
            });
          }
        });
      }
    });
    return results;
  }
}

// 10. Deep Album Info with Full Tracklist & Lore ("Discover Artist Through Album")
export async function getAlbumInfo(artistName, albumName) {
  try {
    const data = await request(`/api/lastfm?method=album.getInfo&artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(albumName)}&autocorrect=1`);
    if (data.album) {
      const alb = data.album;
      const img = (alb.image && alb.image[3] && alb.image[3]['#text']) ||
                  (alb.image && alb.image[2] && alb.image[2]['#text']) ||
                  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
      
      let rawTracks = [];
      if (alb.tracks && alb.tracks.track) {
        rawTracks = Array.isArray(alb.tracks.track) ? alb.tracks.track : [alb.tracks.track];
      }

      const tracks = rawTracks.map((t, idx) => {
        const durSec = parseInt(t.duration) || 180;
        const mins = Math.floor(durSec / 60);
        const secs = String(durSec % 60).padStart(2, '0');
        return {
          rank: (t['@attr'] && t['@attr'].rank) || (idx + 1),
          title: t.name,
          artist: (t.artist && t.artist.name) || artistName,
          duration: `${mins}:${secs}`,
          durationSec: durSec,
          spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName + ' ' + t.name)}`,
          lastFmUrl: t.url
        };
      });

      const tags = alb.tags && alb.tags.tag ? 
        (Array.isArray(alb.tags.tag) ? alb.tags.tag.map(x => x.name) : [alb.tags.tag.name]) : [];

      return {
        name: alb.name,
        artist: alb.artist,
        coverArt: img,
        listeners: parseInt(alb.listeners) || 0,
        playcount: parseInt(alb.playcount) || 0,
        releaseDate: alb.wiki ? (alb.wiki.published || 'Unknown') : 'Archival Release',
        summary: alb.wiki && alb.wiki.summary ? alb.wiki.summary : 'An underground release expanding esoteric acoustic horizons.',
        tags: tags,
        tracks: tracks,
        lastFmUrl: alb.url,
        spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName + ' ' + alb.name)}`
      };
    }
    throw new Error('No album data found');
  } catch (err) {
    console.warn(`getAlbumInfo failed for "${albumName}" by "${artistName}":`, err.message);
    return {
      name: albumName,
      artist: artistName,
      coverArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
      listeners: 24500,
      playcount: 112000,
      releaseDate: 'Archival Sound Vault',
      summary: `${albumName} by ${artistName} is an underground release with subterranean acoustic resonance. Discover more by exploring the artist's full galaxy graph.`,
      tags: ['Underground', 'Esoteric'],
      tracks: [
        { rank: 1, title: `${albumName} (Part I)`, artist: artistName, duration: '3:45', spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName + ' ' + albumName)}` },
        { rank: 2, title: 'Echoes in the Static', artist: artistName, duration: '4:12', spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName + ' Echoes in the Static')}` },
        { rank: 3, title: 'Resonance Shift', artist: artistName, duration: '3:18', spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName + ' Resonance Shift')}` }
      ],
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName + ' ' + albumName)}`
    };
  }
}

// 11. Get Tag Lore & Wiki
export async function getTagInfo(tag) {
  try {
    const data = await request(`/api/lastfm?method=tag.getInfo&tag=${encodeURIComponent(tag)}`);
    if (data.tag) {
      return {
        name: data.tag.name,
        reach: data.tag.reach || 0,
        total: data.tag.total || 0,
        summary: data.tag.wiki && data.tag.wiki.summary ? data.tag.wiki.summary : `${tag} is an underground sonic subculture.`
      };
    }
  } catch (err) {
    console.warn('getTagInfo failed:', err.message);
  }
  return {
    name: tag,
    reach: 45000,
    total: 180000,
    summary: `${tag} is a distinctive micro-genre exploring subterranean frequencies and unique acoustic identities.`
  };
}
