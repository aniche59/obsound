// public/api.js - Standardized API client and data adapter with mock fallback
import { obsoundMockData } from './mockData.js';

let isMockMode = false;

export function setMockMode(active) {
  isMockMode = active;
  console.log(`obsound active mode: ${isMockMode ? 'MOCK/DEMO' : 'LIVE API'}`);
  const statusEl = document.getElementById('api-status-indicator');
  if (statusEl) {
    statusEl.textContent = isMockMode ? 'Mock Discovery Mode' : 'Connected to Last.fm';
    statusEl.className = isMockMode ? 'status-pill mock' : 'status-pill live';
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
export async function getTopTracksForTag(tag) {
  const normalizedTag = tag.toLowerCase().trim();
  
  if (isMockMode) {
    const mock = obsoundMockData.tags[normalizedTag];
    return mock ? mock.tracks : [];
  }

  try {
    const data = await request(`/api/lastfm?method=tag.getTopTracks&tag=${encodeURIComponent(tag)}&limit=30`);
    if (!data.tracks || !data.tracks.track) return [];
    
    const rawTracks = Array.isArray(data.tracks.track) ? data.tracks.track : [data.tracks.track];
    
    return rawTracks.map(t => {
      const artist = typeof t.artist === 'string' ? t.artist : t.artist.name;
      return {
        id: generateTrackId(artist, t.name),
        title: t.name,
        artist: artist,
        album: t.album ? t.album.name : '',
        coverArt: '', // Will be loaded dynamically via iTunes/Deezer
        previewAudioUrl: '', // Will be loaded dynamically via iTunes/Deezer
        tags: [tag],
        lastFmUrl: t.url,
        listeners: parseInt(t.listeners) || 0,
        playcount: 0,
        bio: '',
        lyrics: ''
      };
    });
  } catch (err) {
    // If live call fails, fallback to mock if available
    setMockMode(true);
    const mock = obsoundMockData.tags[normalizedTag];
    return mock ? mock.tracks : [];
  }
}

// 2. Get Top Artists under a tag
export async function getTopArtistsForTag(tag) {
  const normalizedTag = tag.toLowerCase().trim();
  
  if (isMockMode) {
    const mock = obsoundMockData.tags[normalizedTag];
    return mock ? mock.artists : [];
  }

  try {
    const data = await request(`/api/lastfm?method=tag.getTopArtists&tag=${encodeURIComponent(tag)}&limit=15`);
    if (!data.topartists || !data.topartists.artist) return [];
    
    const rawArtists = Array.isArray(data.topartists.artist) ? data.topartists.artist : [data.topartists.artist];
    
    return rawArtists.map(a => ({
      name: a.name,
      listeners: parseInt(a.listeners) || 0,
      playcount: 0
    }));
  } catch (err) {
    setMockMode(true);
    const mock = obsoundMockData.tags[normalizedTag];
    return mock ? mock.artists : [];
  }
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
          listeners: simData ? simData.listeners : 120000
        };
      });
    }
    // Fallback to random connected nodes
    return ["Kavinsky", "HOME", "The Midnight", "Gunship", "Com Truise"]
      .filter(n => n.toLowerCase() !== lookupKey)
      .map(name => ({ name, match: 0.5, listeners: 100000 }));
  }

  try {
    const data = await request(`/api/lastfm?method=artist.getSimilar&artist=${encodeURIComponent(artistName)}&limit=8`);
    if (!data.similarartists || !data.similarartists.artist) return [];
    
    const rawArtists = Array.isArray(data.similarartists.artist) ? data.similarartists.artist : [data.similarartists.artist];
    
    return rawArtists.map(a => ({
      name: a.name,
      match: parseFloat(a.match) || 0.5,
      listeners: 0
    }));
  } catch (err) {
    setMockMode(true);
    return getSimilarArtists(artistName); // Retry in mock mode
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

// 6. Fetch high resolution artwork and 30-second audio stream (iTunes with Deezer fallback)
export async function searchAudioPreview(artistName, trackName) {
  // Check if we have mock data first
  const mockTrack = findMockTrack(artistName, trackName);
  if (mockTrack && mockTrack.previewAudioUrl) {
    return {
      previewAudioUrl: mockTrack.previewAudioUrl,
      coverArt: mockTrack.coverArt,
      albumName: mockTrack.album || 'Mock Album',
      genre: mockTrack.tags ? mockTrack.tags[0] : 'Electronic',
      releaseDate: '2020'
    };
  }

  // 1. Try iTunes Proxy
  try {
    const term = `${artistName} ${trackName}`;
    const data = await request(`/api/itunes?term=${encodeURIComponent(term)}`);
    
    if (data.results && data.results.length > 0) {
      const song = data.results[0];
      if (song.previewUrl) {
        return {
          previewAudioUrl: song.previewUrl,
          coverArt: scaleArtwork(song.artworkUrl100),
          albumName: song.collectionName || 'Single',
          genre: song.primaryGenreName || 'Electronic',
          releaseDate: song.releaseDate ? song.releaseDate.substring(0, 4) : 'Unknown'
        };
      }
    }
  } catch (err) {
    console.warn(`iTunes search failed for "${artistName} - ${trackName}", falling back to Deezer...`);
  }

  // 2. Try Deezer Proxy Fallback
  try {
    const q = `${artistName} ${trackName}`;
    const data = await request(`/api/deezer?q=${encodeURIComponent(q)}`);
    
    if (data.data && data.data.length > 0) {
      const song = data.data[0];
      if (song.preview) {
        return {
          previewAudioUrl: song.preview,
          coverArt: song.album.cover_xl || song.album.cover_medium || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
          albumName: song.album.title || 'Single',
          genre: 'Underground',
          releaseDate: 'Unknown'
        };
      }
    }
  } catch (err) {
    console.warn(`Deezer search failed for "${artistName} - ${trackName}". Using general test stream.`);
  }

  // 3. Last resort - Return standard test audio stream and a beautiful abstract cover
  const testTracks = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
  ];
  
  // Hash the track name to select a consistent test song
  let hash = 0;
  const combined = `${artistName} ${trackName}`;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % testTracks.length;
  
  // Use a nice unsplash wallpaper based on hash
  const imageIds = [
    "photo-1618005182384-a83a8bd57fbe", // neon spiral
    "photo-1508700115892-45ecd05ae2ad", // retro glowing grid
    "photo-1514525253161-7a46d19cd819", // neon concert lights
    "photo-1511671782779-c97d3d27a1d4", // pink microphone/neon
    "photo-1518609878373-06d740f60d8b"  // retro warm glow
  ];
  const imageId = imageIds[Math.abs(hash) % imageIds.length];
  
  return {
    previewAudioUrl: testTracks[index],
    coverArt: `https://images.unsplash.com/${imageId}?w=600&auto=format&fit=crop&q=80`,
    albumName: 'Abstract Soundwave Collection',
    genre: 'Microgenre Discovery',
    releaseDate: new Date().getFullYear().toString()
  };
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
