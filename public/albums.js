// public/albums.js - Underground Vinyl & Album Vault Engine
import { getTopAlbumsForTag, getAlbumInfo, getArtistInfo, getSimilarArtists } from './api.js';
import { spotifyManager } from './spotify.js';

let currentTag = 'Shoegaze';
let loadedAlbums = [];
let activeAlbumData = null;

// DOM Elements
const grid = document.getElementById('albums-grid');
const searchInput = document.getElementById('vault-search-input');
const searchBtn = document.getElementById('btn-vault-search');
const tagChips = document.querySelectorAll('.tag-chip');
const statCount = document.getElementById('stat-albums-count');

// Modal Elements
const modalBackdrop = document.getElementById('vault-modal-backdrop');
const modalClose = document.getElementById('vault-modal-close');
const modalCoverImg = document.getElementById('modal-cover-img');
const modalSpotifyBtn = document.getElementById('modal-spotify-btn');
const modalCrateAllBtn = document.getElementById('modal-crate-all-btn');
const modalAlbumTitle = document.getElementById('modal-album-title');
const modalArtistName = document.getElementById('modal-artist-name');
const modalGalaxyHopLink = document.getElementById('modal-galaxy-hop-link');
const modalArtistBio = document.getElementById('modal-artist-bio');
const modalSimilarChips = document.getElementById('modal-similar-chips');
const modalTracklistTbody = document.getElementById('modal-tracklist-tbody');
const toast = document.getElementById('vault-toast');
const toastMsg = document.getElementById('vault-toast-msg');

