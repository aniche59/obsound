// public/spotify.js — Authentic Spotify Web API OAuth 2.0 PKCE & Platform Integration

// PKCE Cryptographic Helpers
function generateRandomString(length = 64) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(values);
  }
  return Array.from(values, x => possible[x % possible.length]).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export class SpotifyManager {
  constructor() {
    this.tokenKey = 'obsound_spotify_token';
    this.clientIdKey = 'obsound_spotify_client_id';
    this.profileKey = 'obsound_spotify_profile';
    this.accessToken = localStorage.getItem(this.tokenKey) || null;
    this.clientId = localStorage.getItem(this.clientIdKey) || '4df80a96a92842cca3ea961f7db1f945'; // Configurable / Default Spotify App ID
  }

  isConnected() {
    return Boolean(this.accessToken);
  }

  setClientId(clientId) {
    if (!clientId) return;
    this.clientId = clientId.trim();
    localStorage.setItem(this.clientIdKey, this.clientId);
  }

  getClientId() {
    return this.clientId;
  }

  setToken(token) {
    this.accessToken = token;
    localStorage.setItem(this.tokenKey, token);
  }

  getToken() {
    return this.accessToken;
  }

  disconnect() {
    this.accessToken = null;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.profileKey);
    localStorage.removeItem('obsound_spotify_code_verifier');
  }

  // 1. Initiate Real Spotify OAuth 2.0 Web Authentication with PKCE (Authorization Code Flow)
  async login(customClientId = null, customRedirectUri = null) {
    const clientId = customClientId || this.clientId;
    if (!clientId) {
      throw new Error("Missing Spotify Client ID");
    }
    this.setClientId(clientId);

    // Compute redirect URI (must match Spotify Developer Dashboard entry)
    const redirectUri = customRedirectUri || (window.location.origin + window.location.pathname);
    localStorage.setItem('obsound_spotify_redirect_uri', redirectUri);

    // Generate PKCE code verifier and challenge
    const verifier = generateRandomString(64);
    localStorage.setItem('obsound_spotify_code_verifier', verifier);

    const hashed = await sha256(verifier);
    const challenge = base64UrlEncode(hashed);

    const scopes = [
      'user-top-read',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-modify'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: scopes,
      show_dialog: 'true'
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  // 2. Parse & Exchange OAuth code on redirect (supporting both PKCE Code and Hash)
  async handleAuthRedirect() {
    // Check for authorization code in URL query string: ?code=...
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.warn("Spotify OAuth returned error:", error);
        window.history.replaceState({}, document.title, window.location.pathname);
        return null;
      }

      if (code) {
        const verifier = localStorage.getItem('obsound_spotify_code_verifier') || '';
        const redirectUri = localStorage.getItem('obsound_spotify_redirect_uri') || (window.location.origin + window.location.pathname);

        try {
          const body = new URLSearchParams({
            client_id: this.clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            code_verifier: verifier
          });

          // 1st: Try direct PKCE fetch to Spotify accounts API
          let res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
          }).catch(() => null);

          // 2nd: If browser blocked direct token call, use local proxy
          if (!res || !res.ok) {
            res = await fetch('/api/spotify/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: body.toString()
            }).catch(() => null);
          }

          if (res && res.ok) {
            const data = await res.json();
            if (data.access_token) {
              this.setToken(data.access_token);
              if (data.refresh_token) {
                localStorage.setItem('obsound_spotify_refresh_token', data.refresh_token);
              }
              window.history.replaceState({}, document.title, window.location.pathname);
              return data.access_token;
            }
          }
        } catch (e) {
          console.warn("Spotify code exchange error:", e.message);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }

    // Fallback: Check for legacy implicit grant hash #access_token=...
    return this.parseTokenFromUrl();
  }

  parseTokenFromUrl() {
    if (typeof window === 'undefined' || !window.location) return null;
    if (!window.location.hash || window.location.hash.length < 2) return this.accessToken;
    
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    const error = params.get('error');

    if (error) {
      console.warn("Spotify OAuth returned error:", error);
      return null;
    }

    if (token) {
      this.setToken(token);
      // Clean up URL hash so the token is not visible in address bar
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      return token;
    }
    return this.accessToken;
  }

  // 3. Fetch Real Authenticated User Profile from Spotify Web API
  async getUserProfile() {
    if (!this.accessToken) return null;
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (res.status === 401) {
        // Token expired
        this.disconnect();
        return null;
      }
      if (!res.ok) throw new Error(`Spotify API error ${res.status}`);
      const data = await res.json();
      
      const profile = {
        id: data.id,
        displayName: data.display_name || data.id,
        email: data.email || null,
        followers: data.followers ? data.followers.total : 0,
        avatar: data.images && data.images[0] ? data.images[0].url : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        spotifyUrl: data.external_urls ? data.external_urls.spotify : `https://open.spotify.com/user/${data.id}`,
        product: data.product || 'free'
      };
      
      localStorage.setItem(this.profileKey, JSON.stringify(profile));
      return profile;
    } catch (e) {
      console.warn("Failed to fetch Spotify user profile:", e.message);
      return null;
    }
  }

  // 4. Fetch User's Real Top Artists from Spotify Web API
  async getUserTopArtists(limit = 10) {
    if (!this.accessToken) return [];
    try {
      const res = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=medium_term`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (!res.ok) throw new Error(`Spotify top artists error: ${res.status}`);
      const data = await res.json();
      
      if (!data.items) return [];
      return data.items.map(item => ({
        id: item.id,
        name: item.name,
        genres: item.genres || [],
        popularity: item.popularity || 0,
        followers: item.followers?.total || 0,
        image: item.images?.[0]?.url || item.images?.[1]?.url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        spotifyUrl: item.external_urls?.spotify || `https://open.spotify.com/artist/${item.id}`
      }));
    } catch (e) {
      console.warn("Failed to fetch Spotify top artists:", e.message);
      return [];
    }
  }

  // 5. Fetch User's Real Recently Played Tracks from Spotify Web API
  async getUserRecentlyPlayed(limit = 10) {
    if (!this.accessToken) return [];
    try {
      const res = await fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (!res.ok) throw new Error(`Spotify recently played error: ${res.status}`);
      const data = await res.json();
      
      if (!data.items) return [];
      return data.items.map(item => ({
        id: item.track?.id,
        title: item.track?.name,
        artist: item.track?.artists?.map(a => a.name).join(', '),
        album: item.track?.album?.name,
        coverArt: item.track?.album?.images?.[0]?.url,
        spotifyUrl: item.track?.external_urls?.spotify,
        playedAt: item.played_at
      }));
    } catch (e) {
      console.warn("Failed to fetch Spotify recently played:", e.message);
      return [];
    }
  }

  // 6. Import Artists from a Public Spotify Playlist URL
  async importFromPlaylistUrl(playlistUrl) {
    try {
      const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) throw new Error("Invalid Spotify Playlist URL format");
      const playlistId = match[1];

      // If we have an access token, query the playlist API
      if (this.accessToken) {
        const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,tracks.items(track(name,artists))`, {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const artists = new Set();
          (data.tracks?.items || []).forEach(item => {
            (item.track?.artists || []).forEach(a => artists.add(a.name));
          });
          return {
            name: data.name,
            artists: Array.from(artists).slice(0, 10)
          };
        }
      }

      // Fallback: Use Spotify oEmbed to fetch playlist title and metadata
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(playlistUrl)}`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        return {
          name: oembedData.title || "Imported Playlist",
          artists: []
        };
      }
      return null;
    } catch (e) {
      console.warn("Playlist import error:", e.message);
      throw e;
    }
  }

  // 7. Get deep link to track in Spotify web/desktop app
  getSearchUrl(trackTitle, artist) {
    const q = encodeURIComponent(`${artist} ${trackTitle}`);
    return `https://open.spotify.com/search/${q}`;
  }

  // 8. Direct open in Spotify
  openTrackInSpotify(track) {
    if (!track) return;
    const url = track.spotifyUrl || this.getSearchUrl(track.title || track.name, track.artist);
    window.open(url, '_blank');
    return url;
  }

  // 9. Save track to user's Spotify Liked Songs library
  async saveToLikedSongs(trackTitle, artist, trackObj = null) {
    if (this.accessToken) {
      try {
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
              window.open(`https://open.spotify.com/track/${spotifyTrack.id}`, '_blank');
              return { success: true, message: `Added "${trackTitle}" to your Spotify Liked Songs!` };
            }
          }
        }
      } catch (e) {
        console.warn("Direct Spotify API call failed:", e);
      }
    }

    const targetUrl = (trackObj && trackObj.spotifyUrl) ? trackObj.spotifyUrl : this.getSearchUrl(trackTitle, artist);
    window.open(targetUrl, '_blank');
    return {
      success: true,
      openedUrl: targetUrl,
      message: `Opened "${trackTitle}" by ${artist} directly in Spotify!`
    };
  }

  // 10. Universal M3U8 Playlist File Generation & Download
  downloadM3U8Playlist(tracks, playlistName = 'ObSound_Curated_Crate') {
    if (!tracks || tracks.length === 0) {
      alert("Your crate has no tracks to export!");
      return;
    }

    let m3uContent = '#EXTM3U\n';
    m3uContent += `#PLAYLIST:${playlistName}\n`;
    m3uContent += `#COMMENT:Exported from ObSound Subterranean Music Platform on ${new Date().toLocaleDateString()}\n\n`;

    tracks.forEach((t) => {
      const duration = 180;
      const artist = t.artist || 'Underground Artist';
      const title = t.title || 'Untitled Track';
      const spotifyUrl = t.spotifyUrl || this.getSearchUrl(title, artist);
      const audioUrl = t.previewAudioUrl || t.audioUrl || '';
      
      m3uContent += `#EXTINF:${duration},${artist} - ${title}\n`;
      m3uContent += `#EXTREMOTE:SPOTIFY=${spotifyUrl}\n`;
      m3uContent += `#EXTGENRE:${t.genre || 'Underground'}\n`;
      m3uContent += `${audioUrl || spotifyUrl}\n\n`;
    });

    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${playlistName.replace(/[^a-zA-Z0-9_-]/g, '_')}.m3u8`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }

  // 11. Create an authentic playlist directly in user's Spotify account
  async createSpotifyPlaylist(playlistName, tracks, description = 'Curated via ObSound Subterranean Crate Digging') {
    if (!tracks || tracks.length === 0) {
      alert("No tracks in your selection to build a Spotify playlist!");
      return null;
    }

    // A. If user is authenticated with a Spotify access token, execute real Web API calls
    if (this.accessToken) {
      try {
        // Step 1: Get Spotify User ID
        const meRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        if (!meRes.ok) {
          throw new Error("Spotify session expired or unauthorized. Please re-authenticate.");
        }
        const me = await meRes.json();

        // Step 2: Create private playlist in user's Spotify library
        const createRes = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: playlistName || `ObSound — ${new Date().toLocaleDateString()}`,
            description: description,
            public: false
          })
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Failed to create Spotify playlist.");
        }
        const playlist = await createRes.json();

        // Step 3: Search each track and accumulate Spotify URIs (spotify:track:XXXXX)
        const trackUris = [];
        for (const t of tracks.slice(0, 50)) {
          if (t.spotifyUri && t.spotifyUri.startsWith('spotify:track:')) {
            trackUris.push(t.spotifyUri);
            continue;
          }
          const q = encodeURIComponent(`track:${t.title} artist:${t.artist}`);
          try {
            const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
              headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            if (searchRes.ok) {
              const sData = await searchRes.json();
              const hit = sData.tracks?.items?.[0];
              if (hit && hit.uri) {
                trackUris.push(hit.uri);
              }
            }
          } catch (e) {
            // Proceed with next track
          }
        }

        // Step 4: Add found tracks to newly created playlist
        if (trackUris.length > 0) {
          await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: trackUris })
          });
        }

        const finalUrl = playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`;
        window.open(finalUrl, '_blank');
        return {
          success: true,
          playlistUrl: finalUrl,
          addedCount: trackUris.length,
          totalCount: tracks.length,
          name: playlist.name
        };
      } catch (err) {
        console.warn("Direct Spotify API playlist creation failed:", err.message);
        alert(`Spotify API Notice: ${err.message}\nSwitching to Instant Universal M3U8 Export.`);
      }
    }

    // B. Fallback when user doesn't have an active Spotify OAuth token:
    // 1. Download official M3U8 playlist (one-click drag & drop into Spotify Desktop)
    this.downloadM3U8Playlist(tracks, playlistName);
    
    // 2. Open first track on Spotify Web Player
    const first = tracks[0];
    const url = first.spotifyUrl || this.getSearchUrl(first.title, first.artist);
    window.open(url, '_blank');

    // 3. Copy tracklist to clipboard
    const trackList = tracks.map(t => `${t.artist} - ${t.title}`).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackList);
    }

    return {
      success: true,
      mode: 'universal_m3u8',
      message: `Downloaded "${playlistName}.m3u8" & copied tracklist! Drag the file into Spotify Desktop to load your playlist instantly.`
    };
  }

  // 12. Export full crate tracks to Spotify
  exportCrateToSpotify(tracks, playlistName = 'ObSound_Curator_Crate') {
    return this.createSpotifyPlaylist(playlistName, tracks);
  }
}

export const spotifyManager = new SpotifyManager();
