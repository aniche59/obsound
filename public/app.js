// public/app.js - Application Coordinator & UI State Manager
import { MusicGraph } from './graph.js';
import { AudioPlayer } from './player.js';
import { CrateManager } from './crate.js';
import * as api from './api.js';

// Curated Micro-Genres
const CURATED_TAGS = [
  'Synthwave', 'Vaporwave', 'Shoegaze', 'Chiptune',
  'Math Rock', 'City Pop', 'Darkwave', 'Mid West Emo',
  'Dungeon Synth', 'Downtempo', 'Afrobeats', 'Future Funk'
];

// Premium Vector SVGs for Player Controls
const PLAY_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const HEART_EMPTY_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>`;
const HEART_FILLED_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
const VOL_HIGH_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
const VOL_MUTE_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Core Engines
  const graph = new MusicGraph('graph-canvas');
  const player = new AudioPlayer('visualizer-canvas');
  const crate = new CrateManager();

  // Active track queue (dynamic playlist)
  let activeTrackQueue = [];
  let currentPlayingTrack = null;

  // Start graph physics loop
  graph.start();

  // 2. Bind UI Elements
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const suggestionsPanel = document.getElementById('suggestions-panel');
  const tagList = document.getElementById('tag-list');
  
  const detailsPanel = document.getElementById('details-panel');
  const detailsContent = document.getElementById('details-content');
  const closeDetailsBtn = document.getElementById('close-details-btn');
  
  const cratePanel = document.getElementById('crate-panel');
  const crateList = document.getElementById('crate-list');
  const crateBadge = document.getElementById('crate-badge');
  const toggleCratePanelBtn = document.getElementById('toggle-crate-panel-btn');
  const closeCrateBtn = document.getElementById('close-crate-btn');
  const exportCrateBtn = document.getElementById('export-crate-btn');
  const importCrateFile = document.getElementById('import-crate-file');
  const clearCrateBtn = document.getElementById('clear-crate-btn');

  const lyricsModal = document.getElementById('lyrics-modal');
  const lyricsModalTitle = document.getElementById('lyrics-modal-title');
  const lyricsContent = document.getElementById('lyrics-content');
  const closeLyricsBtn = document.getElementById('close-lyrics-btn');

  // Player Elements
  const playerPlayBtn = document.getElementById('player-play-btn');
  const playerPrevBtn = document.getElementById('player-prev-btn');
  const playerNextBtn = document.getElementById('player-next-btn');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playerArtwork = document.getElementById('player-artwork');
  const playerFavoriteBtn = document.getElementById('player-favorite-btn');
  const progressSlider = document.getElementById('progress-slider');
  const currentTimeLabel = document.getElementById('current-time');
  const totalDurationLabel = document.getElementById('total-duration');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeMuteBtn = document.getElementById('volume-mute-btn');

  // Check backend server connection on startup
  async function checkConnection() {
    try {
      // Small check against proxy health
      const statusEl = document.getElementById('api-status-indicator');
      statusEl.textContent = 'Connecting...';
      
      // Attempt tag call
      await api.getTopTracksForTag('Synthwave');
      // If successful (doesn't throw auth error), ensure setMockMode(false)
      if (!api.getMockMode()) {
        api.setMockMode(false);
      }
    } catch (err) {
      console.warn("Connection test completed with mock fallback active.");
    }
  }

  // 3. UI Synchronization Handlers
  
  // Format seconds to MM:SS
  function formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Update Bottom Player Info
  function syncPlayerUI(track) {
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    playerArtwork.src = track.coverArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&auto=format&fit=crop&q=80';
    
    // Heart icon state
    if (crate.hasTrack(track.id)) {
      playerFavoriteBtn.innerHTML = HEART_FILLED_SVG;
      playerFavoriteBtn.title = 'Remove from Crate';
    } else {
      playerFavoriteBtn.innerHTML = HEART_EMPTY_SVG;
      playerFavoriteBtn.title = 'Add to Crate';
    }

    // Spotify quick link state
    const spotifyBtn = document.getElementById('player-spotify-btn');
    if (spotifyBtn) {
      spotifyBtn.href = `https://open.spotify.com/search/${encodeURIComponent(track.artist + ' ' + track.title)}`;
      spotifyBtn.title = `Listen to "${track.title}" on Spotify`;
    }
  }

  // Render Saved tracks list inside Crate Panel
  function renderCrateList(tracks) {
    crateBadge.textContent = tracks.length;
    
    if (tracks.length === 0) {
      crateList.innerHTML = '<p class="empty-message">Your crate is empty. Click the heart icon on any track card to start digging!</p>';
      return;
    }

    crateList.innerHTML = '';
    tracks.forEach((track, index) => {
      const el = document.createElement('div');
      el.className = 'crate-item';
      if (currentPlayingTrack && currentPlayingTrack.id === track.id) {
        el.classList.add('playing');
      }
      
      el.innerHTML = `
        <img src="${track.coverArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=80&auto=format&fit=crop&q=80'}" alt="Cover">
        <div class="crate-item-meta">
          <h5>${track.title}</h5>
          <p>${track.artist}</p>
        </div>
        <div class="crate-item-actions">
          <button class="icon-btn-small play-crate-item-btn" title="Play">▶️</button>
          <button class="icon-btn-small remove-crate-item-btn" title="Remove">&times;</button>
        </div>
      `;

      // Play bookmark track
      el.querySelector('.play-crate-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        playTrackDirectly(track, tracks, index);
      });

      // Remove bookmark track
      el.querySelector('.remove-crate-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        crate.removeTrack(track.id);
      });

      // Click row to focus node in graph
      el.addEventListener('click', () => {
        seedAndFocusTrack(track);
      });

      crateList.appendChild(el);
    });
  }

  // 4. Graph Seeding & Expansions (Web of Interconnections)

  // Seed and focus a track node in case it doesn't exist
  function seedAndFocusTrack(track) {
    // Add artist node first
    graph.addNode(track.artist.toLowerCase(), track.artist, 'artist');
    
    // Add track node
    const trackNode = graph.addNode(track.id, track.title, 'track', track);
    graph.addLink(track.artist.toLowerCase(), track.id);
    
    graph.focusNode(track.id);
    displayTrackDetails(track);
  }

  // Seed graph with a central Tag node
  async function seedTagGraph(tagName) {
    graph.clear();
    const tagId = `tag_${tagName.toLowerCase()}`;
    graph.addNode(tagId, `#${tagName}`, 'tag', { tagName });
    graph.focusNode(tagId);
    
    await expandTagNode(tagId, tagName);
  }

  // Expanding Tag Node: fetches artists and tracks
  async function expandTagNode(nodeId, tagName) {
    try {
      // Show loading status
      const indicator = document.getElementById('api-status-indicator');
      const originalText = indicator.textContent;
      indicator.textContent = 'Loading Network...';
      
      // Fetch data in parallel
      const [tracks, artists] = await Promise.all([
        api.getTopTracksForTag(tagName),
        api.getTopArtistsForTag(tagName)
      ]);

      indicator.textContent = originalText;

      if (tracks.length === 0) return;

      // Seed queue with tracks under this tag
      activeTrackQueue = tracks;

      // 1. Add Artists as spokes connected to the tag hub
      const artistsLimit = Math.min(artists.length, 6);
      for (let i = 0; i < artistsLimit; i++) {
        const artist = artists[i];
        const artistId = artist.name.toLowerCase();
        
        graph.addNode(artistId, artist.name, 'artist', artist);
        graph.addLink(nodeId, artistId);
      }

      // 2. Add Tracks connected to their respective Artists
      tracks.forEach(track => {
        const artistId = track.artist.toLowerCase();
        
        // If the artist node exists, connect track to artist. Else connect directly to the tag hub.
        if (graph.nodeMap.has(artistId)) {
          graph.addNode(track.id, track.title, 'track', track);
          graph.addLink(artistId, track.id);
        } else {
          // Connect to tag directly if artist wasn't in top list
          graph.addNode(track.id, track.title, 'track', track);
          graph.addLink(nodeId, track.id);
        }
      });
      
    } catch (err) {
      console.error("Failed to expand tag node:", err);
    }
  }

  // Expanding Artist Node: fetches similar artists
  async function expandArtistNode(artistNode) {
    try {
      const similar = await api.getSimilarArtists(artistNode.label);
      
      const limit = Math.min(similar.length, 5);
      for (let i = 0; i < limit; i++) {
        const simArtist = similar[i];
        const simId = simArtist.name.toLowerCase();
        
        graph.addNode(simId, simArtist.name, 'artist', simArtist);
        graph.addLink(artistNode.id, simId, 160); // slightly longer link for spacing
      }
    } catch (err) {
      console.error("Failed to expand artist node:", err);
    }
  }

  // Expanding Artist Tracks on Graph Discovery
  async function expandArtistTracks(artistNode) {
    try {
      const indicator = document.getElementById('api-status-indicator');
      const originalText = indicator.textContent;
      indicator.textContent = 'Loading Tracks...';
      
      const tracks = await api.getArtistTopTracks(artistNode.label);
      
      indicator.textContent = originalText;
      
      if (tracks.length === 0) {
        alert("No tracks found for this artist.");
        return;
      }

      // Merge into the global queue
      tracks.forEach(track => {
        // Only push to active list if not already present
        if (!activeTrackQueue.some(t => t.id === track.id)) {
          activeTrackQueue.push(track);
        }
        
        graph.addNode(track.id, track.title, 'track', track);
        graph.addLink(artistNode.id, track.id, 95);
      });
      
      graph.focusNode(artistNode.id);
    } catch (err) {
      console.error("Failed to expand artist tracks:", err);
    }
  }

  // 5. Node Detail Display Handlers

  async function displayTagDetails(node) {
    const tagName = node.data.tagName;
    
    detailsContent.innerHTML = `
      <div class="detail-header">
        <h2 class="detail-title">#${tagName}</h2>
        <p class="detail-subtitle">Micro-genre Discovery Web</p>
      </div>
      <div class="detail-bio">
        Explore tracks and artists crowdfunded and tagged under the "${tagName}" subgenre. Click on surrounding artist spokes to find similarities, or play tracks to dig details.
      </div>
      <div class="action-buttons">
        <button id="detail-expand-tag-btn" class="btn btn-primary">Refresh Connections</button>
      </div>
    `;

    document.getElementById('detail-expand-tag-btn').addEventListener('click', () => {
      expandTagNode(node.id, tagName);
    });

    detailsPanel.classList.remove('hidden');
  }

  async function displayArtistDetails(node) {
    detailsContent.innerHTML = `
      <div class="detail-header">
        <h2 class="detail-title">${node.label}</h2>
        <p class="detail-subtitle">Loading artist information...</p>
      </div>
      <div class="placeholder-details">
        <div class="radar-ping"></div>
      </div>
    `;
    detailsPanel.classList.remove('hidden');

    try {
      const info = await api.getArtistInfo(node.label);
      
      // Update details content
      detailsContent.innerHTML = `
        <div class="detail-header">
          <h2 class="detail-title">${info.name}</h2>
          <p class="detail-subtitle">Relational Music Node</p>
        </div>
        
        <div class="detail-stats">
          <div class="stat-box">
            <span class="stat-label">Listeners</span>
            <span class="stat-value">${info.listeners.toLocaleString()}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Playcount</span>
            <span class="stat-value">${info.playcount.toLocaleString()}</span>
          </div>
        </div>

        <div class="detail-bio">${info.bio}</div>

        <div class="detail-section">
          <h4>Top Associated Tags</h4>
          <div class="detail-tags">
            ${info.tags.map(t => `<span class="mini-tag">#${t}</span>`).join('')}
          </div>
        </div>

        <div class="action-buttons" style="display: flex; gap: 8px;">
          <button id="detail-expand-artist-btn" class="btn btn-primary" style="flex: 1;">🔍 Similar Artists</button>
          <button id="detail-expand-tracks-btn" class="btn btn-secondary" style="flex: 1;">🎵 Expand Tracks</button>
        </div>
      `;

      document.getElementById('detail-expand-artist-btn').addEventListener('click', () => {
        expandArtistNode(node);
      });
      
      document.getElementById('detail-expand-tracks-btn').addEventListener('click', () => {
        expandArtistTracks(node);
      });

    } catch (err) {
      detailsContent.innerHTML = `
        <div class="detail-header">
          <h2 class="detail-title">${node.label}</h2>
          <p class="detail-subtitle">Failed to load info</p>
        </div>
        <p class="detail-bio">This artist is available for graph expansion. Click the expand buttons to build connections.</p>
        <div class="action-buttons" style="display: flex; gap: 8px;">
          <button id="detail-expand-artist-btn" class="btn btn-primary" style="flex: 1;">🔍 Similar Artists</button>
          <button id="detail-expand-tracks-btn" class="btn btn-secondary" style="flex: 1;">🎵 Expand Tracks</button>
        </div>
      `;
      document.getElementById('detail-expand-artist-btn').addEventListener('click', () => {
        expandArtistNode(node);
      });
      
      document.getElementById('detail-expand-tracks-btn').addEventListener('click', () => {
        expandArtistTracks(node);
      });
    }
  }

  async function displayTrackDetails(track) {
    const isBookmarked = crate.hasTrack(track.id);
    
    detailsContent.innerHTML = `
      <div class="detail-header">
        <img class="detail-cover" id="detail-cover-img" src="${track.coverArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80'}" alt="Cover">
        <h2 class="detail-title">${track.title}</h2>
        <p class="detail-subtitle">by ${track.artist}</p>
      </div>

      <div class="detail-stats">
        <div class="stat-box">
          <span class="stat-label">Listeners</span>
          <span class="stat-value" id="detail-listeners">${track.listeners > 0 ? track.listeners.toLocaleString() : 'Loading...'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Subgenre</span>
          <span class="stat-value">${track.tags && track.tags[0] ? track.tags[0] : 'Discover'}</span>
        </div>
      </div>

      <div class="action-buttons" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
        <div style="display: flex; gap: 8px;">
          <button id="detail-play-btn" class="btn btn-primary" style="flex: 1;">▶ Play Preview</button>
          <button id="detail-favorite-btn" class="btn btn-secondary" style="flex: 1;">${isBookmarked ? 'Remove Library' : 'Save to Library'}</button>
        </div>
        <div style="display: flex; gap: 8px;">
          <a id="detail-spotify-btn" target="_blank" href="https://open.spotify.com/search/${encodeURIComponent(track.artist + ' ' + track.title)}" class="btn" style="flex: 1; background: #1db954; color: #000; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; border-radius: var(--radius-md);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            Play on Spotify
          </a>
          <a id="detail-lastfm-btn" target="_blank" href="https://www.last.fm/music/${encodeURIComponent(track.artist)}/_/${encodeURIComponent(track.title)}" class="btn" style="flex: 1; background: #ba0000; color: #fff; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; border-radius: var(--radius-md);">
            Last.fm Page
          </a>
        </div>
        <button id="detail-lyrics-btn" class="btn btn-secondary" style="width: 100%;">View Lyrics</button>
      </div>
      
      <div class="detail-section">
        <h4>Track Information</h4>
        <div class="detail-bio" id="detail-track-album">Album: ${track.album || 'Loading...'}</div>
      </div>
    `;

    detailsPanel.classList.remove('hidden');

    // Load full preview info (audio stream url + artwork) on the fly
    try {
      const media = await api.searchAudioPreview(track.artist, track.title);
      
      // Update details object
      track.previewAudioUrl = media.previewAudioUrl;
      track.coverArt = media.coverArt;
      track.album = media.albumName;
      
      // Sync UI
      const coverImg = document.getElementById('detail-cover-img');
      if (coverImg) coverImg.src = media.coverArt;
      
      const albumDiv = document.getElementById('detail-track-album');
      if (albumDiv) albumDiv.textContent = `Album: ${media.albumName} (${media.releaseDate})`;

      // Update Spotify and Last.fm links
      const spotifyBtn = document.getElementById('detail-spotify-btn');
      if (spotifyBtn) spotifyBtn.href = `https://open.spotify.com/search/${encodeURIComponent(track.artist + ' ' + track.title)}`;

      // Fetch full scrobble stats if they aren't loaded
      if (track.listeners === 0) {
        const info = await api.getTrackInfo(track.artist, track.title);
        track.listeners = info.listeners;
        track.playcount = info.playcount;
        
        const listenersEl = document.getElementById('detail-listeners');
        if (listenersEl) listenersEl.textContent = info.listeners.toLocaleString();
      }

    } catch (err) {
      console.warn("Failed to load full track metadata:", err.message);
    }

    // Play button hook
    document.getElementById('detail-play-btn').addEventListener('click', () => {
      if (currentPlayingTrack && currentPlayingTrack.title === track.title) {
        player.togglePlay();
      } else {
        currentPlayingTrack = track;
        syncPlayerUI(track);
        player.setPlaylist([track], 0);
      }
    });

    // Favorite/Crate hook
    const favBtn = document.getElementById('detail-favorite-btn');
    favBtn.addEventListener('click', () => {
      if (crate.hasTrack(track.id)) {
        crate.removeTrack(track.id);
        favBtn.textContent = 'Save to Library';
      } else {
        crate.addTrack(track);
        favBtn.textContent = 'Remove Library';
      }
    });

    // Lyrics hook
    document.getElementById('detail-lyrics-btn').addEventListener('click', () => {
      showLyricsModal(track);
    });
  }

  // 6. Lyrics Modal Setup
  async function showLyricsModal(track) {
    lyricsModalTitle.textContent = `${track.title} — ${track.artist}`;
    lyricsContent.textContent = "Fetching lyrics from network database...";
    lyricsModal.classList.remove('hidden');

    try {
      const lyrics = await api.getLyrics(track.artist, track.title, track.id);
      lyricsContent.textContent = lyrics;
    } catch (err) {
      lyricsContent.textContent = "Could not fetch lyrics for this track. Enjoy the instrumental vibe!";
    }
  }

  // 7. Graph Interactions Event Binding
  
  graph.onNodeSelected(async (node) => {
    if (node.type === 'tag') {
      displayTagDetails(node);
    } else if (node.type === 'artist') {
      displayArtistDetails(node);
    } else if (node.type === 'track') {
      // Re-hydrate track structure if connected from artist expand
      const trackData = node.data && node.data.title ? node.data : {
        id: node.id,
        title: node.label,
        artist: graph.nodeMap.get(graph.links.find(l => l.target === node.id)?.source)?.label || 'Underground Artist',
        coverArt: '',
        previewAudioUrl: ''
      };
      
      displayTrackDetails(trackData);

      // Instantly start audio playback when clicked!
      try {
        currentPlayingTrack = trackData;
        syncPlayerUI(trackData);
        player.setPlaylist([trackData], 0);

        // Fetch high-res artwork & audio preview stream in background
        api.searchAudioPreview(trackData.artist, trackData.title).then(media => {
          if (media && media.previewAudioUrl) {
            trackData.previewAudioUrl = media.previewAudioUrl;
            trackData.coverArt = media.coverArt;
            trackData.album = media.albumName;
            syncPlayerUI(trackData);
          }
        }).catch(() => {});
      } catch (err) {
        console.warn("Playback error on node select:", err);
      }
    }
  });

  // Floating hover tooltips on graph nodes
  graph.onNodeHovered((node, clientX, clientY) => {
    const tooltip = document.getElementById('graph-tooltip');
    if (!node) {
      tooltip.classList.add('hidden');
      return;
    }

    tooltip.style.left = `${clientX + 14}px`;
    tooltip.style.top = `${clientY + 14}px`;
    
    let typeName = node.type === 'tag' ? 'genre' : node.type;
    tooltip.innerHTML = `
      <div class="tooltip-title">${node.label}</div>
      <div class="tooltip-meta">${typeName}</div>
    `;
    tooltip.classList.remove('hidden');
  });

  // 8. Bottom Player Event Synchronization

  // Play track directly from crate list
  function playTrackDirectly(track, queue, index) {
    currentPlayingTrack = track;
    syncPlayerUI(track);
    player.setPlaylist(queue, index);
  }

  // Player state play/pause changes
  player.onPlayStateChange = (playing) => {
    playerPlayBtn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
    
    // Sync sidebar play button if currently displaying the playing track
    const detailPlay = document.getElementById('detail-play-btn');
    if (detailPlay && currentPlayingTrack) {
      const detailTitle = document.querySelector('.detail-title');
      if (detailTitle && detailTitle.textContent === currentPlayingTrack.title) {
        detailPlay.textContent = playing ? 'Pause Preview' : 'Play Preview';
      }
    }

    // Sync class inside Crate List rows
    const rows = crateList.querySelectorAll('.crate-item');
    rows.forEach(row => {
      row.classList.remove('playing');
    });
    
    if (playing && currentPlayingTrack) {
      const activeRow = Array.from(rows).find(row => 
        row.querySelector('h5').textContent === currentPlayingTrack.title
      );
      if (activeRow) activeRow.classList.add('playing');
    }
  };

  // Track changed automatically in playlist
  player.onTrackChange = (track) => {
    currentPlayingTrack = track;
    syncPlayerUI(track);
    seedAndFocusTrack(track);
    renderCrateList(crate.getTracks()); // refresh list highlighted rows
  };

  // Time & Timeline Scrub slider updating
  player.onProgressUpdate = (current, duration) => {
    currentTimeLabel.textContent = formatTime(current);
    totalDurationLabel.textContent = formatTime(duration);
    
    if (duration > 0) {
      progressSlider.value = (current / duration) * 100;
    } else {
      progressSlider.value = 0;
    }
  };

  // Sync volume slider
  volumeSlider.addEventListener('input', (e) => {
    player.setVolume(parseFloat(e.target.value));
  });

  volumeMuteBtn.addEventListener('click', () => {
    if (player.getVolume() > 0) {
      volumeSlider.setAttribute('data-prev-vol', player.getVolume());
      player.setVolume(0);
      volumeSlider.value = 0;
      volumeMuteBtn.innerHTML = VOL_MUTE_SVG;
    } else {
      const prev = volumeSlider.getAttribute('data-prev-vol') || 0.8;
      player.setVolume(parseFloat(prev));
      volumeSlider.value = prev;
      volumeMuteBtn.innerHTML = VOL_HIGH_SVG;
    }
  });

  // User timeline scrubbing
  progressSlider.addEventListener('input', (e) => {
    if (player.audio.duration) {
      const targetTime = (parseFloat(e.target.value) / 100) * player.audio.duration;
      player.seek(targetTime);
    }
  });

  // Next / Prev control clicks
  playerNextBtn.addEventListener('click', () => player.next());
  playerPrevBtn.addEventListener('click', () => player.prev());
  playerPlayBtn.addEventListener('click', () => player.togglePlay());

  // Heart click on player
  playerFavoriteBtn.addEventListener('click', () => {
    if (!currentPlayingTrack) return;
    
    if (crate.hasTrack(currentPlayingTrack.id)) {
      crate.removeTrack(currentPlayingTrack.id);
    } else {
      crate.addTrack(currentPlayingTrack);
    }
    syncPlayerUI(currentPlayingTrack);
  });

  // 9. Crate Local Storage Dashboard Integrations
  
  // Refresh view on crate storage change
  crate.onChange((tracks) => {
    renderCrateList(tracks);
    if (currentPlayingTrack) {
      syncPlayerUI(currentPlayingTrack);
    }
  });

  // Export crate JSON
  exportCrateBtn.addEventListener('click', () => {
    crate.exportCrate();
  });

  // Import crate JSON
  importCrateFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const count = await crate.importCrate(file);
      alert(`Success! Imported ${count} new tracks into your crate.`);
      importCrateFile.value = ''; // clear input
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  });

  // Clear crate
  clearCrateBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to empty your crate? This will erase your bookmarks.")) {
      crate.clear();
    }
  });

  // 10. Sidebar Slide toggles
  toggleCratePanelBtn.addEventListener('click', () => {
    cratePanel.classList.toggle('hidden');
    // Hide details panel when showing crate for clean space
    if (!cratePanel.classList.contains('hidden')) {
      detailsPanel.classList.add('hidden');
    }
  });

  closeCrateBtn.addEventListener('click', () => {
    cratePanel.classList.add('hidden');
  });

  closeDetailsBtn.addEventListener('click', () => {
    detailsPanel.classList.add('hidden');
  });

  closeLyricsBtn.addEventListener('click', () => {
    lyricsModal.classList.add('hidden');
  });

  // Close modals on backdrop clicks
  window.addEventListener('click', (e) => {
    if (e.target === lyricsModal) {
      lyricsModal.classList.add('hidden');
    }
  });

  // 11. Autocomplete Search Bar Engine
  
  // Quick local search in curated tags + mockData database
  function getSuggestions(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    
    const results = [];
    
    // Check tags
    CURATED_TAGS.forEach(tag => {
      if (tag.toLowerCase().includes(q)) {
        results.push({ label: `#${tag}`, type: 'tag', raw: tag });
      }
    });

    // Check mock database artists & tracks for quick instant hits
    const mockData = api.getMockMode();
    
    // Add artists matching query
    Object.keys(api.obsoundMockData?.artists || {}).forEach(artistKey => {
      const name = api.obsoundMockData.artists[artistKey].name || artistKey;
      if (name.toLowerCase().includes(q) && !results.some(r => r.label === name)) {
        results.push({ label: name, type: 'artist', raw: name });
      }
    });

    // Add tracks matching query
    Object.keys(api.obsoundMockData?.lyrics || {}).forEach(trackKey => {
      // Find track info in tag structures
      for (const tagKey in api.obsoundMockData.tags) {
        const track = api.obsoundMockData.tags[tagKey].tracks.find(t => t.id === trackKey);
        if (track && (track.title.toLowerCase().includes(q) || track.artist.toLowerCase().includes(q))) {
          const displayLabel = `${track.artist} - ${track.title}`;
          if (!results.some(r => r.label === displayLabel)) {
            results.push({ label: displayLabel, type: 'track', raw: track });
          }
        }
      }
    });

    return results.slice(0, 8); // limit results
  }

  // Render suggestions
  function renderSuggestions(items) {
    if (items.length === 0) {
      suggestionsPanel.innerHTML = '<div class="suggestion-item">No matches found</div>';
      suggestionsPanel.classList.remove('hidden');
      return;
    }

    suggestionsPanel.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'suggestion-item';
      el.innerHTML = `
        <span>${item.label}</span>
        <span class="type-badge ${item.type}">${item.type}</span>
      `;

      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent input blur
        
        searchInput.value = '';
        suggestionsPanel.classList.add('hidden');
        searchClearBtn.classList.add('hidden');

        // Handle suggestion select
        if (item.type === 'tag') {
          seedTagGraph(item.raw);
        } else if (item.type === 'artist') {
          const artistNodeId = item.raw.toLowerCase();
          // Seed new artist center
          graph.clear();
          const node = graph.addNode(artistNodeId, item.raw, 'artist');
          graph.focusNode(artistNodeId);
          displayArtistDetails(node);
        } else if (item.type === 'track') {
          seedAndFocusTrack(item.raw);
        }
      });

      suggestionsPanel.appendChild(el);
    });
    suggestionsPanel.classList.remove('hidden');
  }

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.trim()) {
      searchClearBtn.classList.remove('hidden');
      const items = getSuggestions(val);
      renderSuggestions(items);
    } else {
      searchClearBtn.classList.add('hidden');
      suggestionsPanel.classList.add('hidden');
    }
  });

  searchInput.addEventListener('blur', () => {
    // Hide panel on delay to allow mouse clicks
    setTimeout(() => {
      suggestionsPanel.classList.add('hidden');
    }, 200);
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    suggestionsPanel.classList.add('hidden');
    searchInput.focus();
  });

  // 12. Pre-populate Curated Genre Selector
  CURATED_TAGS.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-pill';
    btn.textContent = `#${tag}`;
    btn.addEventListener('click', () => {
      // Remove active states from other tags
      document.querySelectorAll('.tag-pill').forEach(pill => pill.classList.remove('active'));
      btn.classList.add('active');
      
      // Close sidebars for fullscreen visual immersion
      cratePanel.classList.add('hidden');
      
      // Seed Tag Discovery
      seedTagGraph(tag);
    });
    tagList.appendChild(btn);
  });

  // Attach mock data to api for autocomplete matching
  api.obsoundMockData = api.obsoundMockData || api.obsoundMockData;

  // 13. Startup Initialization
  checkConnection().then(() => {
    // Check if query parameter specifies a starting tag
    const urlParams = new URLSearchParams(window.location.search);
    const startTag = urlParams.get('tag');
    
    if (startTag) {
      // Normalize and find matched pill
      const targetTag = startTag.trim();
      const matchedPill = Array.from(tagList.querySelectorAll('.tag-pill')).find(pill => 
        pill.textContent.replace('#', '').toLowerCase() === targetTag.toLowerCase()
      );
      if (matchedPill) {
        matchedPill.click();
      } else {
        seedTagGraph(targetTag);
      }
    } else {
      // Default to first tag (Synthwave)
      const firstTag = tagList.querySelector('.tag-pill');
      if (firstTag) firstTag.click();
    }
    
    // Sync initial crate badges
    renderCrateList(crate.getTracks());
  });

  // 14. Event Listener for ReactJS Form Validation Node Injector
  window.addEventListener('obsound:injectTrack', (e) => {
    const track = e.detail;
    if (!track) return;

    // Ensure the genre tag node exists
    const tagName = track.genre || 'Synthwave';
    const tagId = `tag_${tagName.toLowerCase().replace(/\s+/g, '_')}`;
    let tagNode = graph.nodeMap.get(tagId);
    if (!tagNode) {
      tagNode = graph.addNode(tagId, `#${tagName}`, 'tag', { name: tagName });
    }

    // Add track node
    const trackId = `track_${track.id || Date.now()}`;
    const trackNode = graph.addNode(trackId, track.title, 'track', {
      id: trackId,
      title: track.title,
      name: track.title,
      artist: track.artist,
      genre: tagName,
      bpm: track.bpm,
      year: track.year,
      intensity: track.intensity,
      url: track.url,
      tags: track.tags || [tagName],
      coverArt: track.cover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      previewAudioUrl: track.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    });

    // Add physical connection link
    graph.addLink(tagId, trackId, 110);

    // Smoothly focus camera on newly created node
    graph.focusOnNode(trackNode);

    // Render node details
    renderDetails(trackNode);

    // Add to active track queue & play
    activeTrackQueue.unshift(trackNode.data);
    loadAndPlayTrack(trackNode.data);
  });
});