function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// 1. Load Albums for Current Tag
async function loadAlbums(tag) {
  currentTag = tag;
  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; font-family: 'Space Grotesk';">
      <div style="font-size: 32px; animation: spin 2s linear infinite; display: inline-block;">💿</div>
      <h3 style="margin-top: 12px; font-weight: 700;">Digging Vinyl Sleeves for "${tag}"...</h3>
      <p style="color: var(--ink-muted);">Querying live Last.fm subterranean database &amp; high-res sleeve pressings</p>
    </div>
  `;
  statCount.textContent = `Digging ${tag}...`;

  try {
    const albums = await getTopAlbumsForTag(tag, 24);
    loadedAlbums = albums;
    statCount.textContent = `${albums.length} Vinyl Releases Cataloged`;
    renderAlbums(albums);
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--pastel-terracotta);">
        <h3>Unable to load albums for "${tag}"</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// 2. Render Vinyl Sleeve Cards
function renderAlbums(albums) {
  if (!albums || albums.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <h3>No vinyl records found in this vault section.</h3>
        <p style="color: var(--ink-muted);">Try searching another subterranean tag or artist name.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  albums.forEach(alb => {
    const card = document.createElement('div');
    card.className = 'vinyl-card';
    card.innerHTML = `
      <div class="sleeve-container">
        <div class="vinyl-disc"></div>
        <img class="sleeve-cover" src="${alb.coverArt}" alt="${alb.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80'">
      </div>
      <div class="album-info-meta">
        <div class="album-title" title="${alb.name}">${alb.name}</div>
        <a class="artist-name-link" href="#" data-artist="${alb.artist}">
          <i class="bi bi-person-fill"></i> ${alb.artist}
        </a>
        <div class="album-stats-row">
          <span><i class="bi bi-tag-fill"></i> ${alb.tag || currentTag}</span>
          <span>${alb.playcount ? Number(alb.playcount).toLocaleString() + ' plays' : 'Archival LP'}</span>
        </div>
      </div>
      <button class="btn-inspect-sleeve">
        <i class="bi bi-eye-fill"></i> Inspect Sleeve &amp; Artist
      </button>
    `;

    // Click on artist link or card opens discovery
    card.addEventListener('click', (e) => {
      openAlbumDetail(alb.artist, alb.name, alb.coverArt);
    });

    grid.appendChild(card);
  });
}

// 3. Open Detailed Album & Artist Story Modal
async function openAlbumDetail(artistName, albumName, initialImg) {
  modalBackdrop.classList.add('open');
  modalAlbumTitle.textContent = albumName;
  modalArtistName.textContent = artistName;
  modalCoverImg.src = initialImg || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80';
  modalArtistBio.textContent = 'Decoupling acoustic lore and discovering artist through this sleeve...';
  modalSimilarChips.innerHTML = '<span style="font-size: 12px; color: var(--ink-muted);">Tracing sonic constellation...</span>';
  modalTracklistTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Fetching official album tracklist...</td></tr>`;
  
  // Set Galaxy Graph Hop Link
  modalGalaxyHopLink.href = `app.html?tag=${encodeURIComponent(currentTag)}&artist=${encodeURIComponent(artistName)}`;
  
  // Spotify Album Link
  modalSpotifyBtn.href = `https://open.spotify.com/search/${encodeURIComponent(artistName + ' ' + albumName)}`;

  try {
    // Parallel fetch: Album info, Artist bio, and Similar artists
    const [albumDetails, artistBio, similarList] = await Promise.all([
      getAlbumInfo(artistName, albumName),
      getArtistInfo(artistName),
      getSimilarArtists(artistName).catch(() => [])
    ]);

    activeAlbumData = albumDetails;

    // Update Cover if higher resolution available
    if (albumDetails.coverArt) {
      modalCoverImg.src = albumDetails.coverArt;
    }

    // Artist Lore
    const bioText = (artistBio && artistBio.bio) ? artistBio.bio.replace(/<[^>]+>/g, '').trim() : 
      `${artistName} is a distinguished underground audio creator whose work defines this subterranean micro-genre.`;
    modalArtistBio.textContent = bioText.length > 350 ? bioText.substring(0, 350) + '...' : bioText;

    // Similar Artists
    if (similarList && similarList.length > 0) {
      modalSimilarChips.innerHTML = '';
      similarList.slice(0, 6).forEach(sim => {
        const chip = document.createElement('button');
        chip.className = 'similar-artist-chip';
        chip.innerHTML = `<i class="bi bi-soundwave" style="color: var(--pastel-terracotta);"></i> ${sim.name}`;
        chip.addEventListener('click', () => {
          // Pivot: search and inspect this new artist's albums
          modalBackdrop.classList.remove('open');
          searchInput.value = sim.name;
          loadAlbums(sim.name);
        });
        modalSimilarChips.appendChild(chip);
      });
    } else {
      modalSimilarChips.innerHTML = '<span style="font-size: 12px; color: var(--ink-muted);">Isolated underground soundnode with unique acoustic identity.</span>';
    }

    // Full Tracklist Table
    if (albumDetails.tracks && albumDetails.tracks.length > 0) {
      modalTracklistTbody.innerHTML = '';
      albumDetails.tracks.forEach(tr => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="font-family: 'JetBrains Mono'; font-weight: 700; color: var(--ink-muted);">${tr.rank}</td>
          <td><strong>${tr.title}</strong></td>
          <td style="font-family: 'JetBrains Mono';">${tr.duration}</td>
          <td class="track-play-cell">
            <a class="track-spotify-mini-btn" href="${tr.spotifyUrl}" target="_blank" rel="noopener" title="Play on Spotify">
              <i class="bi bi-play-circle-fill"></i>
            </a>
          </td>
        `;
        modalTracklistTbody.appendChild(row);
      });
    } else {
      modalTracklistTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 16px; color: var(--ink-muted);">
            Full tracklist archived as single continuous LP recording.
          </td>
        </tr>
      `;
    }

  } catch (err) {
    console.error('Failed to load detailed album lore:', err);
    modalArtistBio.textContent = `${artistName} is an essential figure in the ${currentTag} underground scene. Discover their complete discography through this archived release.`;
  }
}

// 4. Add All Album Tracks to Crate
modalCrateAllBtn.addEventListener('click', () => {
  if (!activeAlbumData) return;

  const currentCrate = JSON.parse(localStorage.getItem('obsound_crate') || '[]');
  let addedCount = 0;

  const tracksToAdd = (activeAlbumData.tracks && activeAlbumData.tracks.length > 0) ? activeAlbumData.tracks : [
    { title: activeAlbumData.name, artist: activeAlbumData.artist, duration: '3:30', spotifyUrl: activeAlbumData.spotifyUrl }
  ];

  tracksToAdd.forEach(tr => {
    const trackId = `${activeAlbumData.artist.toLowerCase()}_${tr.title.toLowerCase()}`.replace(/[^a-z0-9]/g, '_');
    if (!currentCrate.some(item => item.id === trackId)) {
      currentCrate.push({
        id: trackId,
        title: tr.title,
        artist: activeAlbumData.artist,
        album: activeAlbumData.name,
        coverArt: activeAlbumData.coverArt,
        spotifyUrl: tr.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(activeAlbumData.artist + ' ' + tr.title)}`,
        genre: currentTag,
        addedAt: new Date().toISOString()
      });
      addedCount++;
    }
  });

  localStorage.setItem('obsound_crate', JSON.stringify(currentCrate));
  showToast(`Added ${addedCount} tracks from "${activeAlbumData.name}" to your Crate!`);
});

// Modal Close Handlers
modalClose.addEventListener('click', () => modalBackdrop.classList.remove('open'));
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.remove('open');
});

// Tag Chips Click Handlers
tagChips.forEach(chip => {
  chip.addEventListener('click', () => {
    tagChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const tag = chip.getAttribute('data-tag');
    loadAlbums(tag);
  });
});

// Search Bar
searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) {
    tagChips.forEach(c => c.classList.remove('active'));
    loadAlbums(query);
  }
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
  // Check if URL has query parameter ?tag=
  const params = new URLSearchParams(window.location.search);
  const requestedTag = params.get('tag') || 'Shoegaze';
  
  // Highlight active chip if matches
  tagChips.forEach(c => {
    if (c.getAttribute('data-tag').toLowerCase() === requestedTag.toLowerCase()) {
      tagChips.forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    }
  });

  loadAlbums(requestedTag);
});
