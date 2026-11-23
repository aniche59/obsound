// public/recommendations.js - Multi-Dimensional Subterranean Recommendation Engine
import { getSimilarArtists, getArtistInfo, getTopAlbumsForTag, getTagInfo, fetchArtistRealImage } from './api.js';
import { spotifyManager } from './spotify.js';

let inputArtists = ['Slowdive', 'SALEM'];
let currentRecommendations = null;

// DOM Elements
const artistInputField = document.getElementById('artist-input-field');
const addArtistBtn = document.getElementById('btn-add-artist');
const activeChipsContainer = document.getElementById('active-artist-chips');
const presetPills = document.querySelectorAll('.preset-pill');

// Spotify Elements
const spotifySyncBtn = document.getElementById('btn-sync-spotify');
const spotifyBtnText = document.getElementById('spotify-btn-text');
const spotifyStatus = document.getElementById('spotify-sync-status');
const spotifyConnectedProfile = document.getElementById('spotify-connected-profile');
const spotifyDisconnectedBox = document.getElementById('spotify-disconnected-box');
const spotifyUserAvatar = document.getElementById('spotify-user-avatar');
const spotifyUserName = document.getElementById('spotify-user-name');
const spotifyUserMeta = document.getElementById('spotify-user-meta');
const spotifyDisconnectBtn = document.getElementById('btn-spotify-disconnect');
const spotifyClientIdInput = document.getElementById('spotify-client-id-input');
const spotifyTokenInput = document.getElementById('spotify-token-input');
const applyTokenBtn = document.getElementById('btn-apply-token');
const spotifyPlaylistInput = document.getElementById('spotify-playlist-input');
const importPlaylistBtn = document.getElementById('btn-import-playlist');

const generateBtn = document.getElementById('btn-oracle-generate');
const resultsArea = document.getElementById('oracle-results-area');
const recGenresGrid = document.getElementById('rec-genres-grid');
const recArtistsGrid = document.getElementById('rec-artists-grid');
const recAlbumsGrid = document.getElementById('rec-albums-grid');
const projectGalaxyBtn = document.getElementById('btn-project-galaxy');
const crateAllRecsBtn = document.getElementById('btn-crate-all-recs');
const toast = document.getElementById('vault-toast');
const toastMsg = document.getElementById('vault-toast-msg');

function showToast(msg) {
  toastMsg.textContent = msg;
  toast.style.display = 'flex';
  setTimeout(() => { toast.style.display = 'none'; }, 3200);
}

// Check Spotify URL Hash & Connection State on Page Load
async function initSpotifyAuth() {
  if (!spotifySyncBtn) return;
  if (spotifyClientIdInput) {
    spotifyClientIdInput.value = spotifyManager.getClientId();
  }

  // Parse code or token if redirected back from Spotify OAuth (PKCE)
  const redirectToken = await spotifyManager.handleAuthRedirect();
  if (redirectToken) {
    showToast('Authenticated successfully with Spotify OAuth 2.0 PKCE!');
  }

  await refreshSpotifyUI();
}

async function refreshSpotifyUI() {
  if (!spotifySyncBtn) return;
  if (spotifyManager.isConnected()) {
    const profile = await spotifyManager.getUserProfile();
    if (profile) {
      if (spotifyConnectedProfile) spotifyConnectedProfile.style.display = 'flex';
      if (spotifyDisconnectedBox) spotifyDisconnectedBox.style.display = 'none';
      if (spotifyUserAvatar) spotifyUserAvatar.src = profile.avatar;
      if (spotifyUserName) spotifyUserName.textContent = profile.displayName;
      if (spotifyUserMeta) {
        spotifyUserMeta.textContent = `${profile.followers || 0} followers • ${profile.product.toUpperCase()} Account • Connected`;
      }
      if (spotifyBtnText) spotifyBtnText.textContent = 'Sync Real Spotify Top Artists';
      return;
    }
  }

  // Fallback to disconnected UI
  if (spotifyConnectedProfile) spotifyConnectedProfile.style.display = 'none';
  if (spotifyDisconnectedBox) spotifyDisconnectedBox.style.display = 'flex';
  if (spotifyStatus) {
    spotifyStatus.textContent = 'Not Connected';
    spotifyStatus.style.color = '#6C757D';
  }
  if (spotifyBtnText) spotifyBtnText.textContent = 'Log in with Spotify (OAuth)';
}

