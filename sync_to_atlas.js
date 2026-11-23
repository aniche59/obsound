// sync_to_atlas.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '.env');
let MONGODB_URI = 'mongodb+srv://adityaiche59_db_user:t3MpqEZur1G2AKmf@cluster0.rc0j9kq.mongodb.net/obsound_nosql_db?retryWrites=true&w=majority';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.startsWith('MONGODB_URI=')) {
      MONGODB_URI = line.substring('MONGODB_URI='.length).trim();
    }
  });
}

console.log('Connecting to MongoDB Atlas Cluster0...');

const dataDir = path.join(__dirname, 'data');
const soundnodes = JSON.parse(fs.readFileSync(path.join(dataDir, 'nosql_soundnodes.json'), 'utf8'));
const playlists = JSON.parse(fs.readFileSync(path.join(dataDir, 'nosql_playlists.json'), 'utf8'));
let users = [];
if (fs.existsSync(path.join(dataDir, 'nosql_users.json'))) {
  users = JSON.parse(fs.readFileSync(path.join(dataDir, 'nosql_users.json'), 'utf8'));
}

// Generate temporary mongosh batch script
const batchScript = `
const dbName = 'obsound_nosql_db';
const currentDb = db.getSiblingDB(dbName);

const nodes = ${JSON.stringify(soundnodes)};
const lists = ${JSON.stringify(playlists)};
const usr = ${JSON.stringify(users)};

print('Syncing ' + nodes.length + ' soundnodes to Atlas...');
nodes.forEach(n => {
  currentDb.soundnodes.replaceOne({ _id: n._id }, n, { upsert: true });
});

print('Syncing ' + lists.length + ' playlists to Atlas...');
lists.forEach(l => {
  currentDb.playlists.replaceOne({ _id: l._id }, l, { upsert: true });
});

if (usr.length > 0) {
  print('Syncing ' + usr.length + ' users to Atlas...');
  usr.forEach(u => {
    currentDb.users.replaceOne({ _id: u._id }, u, { upsert: true });
  });
}

print('--- Atlas Sync Status ---');
print('Soundnodes in Atlas: ' + currentDb.soundnodes.countDocuments());
print('Playlists in Atlas: ' + currentDb.playlists.countDocuments());
print('Users in Atlas: ' + currentDb.users.countDocuments());
print('SUCCESS: Atlas cluster fully synchronized.');
`;

const tempScriptPath = path.join(__dirname, 'temp_sync_atlas.js');
fs.writeFileSync(tempScriptPath, batchScript, 'utf8');

try {
  const output = execSync(`mongosh "${MONGODB_URI}" --quiet --file "${tempScriptPath}"`, { encoding: 'utf8', timeout: 30000 });
  console.log(output);
} catch (err) {
  console.error('Atlas sync failed:', err.message);
  if (err.stdout) console.log(err.stdout);
  if (err.stderr) console.error(err.stderr);
} finally {
  if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
}
