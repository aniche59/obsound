// public/spotify.js — Spotify Web API & Liked Songs Integration for ObSound
export class SpotifyManager {
  constructor() {
    this.tokenKey = 'obsound_spotify_token';
    this.clientIdKey = 'obsound_spotify_client_id';
    this.accessToken = localStorage.getItem(this.tokenKey) || null;
    this.clientId = localStorage.getItem(this.clientIdKey) || '';
  }

  isConnected() {
    return Boolean(this.accessToken);
  }

  setToken(token) {
    this.accessToken = token;
    localStorage.setItem(this.tokenKey, token);
  }

  disconnect() {
    this.accessToken = null;
    localStorage.removeItem(this.tokenKey);
  }

  // Get deep link to track in Spotify web/desktop app
  getSearchUrl(trackTitle, artist) {
    const q = encodeURIComponent(`${artist} ${trackTitle}`);
    return `https://open.spotify.com/search/${q}`;
  }

  // Save track to user's Spotify Liked Songs library
  async saveToLikedSongs(trackTitle, artist) {
    // 1. If user is authenticated via OAuth with Spotify Token
    if (this.accessToken) {
      try {
        // Search track ID
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artist + ' ' + trackTitle)}&type=track&limit=1`, {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const spotifyTrack = searchData.tracks?.items?.[0];
          if (spotifyTrack) {
            const saveRes = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${spotifyTrack.id}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            if (saveRes.ok) {
              return { success: true, message: `Added "${trackTitle}" to your Spotify Liked Songs!` };
            }
          }
        }
      } catch (e) {
        console.warn("Direct Spotify API call failed, falling back to Spotify Web:", e);
      }
    }

    // 2. Direct Spotify Deep Link fallback
    const targetUrl = this.getSearchUrl(trackTitle, artist);
    window.open(targetUrl, '_blank');
    return {
      success: true,
      openedUrl: targetUrl,
      message: `Opened "${trackTitle}" in Spotify. Click the 'Heart' icon to save to Liked Songs!`
    };
  }

  // Export full crate tracks as Spotify Search queries / playlist
  exportCrateToSpotify(tracks) {
    if (!tracks || tracks.length === 0) {
      alert("Your crate has no tracks to export!");
      return;
    }
    const trackList = tracks.map(t => `${t.artist} - ${t.title}`).join('\n');
    const textBlob = `=== OBSOUND CURATED CRATE PLAYLIST ===\nExported: ${new Date().toLocaleDateString()}\nTotal Tracks: ${tracks.length}\n\n` + trackList;
    
    // Copy to clipboard for easy Spotify Playlist import (Spotify desktop allows pasting track titles)
    navigator.clipboard?.writeText(trackList);

    const firstTrack = tracks[0];
    const url = this.getSearchUrl(firstTrack.title, firstTrack.artist);
    window.open(url, '_blank');
    alert(`Exporting ${tracks.length} tracks to Spotify!\n\nAll track titles copied to your clipboard. Spotify search opened for the first track.`);
  }
}

export const spotifyManager = new SpotifyManager();
