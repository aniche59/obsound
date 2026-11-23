// obsound/scratch/enrich_all.js
const fs = require('fs');
const path = require('path');

async function fixAll() {
  const p = path.join(__dirname, '..', 'data', 'nosql_soundnodes.json');
  const nodes = JSON.parse(fs.readFileSync(p, 'utf8'));
  console.log('Starting full enrichment of', nodes.length, 'tracks...');

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node.previewAudioUrl || node.previewAudioUrl.includes('soundhelix.com')) {
      const queries = [
        encodeURIComponent(node.artist + ' ' + node.title),
        encodeURIComponent(node.artist)
      ];

      for (const q of queries) {
        try {
          const res = await fetch('http://localhost:3001/api/itunes?term=' + q);
          const data = await res.json();
          if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
            const song = data.results[0];
            node.previewAudioUrl = song.previewUrl;
            node.audioUrl = song.previewUrl;
            if (song.artworkUrl100) {
              node.coverArt = song.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100.jpg', '600x600.jpg');
            }
            break;
          }
        } catch (e) {}
      }
    }
  }

  // Any remaining ones without itunes match, query Deezer
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node.previewAudioUrl || node.previewAudioUrl.includes('soundhelix.com')) {
      try {
        const q = encodeURIComponent(node.artist);
        const res = await fetch('http://localhost:3001/api/deezer?q=' + q);
        const data = await res.json();
        if (data.data && data.data.length > 0 && data.data[0].preview) {
          const song = data.data[0];
          node.previewAudioUrl = song.preview;
          node.audioUrl = song.preview;
          if (song.album && (song.album.cover_xl || song.album.cover_medium)) {
            node.coverArt = song.album.cover_xl || song.album.cover_medium;
          }
        }
      } catch (e) {}
    }
  }

  fs.writeFileSync(p, JSON.stringify(nodes, null, 2), 'utf8');

  // Also sync real preview URLs and artwork into obsoundMockData in mockData.js
  const mockPath = path.join(__dirname, '..', 'public', 'mockData.js');
  let mockContent = fs.readFileSync(mockPath, 'utf8');

  nodes.forEach(node => {
    if (node.previewAudioUrl && !node.previewAudioUrl.includes('soundhelix.com')) {
      // Replace audioUrl and previewAudioUrl for this track id in mockData.js
      const idPattern = new RegExp('\"id\":\\s*\"' + node.id + '\"[\\s\\S]*?\"previewAudioUrl\":\\s*\"[^\"]+\"', 'g');
      mockContent = mockContent.replace(idPattern, (match) => {
        return match.replace(/\"previewAudioUrl\":\s*\"[^\"]+\"/, `\"previewAudioUrl\": \"${node.previewAudioUrl}\"`);
      });
      if (node.coverArt && !node.coverArt.includes('unsplash.com')) {
        const artPattern = new RegExp('\"id\":\\s*\"' + node.id + '\"[\\s\\S]*?\"coverArt\":\\s*\"[^\"]+\"', 'g');
        mockContent = mockContent.replace(artPattern, (match) => {
          return match.replace(/\"coverArt\":\s*\"[^\"]+\"/, `\"coverArt\": \"${node.coverArt}\"`);
        });
      }
    }
  });

  fs.writeFileSync(mockPath, mockContent, 'utf8');

  const remaining = nodes.filter(n => n.previewAudioUrl.includes('soundhelix.com')).length;
  console.log('COMPLETED! Real preview tracks:', nodes.length - remaining, 'Remaining soundhelix:', remaining);
}

fixAll();
