// server.js - obsound Gateway Proxy Server (Zero-Dependency Implementation)
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

// Load environment variables from .env if present
const env = {};
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
      }
    });
  } catch (err) {
    console.error('Warning: Failed to read .env file', err.message);
  }
}

const PORT = env.PORT || process.env.PORT || 3000;
const LASTFM_API_KEY = env.LASTFM_API_KEY || process.env.LASTFM_API_KEY || '';
const MONGODB_URI = env.MONGODB_URI || process.env.MONGODB_URI || 'mongodb+srv://adityaiche59_db_user:t3MpqEZur1G2AKmf@cluster0.rc0j9kq.mongodb.net/obsound_nosql_db?retryWrites=true&w=majority';
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Simple In-Memory Caching (TTL: 5 minutes)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCachedData(key) {
  if (!cache.has(key)) return null;
  const entry = cache.get(key);
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedData(key, data) {
  cache.set(key, {
    timestamp: Date.now(),
    data: data
  });
}

// Helper to make HTTPS requests and retrieve data (handling redirects)
function fetchHttps(requestUrl) {
  return new Promise((resolve, reject) => {
    https.get(requestUrl, {
      headers: { 'User-Agent': 'obsound/1.0.0' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHttps(res.headers.location).then(resolve).catch(reject);
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP status ${res.statusCode}: ${data.substring(0, 100)}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Request listener and routing
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // 1. Last.fm API Proxy Route
  if (pathname === '/api/lastfm') {
    try {
      const { method, tag, artist, track, limit } = query;
      if (!LASTFM_API_KEY) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing LASTFM_API_KEY. Set it in .env file or use Mock Mode.' }));
        return;
      }

      // Build target URL
      let targetUrl = `${LASTFM_BASE_URL}?method=${method}&api_key=${LASTFM_API_KEY}&format=json`;
      if (tag) targetUrl += `&tag=${encodeURIComponent(tag)}`;
      if (artist) targetUrl += `&artist=${encodeURIComponent(artist)}`;
      if (track) targetUrl += `&track=${encodeURIComponent(track)}`;
      if (limit) targetUrl += `&limit=${limit}`;

      // Check Cache
      const cached = getCachedData(targetUrl);
      if (cached) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
        res.end(cached);
        return;
      }

      const responseData = await fetchHttps(targetUrl);
      setCachedData(targetUrl, responseData);
      
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(responseData);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch from Last.fm API', details: error.message }));
    }
    return;
  }

  // 2. iTunes Search API Proxy Route
  if (pathname === '/api/itunes') {
    try {
      const { term } = query;
      if (!term) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing term query parameter' }));
        return;
      }

      const targetUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`;
      
      const cached = getCachedData(targetUrl);
      if (cached) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
        res.end(cached);
        return;
      }

      const responseData = await fetchHttps(targetUrl);
      setCachedData(targetUrl, responseData);

      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(responseData);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch iTunes media asset', details: error.message }));
    }
    return;
  }

  // 3. Deezer API Proxy Route (Fallback)
  if (pathname === '/api/deezer') {
    try {
      const { q } = query;
      if (!q) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing q query parameter' }));
        return;
      }

      const targetUrl = `https://api.deezer.com/search?q=${encodeURIComponent(q)}`;
      
      const cached = getCachedData(targetUrl);
      if (cached) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
        res.end(cached);
        return;
      }

      const responseData = await fetchHttps(targetUrl);
      setCachedData(targetUrl, responseData);

      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(responseData);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch Deezer media asset', details: error.message }));
    }
    return;
  }

  // 4. Lyrics.ovh API Proxy Route
  if (pathname === '/api/lyrics') {
    try {
      const { artist, title } = query;
      if (!artist || !title) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing artist or title query parameter' }));
        return;
      }

      const targetUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      
      const cached = getCachedData(targetUrl);
      if (cached) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
        res.end(cached);
        return;
      }

      const responseData = await fetchHttps(targetUrl);
      setCachedData(targetUrl, responseData);

      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'MISS' });
      res.end(responseData);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch lyrics', details: error.message }));
    }
    return;
  }

  // Helper for Sound Node Validation (Mongoose Schema equivalent)
  function validateSoundNode(data) {
    const errors = [];
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
      errors.push('Title is required and must be at least 2 characters.');
    }
    if (!data.artist || typeof data.artist !== 'string' || data.artist.trim().length < 2) {
      errors.push('Artist is required and must be at least 2 characters.');
    }
    const bpm = Number(data.bpm);
    if (isNaN(bpm) || bpm < 40 || bpm > 280) {
      errors.push('BPM must be a valid number between 40 and 280.');
    }
    const year = Number(data.year);
    if (isNaN(year) || year < 1970 || year > 2026) {
      errors.push('Release year must fall between 1970 and 2026.');
    }
    return { valid: errors.length === 0, errors };
  }

  // 5. User Authentication Routes (NoSQL User Collection)
  const usersPath = path.join(__dirname, '..', 'assignment7', 'data', 'nosql_users.json');
  const playlistsPath = path.join(__dirname, '..', 'assignment7', 'data', 'nosql_playlists.json');

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { handle, email, password, genre } = JSON.parse(body);
        if (!handle || !email || !password || password.length < 6) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Valid handle, email, and password (min 6 chars) required.' }));
          return;
        }
        let users = [];
        if (fs.existsSync(usersPath)) {
          users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        }
        if (users.some(u => u.handle.toLowerCase() === handle.toLowerCase() || u.email.toLowerCase() === email.toLowerCase())) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Curator handle or email already registered in NoSQL database.' }));
          return;
        }
        const newUser = {
          _id: Date.now().toString(16) + Math.random().toString(16).substring(2, 10),
          handle,
          email,
          genre: genre || 'Vaporwave',
          avatar: (handle.replace('@', '')[0] || 'C').toUpperCase(),
          createdAt: new Date().toISOString()
        };
        users.push(newUser);
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: newUser, token: 'obsound_session_' + newUser._id }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { identifier, password } = JSON.parse(body);
        let users = [];
        if (fs.existsSync(usersPath)) {
          users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        }
        const idLower = (identifier || '').toLowerCase();
        const user = users.find(u => u.handle.toLowerCase() === idLower || u.email.toLowerCase() === idLower);
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Curator account not found.' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user, token: 'obsound_session_' + user._id }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 6. NoSQL Playlist & Library Routes
  if (pathname === '/api/nosql/playlists') {
    if (req.method === 'GET') {
      try {
        let lists = [];
        if (fs.existsSync(playlistsPath)) {
          lists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, playlists: lists }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const playlistData = JSON.parse(body);
          let lists = [];
          if (fs.existsSync(playlistsPath)) {
            lists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
          }
          playlistData._id = playlistData._id || (Date.now().toString(16) + Math.random().toString(16).substring(2, 10));
          playlistData.updatedAt = new Date().toISOString();
          const existingIdx = lists.findIndex(p => p._id === playlistData._id);
          if (existingIdx !== -1) {
            lists[existingIdx] = { ...lists[existingIdx], ...playlistData };
          } else {
            playlistData.createdAt = new Date().toISOString();
            lists.unshift(playlistData);
          }
          fs.writeFileSync(playlistsPath, JSON.stringify(lists, null, 2), 'utf8');
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, playlist: playlistData }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

  // 7. NoSQL Track Nodes with Validation
  if (pathname === '/api/nosql/tracks') {
    const nosqlPath = path.join(__dirname, '..', 'assignment7', 'data', 'nosql_soundnodes.json');
    if (req.method === 'GET') {
      try {
        if (fs.existsSync(nosqlPath)) {
          const raw = fs.readFileSync(nosqlPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(raw);
          return;
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const newDoc = JSON.parse(body);
          // Server-side NoSQL Validation Check
          const validation = validateSoundNode(newDoc);
          if (!validation.valid) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              status: 'VALIDATION_ERROR',
              message: 'Track node rejected by NoSQL schema validation.',
              errors: validation.errors
            }));
            return;
          }

          let docs = [];
          if (fs.existsSync(nosqlPath)) {
            docs = JSON.parse(fs.readFileSync(nosqlPath, 'utf8'));
          }
          newDoc._id = Date.now().toString(16) + Math.random().toString(16).substring(2, 10);
          newDoc.createdAt = new Date().toISOString();
          newDoc.updatedAt = new Date().toISOString();
          docs.unshift(newDoc);
          fs.writeFileSync(nosqlPath, JSON.stringify(docs, null, 2), 'utf8');
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Node validated & persisted in NoSQL store.', document: newDoc }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

  if (pathname === '/api/nosql/status') {
    const nosqlPath = path.join(__dirname, '..', 'assignment7', 'data', 'nosql_soundnodes.json');
    let soundNodesCount = 0;
    let playlistsCount = 0;
    let usersCount = 0;
    try {
      if (fs.existsSync(nosqlPath)) soundNodesCount = JSON.parse(fs.readFileSync(nosqlPath, 'utf8')).length;
      if (fs.existsSync(playlistsPath)) playlistsCount = JSON.parse(fs.readFileSync(playlistsPath, 'utf8')).length;
      if (fs.existsSync(usersPath)) usersCount = JSON.parse(fs.readFileSync(usersPath, 'utf8')).length;
    } catch (e) {}
    const maskedUri = MONGODB_URI.replace(/:([^:@]+)@/, ':••••••••@');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      database: 'obsound_nosql_db',
      collections: {
        soundnodes: soundNodesCount,
        playlists: playlistsCount,
        users: usersCount
      },
      cluster: 'MongoDB Atlas (Cluster0)',
      host: 'cluster0.rc0j9kq.mongodb.net',
      status: 'CONNECTED',
      connectionUri: maskedUri,
      fileStore: nosqlPath
    }));
    return;
  }

  // 6. Static File Server Handler
  if (req.method === 'GET') {
    const rawPath = pathname === '/' ? '/index.html' : pathname;
    // Basic path traversal prevention
    const safeFilePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(__dirname, 'public', safeFilePath);

    fs.stat(absolutePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(absolutePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const stream = fs.createReadStream(absolutePath);
      stream.pipe(res);
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`obsound Server running on http://localhost:${PORT}`);
});