// 1. Spotify Sync / Login Button Handler
if (spotifySyncBtn) {
  spotifySyncBtn.addEventListener('click', async () => {
    // If not connected, launch official Spotify OAuth 2.0 redirect
    if (!spotifyManager.isConnected()) {
      const customId = spotifyClientIdInput ? spotifyClientIdInput.value.trim() : null;
      try {
        spotifyManager.login(customId);
      } catch (err) {
        showToast(`Spotify Login Error: ${err.message}`);
      }
      return;
    }

    // If already connected, fetch real Spotify top artists from API
    spotifyBtnText.textContent = 'Querying Spotify Web API...';
    try {
      const topArtists = await spotifyManager.getUserTopArtists(10);
      const recentTracks = await spotifyManager.getUserRecentlyPlayed(8);

      const realArtistNames = new Set();
      topArtists.forEach(a => realArtistNames.add(a.name));
      recentTracks.forEach(t => {
        if (t.artist) {
          t.artist.split(',').forEach(part => realArtistNames.add(part.trim()));
        }
      });

      if (realArtistNames.size > 0) {
        inputArtists = Array.from(realArtistNames).slice(0, 5);
        renderChips();
        showToast(`Synced ${inputArtists.length} authentic top artists from your Spotify account!`);
        executeAlgorithm();
      } else {
        showToast('Spotify connected, but no top artists found. Try listening to some music on Spotify!');
      }
    } catch (e) {
      console.error("Spotify sync failed:", e);
      showToast('Spotify sync failed. Token may be expired.');
      spotifyManager.disconnect();
      refreshSpotifyUI();
    } finally {
      spotifyBtnText.textContent = 'Sync Real Spotify Top Artists';
    }
  });
}

// 2. Disconnect Handler
if (spotifyDisconnectBtn) {
  spotifyDisconnectBtn.addEventListener('click', () => {
    spotifyManager.disconnect();
    refreshSpotifyUI();
    showToast('Disconnected Spotify account.');
  });
}

// 3. Direct Bearer Token Handler
if (applyTokenBtn && spotifyTokenInput) {
  applyTokenBtn.addEventListener('click', async () => {
    const raw = spotifyTokenInput.value.trim().replace(/^Bearer\s+/i, '');
    if (!raw) {
      showToast('Please enter a valid Spotify token.');
      return;
    }
    spotifyManager.setToken(raw);
    await refreshSpotifyUI();
    if (spotifyManager.isConnected()) {
      showToast('Spotify Bearer Token saved and verified!');
      spotifyTokenInput.value = '';
    } else {
      showToast('Invalid or expired Spotify token.');
    }
  });
}

// 4. Public Playlist Import Handler
if (importPlaylistBtn && spotifyPlaylistInput) {
  importPlaylistBtn.addEventListener('click', async () => {
    const url = spotifyPlaylistInput.value.trim();
    if (!url) {
      showToast('Please enter a valid Spotify playlist URL.');
      return;
    }
    try {
      importPlaylistBtn.textContent = 'Importing...';
      const result = await spotifyManager.importFromPlaylistUrl(url);
      if (result && result.artists && result.artists.length > 0) {
        result.artists.forEach(a => {
          if (!inputArtists.includes(a)) inputArtists.push(a);
        });
        inputArtists = inputArtists.slice(0, 5);
        renderChips();
        showToast(`Imported ${result.artists.length} artists from "${result.name}"!`);
        executeAlgorithm();
      } else if (result && result.name) {
        showToast(`Found playlist: "${result.name}". Login with Spotify to extract full tracks.`);
      }
    } catch (e) {
      showToast(`Playlist import error: ${e.message}`);
    } finally {
      importPlaylistBtn.textContent = 'Import';
    }
  });
}

// 1. Render Active Input Chips
function renderChips() {
  activeChipsContainer.innerHTML = '';
  if (inputArtists.length === 0) {
    activeChipsContainer.innerHTML = '<span style="font-size: 13px; color: var(--ink-muted);">No artists added yet. Type an artist name above or choose a preset.</span>';
    return;
  }

  inputArtists.forEach(art => {
    const chip = document.createElement('div');
    chip.className = 'artist-chip-tag';
    chip.innerHTML = `
      <span>👤 ${art}</span>
      <span class="artist-chip-remove" data-artist="${art}">&times;</span>
    `;
    chip.querySelector('.artist-chip-remove').addEventListener('click', () => {
      inputArtists = inputArtists.filter(a => a.toLowerCase() !== art.toLowerCase());
      renderChips();
    });
    activeChipsContainer.appendChild(chip);
  });
}

