// monitor_atlas.js - ObSound Live MongoDB Atlas Real-Time Monitor
const { execSync } = require('child_process');

const MONGODB_URI = 'mongodb+srv://adityaiche59_db_user:t3MpqEZur1G2AKmf@cluster0.rc0j9kq.mongodb.net/obsound_nosql_db?retryWrites=true&w=majority';

console.clear();
console.log('\x1b[36m%s\x1b[0m', '========================================================================');
console.log('\x1b[1m\x1b[32m%s\x1b[0m', '   🌐 OBSOUND LIVE MONGODB ATLAS REAL-TIME CLOUD MONITOR');
console.log('\x1b[90m%s\x1b[0m', '   Cluster: cluster0.rc0j9kq.mongodb.net | DB: obsound_nosql_db');
console.log('\x1b[36m%s\x1b[0m', '========================================================================');
console.log('Monitoring collections for real-time inserts, edits & crate syncs...\n');

let lastState = null;

function checkAtlas() {
  const evalCmd = `
    const sn = db.soundnodes.countDocuments();
    const pl = db.playlists.countDocuments();
    const us = db.users.countDocuments();
    const latestTrack = db.soundnodes.find().sort({_id: -1}).limit(1).toArray()[0];
    const latestPlaylist = db.playlists.find().sort({updatedAt: -1, _id: -1}).limit(1).toArray()[0];
    print(JSON.stringify({
      soundnodes: sn,
      playlists: pl,
      users: us,
      latestTrack: latestTrack ? { title: latestTrack.title, artist: latestTrack.artist, genre: latestTrack.genre } : null,
      latestPlaylist: latestPlaylist ? { name: latestPlaylist.name, trackCount: latestPlaylist.trackCount || (latestPlaylist.tracks ? latestPlaylist.tracks.length : 0), updatedAt: latestPlaylist.updatedAt } : null
    }));
  `;

  try {
    const raw = execSync(`mongosh "${MONGODB_URI}" --quiet --eval "${evalCmd.replace(/\n/g, ' ')}"`, {
      encoding: 'utf8',
      timeout: 10000
    });
    
    const lines = raw.trim().split('\n');
    const jsonStr = lines[lines.length - 1];
    const data = JSON.parse(jsonStr);

    const time = new Date().toLocaleTimeString();

    if (!lastState) {
      console.log(`\x1b[32m[${time}] ✓ CONNECTED TO ATLAS CLOUD CLUSTER\x1b[0m`);
      console.log(`  ├─ Soundnodes: \x1b[1m${data.soundnodes}\x1b[0m`);
      console.log(`  ├─ Playlists:  \x1b[1m${data.playlists}\x1b[0m`);
      console.log(`  └─ Users:      \x1b[1m${data.users}\x1b[0m\n`);
      if (data.latestPlaylist) {
        console.log(`  Active Crate: "${data.latestPlaylist.name}" (${data.latestPlaylist.trackCount} tracks)\n`);
      }
      console.log('\x1b[33m%s\x1b[0m', '>>> Waiting for live actions in the ObSound web app...');
      lastState = data;
      return;
    }

    // Check for changes
    if (data.soundnodes !== lastState.soundnodes) {
      console.log(`\x1b[35m[${time}] 🔥 LIVE ATLAS INSERT: soundnodes count changed: ${lastState.soundnodes} -> ${data.soundnodes}\x1b[0m`);
      if (data.latestTrack) {
        console.log(`       ↳ New Track: "${data.latestTrack.title}" by ${data.latestTrack.artist} [${data.latestTrack.genre}]`);
      }
    }

    if (data.playlists !== lastState.playlists || 
        (data.latestPlaylist && lastState.latestPlaylist && data.latestPlaylist.updatedAt !== lastState.latestPlaylist.updatedAt) ||
        (data.latestPlaylist && lastState.latestPlaylist && data.latestPlaylist.trackCount !== lastState.latestPlaylist.trackCount)) {
      console.log(`\x1b[34m[${time}] 💾 LIVE ATLAS SYNC: Playlists / Crate updated!\x1b[0m`);
      if (data.latestPlaylist) {
        console.log(`       ↳ Crate: "${data.latestPlaylist.name}" now has ${data.latestPlaylist.trackCount} tracks (Updated: ${data.latestPlaylist.updatedAt || 'now'})`);
      }
    }

    if (data.users !== lastState.users) {
      console.log(`\x1b[36m[${time}] 👤 LIVE ATLAS USER: New curator registered! Total users: ${data.users}\x1b[0m`);
    }

    lastState = data;
  } catch (err) {
    // transient network hiccups
  }
}

// Initial check
checkAtlas();
// Poll Atlas every 4 seconds
setInterval(checkAtlas, 4000);
