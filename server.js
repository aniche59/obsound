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

  // 5. Static File Server Handler
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