// 2. Add Artist Handler
function addArtist(name) {
  const clean = name.trim();
  if (!clean) return;
  if (!inputArtists.some(a => a.toLowerCase() === clean.toLowerCase())) {
    inputArtists.push(clean);
    renderChips();
  }
  artistInputField.value = '';
}

addArtistBtn.addEventListener('click', () => addArtist(artistInputField.value));
artistInputField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addArtist(artistInputField.value);
});

// Preset Archetypes
presetPills.forEach(p => {
  p.addEventListener('click', () => {
    const artists = p.getAttribute('data-preset').split(',').map(s => s.trim());
    inputArtists = artists;
    renderChips();
    executeAlgorithm();
  });
});



// 4. Recommendation Algorithm Execution
async function executeAlgorithm() {
  if (inputArtists.length === 0) {
    showToast('Please add at least one artist to generate recommendations.');
    return;
  }

  generateBtn.innerHTML = '<i class="bi bi-gear-wide-connected" style="animation: spin 1.5s linear infinite; display: inline-block;"></i> Synthesizing Cross-Scene Affinity Matrix...';
  resultsArea.style.display = 'none';

  try {
    // 1. Fetch similar artists and genre tags for each input artist
    const genreFrequency = new Map();
    const candidateArtists = new Map();

    await Promise.all(inputArtists.map(async (art) => {
      try {
        const [similars, info] = await Promise.all([
          getSimilarArtists(art).catch(() => []),
          getArtistInfo(art).catch(() => ({ tags: [] }))
        ]);

        // Process tags
        (info.tags || []).forEach(t => {
          const normT = t.trim();
          if (normT.length > 2 && normT.toLowerCase() !== 'seen live') {
            genreFrequency.set(normT, (genreFrequency.get(normT) || 0) + 1);
          }
        });

        // Process similar artists
        similars.forEach(sim => {
          if (!inputArtists.some(ia => ia.toLowerCase() === sim.name.toLowerCase())) {
            const existing = candidateArtists.get(sim.name);
            if (existing) {
              existing.match = Math.min(0.99, existing.match + 0.15);
            } else {
              candidateArtists.set(sim.name, {
                name: sim.name,
                match: sim.match || 0.75,
                listeners: sim.listeners || 150000,
                image: sim.image || sim.coverArt || '',
                seedArtist: art
              });
            }
          }
        });
      } catch (e) {
        console.warn(`Error profiling artist ${art}:`, e.message);
      }
    }));

    // Rank genres
    let topGenres = Array.from(genreFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 4);

    if (topGenres.length === 0) {
      topGenres = ['Shoegaze', 'Witch House', 'Darkwave', 'Breakcore'];
    }

    // Rank artists
    const rankedArtists = Array.from(candidateArtists.values())
      .sort((a, b) => b.match - a.match)
      .slice(0, 6);

    // Resolve genuine 1000x1000 artist portraits in parallel via Deezer & Wikipedia proxy
    await Promise.all(rankedArtists.map(async (art) => {
      try {
        if (!art.image || art.image.includes('unsplash.com') || art.image.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          const realImg = await fetchArtistRealImage(art.name);
          if (realImg) {
            art.image = realImg;
          }
        }
      } catch (e) {
        console.warn(`Could not resolve image for ${art.name}:`, e.message);
      }
    }));

    // Fetch recommended albums for top genres
    const albumPromises = topGenres.slice(0, 2).map(g => getTopAlbumsForTag(g, 4));
    const albumResults = await Promise.all(albumPromises);
    const recommendedAlbums = albumResults.flat().slice(0, 6);

    currentRecommendations = {
      seedArtists: inputArtists,
      genres: topGenres,
      artists: rankedArtists,
      albums: recommendedAlbums
    };

    // Render Results
    renderGenreRecommendations(topGenres);
    renderArtistRecommendations(rankedArtists);
    renderAlbumRecommendations(recommendedAlbums);

    resultsArea.style.display = 'flex';
    resultsArea.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Recommendation engine error:', err);
    showToast('Algorithm error: ' + err.message);
  } finally {
    generateBtn.innerHTML = '<i class="bi bi-cpu-fill"></i> Execute Subterranean Recommendation Algorithm';
  }
}

generateBtn.addEventListener('click', executeAlgorithm);

