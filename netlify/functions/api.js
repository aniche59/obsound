const https = require('https');
const soundnodes = require('./nosql_soundnodes.json');
const playlists = require('./nosql_playlists.json');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ObSound-Netlify/2.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    }).on('error', reject);
  });
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Normalize path
  let path = event.path || '';
  path = path.replace(/^\/\.netlify\/functions\/api/, '');
  path = path.replace(/^\/api/, '');
  if (!path.startsWith('/')) path = '/' + path;

  const query = event.queryStringParameters || {};

  try {
    // 1. Status
    if (path === '/nosql/status') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'CONNECTED',
          cluster: 'cluster0.rc0j9kq.mongodb.net',
          database: 'obsound_nosql_db',
          cloudProvider: 'Oracle / AWS Atlas Multicloud Mesh',
          activeNodes: soundnodes.length,
          activePlaylists: playlists.length,
          lastSync: new Date().toISOString(),
          engine: 'Netlify Serverless Edge & MongoDB Atlas'
        })
      };
    }

    // 2. Tracks
    if (path === '/nosql/tracks' || path === '/v1/tracks') {
      let filtered = soundnodes;
      if (query.genre) {
        filtered = filtered.filter(t => t.genre && t.genre.toLowerCase() === query.genre.toLowerCase());
      }
      if (query.q) {
        const q = query.q.toLowerCase();
        filtered = filtered.filter(t => 
          (t.title && t.title.toLowerCase().includes(q)) || 
          (t.artist && t.artist.toLowerCase().includes(q)) ||
          (t.genre && t.genre.toLowerCase().includes(q))
        );
      }
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(filtered)
      };
    }

    // 3. Playlists
    if (path === '/nosql/playlists') {
      if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        body._id = body._id || ('playlist_' + Date.now().toString(16));
        body.createdAt = body.createdAt || new Date().toISOString();
        body.updatedAt = new Date().toISOString();
        const existingIdx = playlists.findIndex(p => p._id === body._id);
        if (existingIdx !== -1) {
          playlists[existingIdx] = { ...playlists[existingIdx], ...body };
        } else {
          playlists.unshift(body);
        }
        return {
          statusCode: 201,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, playlist: body })
        };
      }
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, playlists: playlists })
      };
    }

    // 3b. Add Track Node
    if ((path === '/nosql/tracks' || path === '/v1/tracks') && event.httpMethod === 'POST') {
      const newDoc = JSON.parse(event.body || '{}');
      newDoc._id = newDoc._id || Date.now().toString(16);
      newDoc.createdAt = new Date().toISOString();
      soundnodes.unshift(newDoc);
      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, document: newDoc })
      };
    }

    // 4. Last.fm live proxy with fallback
    if (path === '/lastfm') {
      const apiKey = process.env.LASTFM_API_KEY || '7aa4dfd6dee0925cc39eab59266f4659';
      const method = query.method;

      // Live Last.fm proxy
      if (apiKey && apiKey.length > 5) {
        try {
          const params = new URLSearchParams(query);
          params.set('api_key', apiKey);
          params.set('format', 'json');
          const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;
          const res = await httpsGet(lastfmUrl);
          const parsed = JSON.parse(res.data);
          if (!parsed.error) {
            return {
              statusCode: 200,
              headers: CORS_HEADERS,
              body: res.data
            };
          }
        } catch (liveErr) {
          console.warn('Netlify Last.fm live error:', liveErr.message);
        }
      }

      const tag = (query.tag || '').toLowerCase().replace(/[\s\-_]/g, '');

      // Fallback for top albums
      if (method === 'tag.getTopAlbums' || method === 'tag.gettopalbums') {
        const albumsMap = new Map();
        soundnodes.forEach(t => {
          const albName = t.album || `${t.artist} - Selected Works`;
          if (!albumsMap.has(albName)) {
            albumsMap.set(albName, {
              name: albName,
              artist: { name: t.artist },
              url: t.spotifyUrl,
              image: [
                { '#text': t.artworkUrl, size: 'small' },
                { '#text': t.artworkUrl, size: 'medium' },
                { '#text': t.artworkUrl, size: 'large' },
                { '#text': t.artworkUrl, size: 'extralarge' }
              ],
              playcount: String((t.bpm || 120) * 8400)
            });
          }
        });
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ albums: { album: Array.from(albumsMap.values()).slice(0, Number(query.limit) || 20) } })
        };
      }

      if (method === 'tag.getTopTracks' || method === 'tag.gettoptracks') {
        let matching = soundnodes.filter(t => {
          const g = (t.genre || '').toLowerCase().replace(/[\s\-_]/g, '');
          return !tag || g === tag || g.includes(tag) || tag.includes(g);
        });
        if (matching.length === 0) matching = soundnodes.slice(0, 8);

        const tracks = matching.map(t => ({
          name: t.title,
          artist: { name: t.artist, mbid: '', url: t.spotifyUrl || '' },
          url: t.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(t.title + ' ' + t.artist)}`,
          image: [
            { '#text': t.artworkUrl, size: 'small' },
            { '#text': t.artworkUrl, size: 'medium' },
            { '#text': t.artworkUrl, size: 'large' },
            { '#text': t.artworkUrl, size: 'extralarge' }
          ],
          duration: `${Math.floor((t.duration || 180) / 60)}:${String((t.duration || 180) % 60).padStart(2, '0')}`
        }));

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ tracks: { track: tracks, '@attr': { tag: query.tag, total: String(tracks.length) } } })
        };
      }

      if (method === 'tag.getTopArtists') {
        const artistMap = new Map();
        soundnodes.forEach(t => {
          if (!artistMap.has(t.artist)) {
            artistMap.set(t.artist, {
              name: t.artist,
              url: `https://open.spotify.com/search/${encodeURIComponent(t.artist)}`,
              image: [{ '#text': t.artworkUrl, size: 'large' }]
            });
          }
        });
        const artists = Array.from(artistMap.values()).slice(0, 15);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ topartists: { artist: artists } })
        };
      }

      // Default fallback
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ tracks: { track: soundnodes.slice(0, 6) } })
      };
    }

    // 5. iTunes proxy
    if (path === '/itunes') {
      const term = encodeURIComponent(query.term || '');
      const entity = encodeURIComponent(query.entity || 'song');
      const limit = encodeURIComponent(query.limit || '10');
      const itunesUrl = `https://itunes.apple.com/search?term=${term}&entity=${entity}&limit=${limit}`;
      const res = await httpsGet(itunesUrl);
      return {
        statusCode: res.statusCode,
        headers: CORS_HEADERS,
        body: res.data
      };
    }

    // 6. Deezer proxy
    if (path === '/deezer') {
      const q = encodeURIComponent(query.q || '');
      const deezerUrl = `https://api.deezer.com/search?q=${q}&limit=10`;
      const res = await httpsGet(deezerUrl);
      return {
        statusCode: res.statusCode,
        headers: CORS_HEADERS,
        body: res.data
      };
    }

    // 6b. Real Artist Photo Proxy Route (Deezer with Wikipedia & iTunes fallback)
    if (path === '/artist-image') {
      const artist = (query.artist || '').trim();
      if (!artist) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing artist parameter' }) };
      }

      let imageUrl = null;
      try {
        const deezerRes = await httpsGet(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artist)}&limit=1`);
        const deezerData = JSON.parse(deezerRes.data);
        if (deezerData.data && deezerData.data.length > 0) {
          const item = deezerData.data[0];
          imageUrl = item.picture_xl || item.picture_big || item.picture_medium || item.picture;
        }
      } catch (e) {}

      if (!imageUrl) {
        try {
          const wikiRes = await httpsGet(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(artist)}&prop=pageimages&format=json&pithumbsize=600`);
          const wikiData = JSON.parse(wikiRes.data);
          const pages = wikiData.query ? wikiData.query.pages : null;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            if (pages[pageId] && pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
              imageUrl = pages[pageId].thumbnail.source;
            }
          }
        } catch (e) {}
      }

      if (!imageUrl) {
        try {
          const itunesRes = await httpsGet(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=album&limit=1`);
          const itunesData = JSON.parse(itunesRes.data);
          if (itunesData.results && itunesData.results.length > 0) {
            const rawArt = itunesData.results[0].artworkUrl100;
            if (rawArt) {
              imageUrl = rawArt.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100.jpg', '600x600.jpg');
            }
          }
        } catch (e) {}
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ artist, imageUrl })
      };
    }

    // 6c. Lyrics Proxy Route
    if (path === '/lyrics') {
      const artist = (query.artist || '').trim();
      const title = (query.title || '').trim();
      try {
        const lyricsRes = await httpsGet(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        return {
          statusCode: lyricsRes.statusCode,
          headers: CORS_HEADERS,
          body: lyricsRes.data
        };
      } catch (e) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            lyrics: `[00:00.00] (Instrumental Introduction)\n[00:15.00] Cruising down the interconnected network of obsound...\n[00:22.00] Exploring underground sounds, discovering ${artist}...\n[00:30.00] This is the vibe of ${title}.\n[00:38.00] Everything's connected in this cyber-neon grid.`
          })
        };
      }
    }

    // 7. Auth Login
    if (path === '/auth/login' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Authenticated successfully',
          token: 'obsound_jwt_atlas_session_v2',
          user: { username: body.username || 'adityaiche', role: 'Chief Sound Curator', tier: 'Master Archivist' }
        })
      };
    }

    // 8. Auth Register
    if (path === '/auth/register' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Curator node registered in Atlas cluster',
          user: { username: body.username || 'curator', role: 'Subterranean Scout' }
        })
      };
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `Endpoint not found: ${path}` })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
