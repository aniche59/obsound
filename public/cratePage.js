// public/cratePage.js - Library Page Controller
import { CrateManager } from './crate.js';
import { AudioPlayer } from './player.js';
import { spotifyManager } from './spotify.js';

// Premium Vector SVGs for Player Controls
const PLAY_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const HEART_EMPTY_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>`;
const HEART_FILLED_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
const VOL_HIGH_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
const VOL_MUTE_SVG = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

document.addEventListener('DOMContentLoaded', () => {
  const crate = new CrateManager();
  const player = new AudioPlayer('visualizer-canvas');
  
  let currentPlayingTrack = null;
  let tracksList = crate.getTracks();
  let selectedFolderTag = 'all';

  // Sync Curator Profile
  const userStr = localStorage.getItem('obsound_user');
  const curatorLabel = document.getElementById('curator-handle-label');
  const curatorAvatar = document.getElementById('curator-avatar-icon');
  if (userStr && curatorLabel) {
    try {
      const u = JSON.parse(userStr);
      curatorLabel.textContent = u.handle || '@curator';
      if (curatorAvatar) curatorAvatar.textContent = u.avatar || 'C';
    } catch (e) {}
  }

  // DOM Elements
  const libraryGrid = document.getElementById('library-grid');
  const libraryCountLabel = document.getElementById('library-count-label');
  const searchInput = document.getElementById('library-search-input');
  
  const copySpotifyBtn = document.getElementById('copy-spotify-btn');
  const exportBtn = document.getElementById('export-library-btn');
  const importFile = document.getElementById('import-library-file');
  const clearBtn = document.getElementById('clear-library-btn');
  const foldersList = document.getElementById('subgenre-folders-list');

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

  // Render Subgenre Folders Sidebar
  function renderSubgenreFolders() {
    if (!foldersList) return;
    const allTracks = crate.getTracks();
    
    // Count tags
    const tagCounts = {};
    allTracks.forEach(track => {
      if (track.tags) {
        track.tags.forEach(tag => {
          const normalized = tag.trim();
          if (normalized) {
            tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
          }
        });
      }
    });

    // Sort tags by count
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 folders

    foldersList.innerHTML = '';

    // "All Tracks" folder
    const allEl = document.createElement('div');
    allEl.className = `folder-item ${selectedFolderTag === 'all' ? 'active' : ''}`;
    allEl.innerHTML = `
      <span>All Saved Tracks</span>
      <span class="folder-count">${allTracks.length}</span>
    `;
    allEl.addEventListener('click', () => {
      selectedFolderTag = 'all';
      renderSubgenreFolders();
      handleSearch();
    });
    foldersList.appendChild(allEl);

    // Dynamic folders
    sortedTags.forEach(([tag, count]) => {
      const el = document.createElement('div');
      el.className = `folder-item ${selectedFolderTag === tag ? 'active' : ''}`;
      el.innerHTML = `
        <span>#${tag}</span>
        <span class="folder-count">${count}</span>
      `;
      el.addEventListener('click', () => {
        selectedFolderTag = tag;
        renderSubgenreFolders();
        handleSearch();
      });
      foldersList.appendChild(el);
    });
  }

  // Render Grid Cards
  function renderLibrary(tracks) {
    libraryCountLabel.textContent = tracks.length;

    if (tracks.length === 0) {
      libraryGrid.innerHTML = `
        <div class="placeholder-details" style="grid-column: 1 / -1; margin-top: 40px; text-align: center; color: var(--text-muted);">
          <p>No tracks saved in this folder yet.</p>
          <a href="app.html" class="btn btn-primary" style="margin-top: 16px; text-decoration: none; font-size: 13px; display: inline-flex; justify-content: center; align-items: center; padding: 10px 18px; border-radius: 20px;">Open Explore Graph</a>
        </div>
      `;
      return;
    }

    libraryGrid.innerHTML = '';
    tracks.forEach((track, index) => {
      const card = document.createElement('div');
      card.className = 'track-row glass';
      
      const isCurrent = currentPlayingTrack && currentPlayingTrack.id === track.id;
      if (isCurrent) card.classList.add('playing-border');

      card.innerHTML = `
        <div class="track-row-left">
          <div class="track-row-play-indicator">
            ${isCurrent && !player.audio.paused ? 
              `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>` : 
              `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
            }
          </div>
          <div class="track-row-cover">
            <img src="${track.coverArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&auto=format&fit=crop&q=80'}" alt="Cover">
          </div>
          <div class="track-row-meta">
            <h4>${track.title}</h4>
            <p>${track.artist}</p>
          </div>
        </div>
        <div class="track-row-tags">
          ${track.tags.slice(0, 2).map(t => `<span class="mini-tag">#${t}</span>`).join(' ')}
        </div>
        <div class="track-row-actions" style="display: flex; align-items: center; gap: 8px;">
          <a href="${track.spotifyUrl || 'https://open.spotify.com/search/' + encodeURIComponent(track.artist + ' ' + track.title)}" target="_blank" class="track-row-spotify-link" title="Open track in Spotify" onclick="event.stopPropagation()" style="display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: rgba(29, 185, 84, 0.12); color: #1DB954; text-decoration: none; border: 1px solid rgba(29, 185, 84, 0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          </a>
          <button class="remove-card-btn" title="Remove track">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      `;

      // Play card when clicking anywhere on the card
      card.addEventListener('click', (e) => {
        if (e.target.closest('.remove-card-btn')) return;
        
        if (currentPlayingTrack && currentPlayingTrack.id === track.id) {
          player.togglePlay();
        } else {
          // Play index in current filtered list
          player.setPlaylist(tracks, index);
        }
      });

      // Remove Card Action
      card.querySelector('.remove-card-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // crucial to prevent play toggle
        if (confirm(`Remove "${track.title}" from your library crate?`)) {
          crate.removeTrack(track.id);
        }
      });

      libraryGrid.appendChild(card);
    });
  }

  // Filter List on Search inputs and dynamic folders
  function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    let filtered = crate.getTracks();

    // Folder Filter
    if (selectedFolderTag !== 'all') {
      filtered = filtered.filter(t => 
        t.tags && t.tags.some(tag => tag.toLowerCase() === selectedFolderTag.toLowerCase())
      );
    }

    // Text Search query filter
    if (query) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.artist.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    tracksList = filtered;
    renderLibrary(tracksList);
  }

  searchInput.addEventListener('input', handleSearch);

  // Sync Library on Store changes
  crate.onChange(() => {
    renderSubgenreFolders();
    handleSearch();
    syncPlayerUI();
  });

  // Export Crate Backup
  exportBtn.addEventListener('click', () => crate.exportCrate());

  // Open in Spotify Web Player
  const openSpotifyBtn = document.getElementById('open-spotify-btn');
  if (openSpotifyBtn) {
    openSpotifyBtn.addEventListener('click', () => {
      const activeTracks = tracksList;
      if (activeTracks.length === 0) {
        alert("No tracks in the current view to export. Save some discoveries first!");
        return;
      }
      spotifyManager.exportCrateToSpotify(activeTracks);
    });
  }

  // Universal M3U8 Playlist Download
  const downloadM3uBtn = document.getElementById('download-m3u-btn');
  if (downloadM3uBtn) {
    downloadM3uBtn.addEventListener('click', () => {
      const activeTracks = tracksList;
      if (activeTracks.length === 0) {
        alert("No tracks in the current view to export. Save some discoveries first!");
        return;
      }
      spotifyManager.downloadM3U8Playlist(activeTracks, 'ObSound_Curator_Crate');
    });
  }

  // Copy Spotify query search string
  if (copySpotifyBtn) {
    copySpotifyBtn.addEventListener('click', () => {
      const activeTracks = tracksList;
      if (activeTracks.length === 0) {
        alert("No tracks in the current view to export. Save some discoveries first!");
        return;
      }

      const queryList = activeTracks.map(t => `${t.artist} - ${t.title}`).join('\n');
      
      navigator.clipboard.writeText(queryList).then(() => {
        const originalText = copySpotifyBtn.textContent;
        copySpotifyBtn.textContent = '✓ Copied Track List!';
        copySpotifyBtn.style.background = '#76b39d';
        setTimeout(() => {
          copySpotifyBtn.textContent = originalText;
          copySpotifyBtn.style.background = '';
        }, 2000);
      }).catch(err => {
        console.error("Failed to copy search queries:", err);
        alert("Could not copy search list to clipboard.");
      });
    });
  }

  // Import
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const count = await crate.importCrate(file);
      alert(`Successfully imported ${count} new tracks into your library!`);
      importFile.value = '';
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  });

  // Clear
  clearBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to empty your entire library? This cannot be undone.")) {
      crate.clear();
    }
  });

  // Format MM:SS
  function formatTime(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Player Sync Handlers
  function syncPlayerUI() {
    if (!currentPlayingTrack) return;
    
    playerTitle.textContent = currentPlayingTrack.title;
    playerArtist.textContent = currentPlayingTrack.artist;
    playerArtwork.src = currentPlayingTrack.coverArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&auto=format&fit=crop&q=80';
    
    // Heart/Remove icon status
    if (crate.hasTrack(currentPlayingTrack.id)) {
      playerFavoriteBtn.innerHTML = HEART_FILLED_SVG;
      playerFavoriteBtn.title = 'Remove from Crate';
    } else {
      playerFavoriteBtn.innerHTML = HEART_EMPTY_SVG;
      playerFavoriteBtn.title = 'Add to Crate';
    }

    // Spotify button sync
    const spotifyBtn = document.getElementById('player-spotify-btn');
    if (spotifyBtn) {
      spotifyBtn.href = `https://open.spotify.com/search/${encodeURIComponent(currentPlayingTrack.artist + ' ' + currentPlayingTrack.title)}`;
      spotifyBtn.title = `Listen to "${currentPlayingTrack.title}" on Spotify`;
    }
  }

  player.onTrackChange = (track) => {
    currentPlayingTrack = track;
    syncPlayerUI();
    renderLibrary(tracksList);
  };

  player.onPlayStateChange = (playing) => {
    playerPlayBtn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
    renderLibrary(tracksList);
  };

  player.onProgressUpdate = (current, duration) => {
    currentTimeLabel.textContent = formatTime(current);
    totalDurationLabel.textContent = formatTime(duration);
    
    if (duration > 0) {
      progressSlider.value = (current / duration) * 100;
    } else {
      progressSlider.value = 0;
    }
  };

  // timeline slider
  progressSlider.addEventListener('input', (e) => {
    if (player.audio.duration) {
      const targetTime = (parseFloat(e.target.value) / 100) * player.audio.duration;
      player.seek(targetTime);
    }
  });

  // volume
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

  // controls
  playerNextBtn.addEventListener('click', () => player.next());
  playerPrevBtn.addEventListener('click', () => player.prev());
  playerPlayBtn.addEventListener('click', () => player.togglePlay());

  // player favorite click
  playerFavoriteBtn.addEventListener('click', () => {
    if (!currentPlayingTrack) return;
    if (crate.hasTrack(currentPlayingTrack.id)) {
      crate.removeTrack(currentPlayingTrack.id);
    } else {
      crate.addTrack(currentPlayingTrack);
    }
  });

  // Initial load
  renderSubgenreFolders();
  renderLibrary(tracksList);
});