// 5. Render Genre Recommendations
function renderGenreRecommendations(genres) {
  recGenresGrid.innerHTML = '';
  genres.forEach((genre, idx) => {
    const card = document.createElement('div');
    card.className = 'rec-genre-card';
    card.innerHTML = `
      <div class="rec-genre-header">
        <span class="rec-genre-name">#${genre}</span>
        <span class="rec-genre-affinity">${Math.max(78, 98 - idx * 6)}% Affinity</span>
      </div>
      <p class="rec-genre-desc">
        Acoustically aligned with your listening coordinates in ${inputArtists.slice(0, 2).join(' & ')}.
      </p>
      <a href="albums.html?tag=${encodeURIComponent(genre)}" class="rec-genre-btn">
        <i class="bi bi-disc"></i> Dig ${genre} Vinyl Sleeves &rarr;
      </a>
    `;
    recGenresGrid.appendChild(card);
  });
}

// 6. Render Artist Recommendations
function renderArtistRecommendations(artists) {
  recArtistsGrid.innerHTML = '';
  artists.forEach(art => {
    const matchPct = Math.round((art.match || 0.8) * 100);
    const card = document.createElement('div');
    card.className = 'rec-artist-card';
    card.innerHTML = `
      <div class="rec-artist-avatar-wrap">
        <img src="${art.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80'}" alt="${art.name}" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80'">
      </div>
      <h4 class="rec-artist-name">${art.name}</h4>
      <div class="rec-artist-match">${matchPct}% Sonic Proximity</div>
      <div class="rec-artist-bio">
        Similar to your interest in <strong>${art.seedArtist}</strong>. Expanding subterranean frequencies.
      </div>
      <a href="app.html?artist=${encodeURIComponent(art.name)}" class="rec-genre-btn" style="width: 100%; box-sizing: border-box;">
        <i class="bi bi-diagram-3-fill"></i> Hop into Galaxy Graph
      </a>
    `;
    recArtistsGrid.appendChild(card);
  });
}

// 7. Render Album Recommendations
function renderAlbumRecommendations(albums) {
  recAlbumsGrid.innerHTML = '';
  albums.forEach(alb => {
    const card = document.createElement('div');
    card.className = 'vinyl-card';
    card.innerHTML = `
      <div class="sleeve-container">
        <div class="vinyl-disc"></div>
        <img class="sleeve-cover" src="${alb.coverArt}" alt="${alb.name}" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80'">
      </div>
      <div class="album-info-meta">
        <div class="album-title" title="${alb.name}">${alb.name}</div>
        <div style="font-size: 13px; font-weight: 700; color: var(--pastel-terracotta);">
          👤 ${alb.artist}
        </div>
        <div style="font-family: 'JetBrains Mono'; font-size: 11px; color: var(--ink-muted);">
          #${alb.tag}
        </div>
      </div>
      <a class="btn-inspect-sleeve" href="${alb.lastFmUrl || '#'}" target="_blank" rel="noopener">
        <i class="bi bi-spotify"></i> Listen on Spotify
      </a>
    `;
    recAlbumsGrid.appendChild(card);
  });
}

// 8. Project into Galaxy Graph
projectGalaxyBtn.addEventListener('click', (e) => {
  if (!currentRecommendations) return;
  
  // Store custom cluster in localStorage so app.js can plot it!
  localStorage.setItem('obsound_recommendation_cluster', JSON.stringify(currentRecommendations));
  window.location.href = 'app.html?recommendations=active';
});

// 9. Add All Recommended Releases to Crate
crateAllRecsBtn.addEventListener('click', () => {
  if (!currentRecommendations || !currentRecommendations.albums) return;

  const currentCrate = JSON.parse(localStorage.getItem('obsound_crate') || '[]');
  let addedCount = 0;

  currentRecommendations.albums.forEach(alb => {
    const id = `rec_${alb.artist.toLowerCase()}_${alb.name.toLowerCase()}`.replace(/[^a-z0-9]/g, '_');
    if (!currentCrate.some(c => c.id === id)) {
      currentCrate.push({
        id: id,
        title: alb.name,
        artist: alb.artist,
        album: alb.name,
        coverArt: alb.coverArt,
        spotifyUrl: alb.lastFmUrl || `https://open.spotify.com/search/${encodeURIComponent(alb.artist + ' ' + alb.name)}`,
        genre: alb.tag || 'Recommended',
        addedAt: new Date().toISOString()
      });
      addedCount++;
    }
  });

  localStorage.setItem('obsound_crate', JSON.stringify(currentCrate));
  showToast(`Added ${addedCount} recommended vinyl releases to your Crate!`);
});

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
  initSpotifyAuth();
  renderChips();
  // Auto-run on startup
  executeAlgorithm();
});
