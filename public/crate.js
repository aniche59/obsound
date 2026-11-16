// public/crate.js - Local Storage Management for "My Crate" library
export class CrateManager {
  constructor() {
    this.storageKey = 'obsound_user_crate';
    this.tracks = [];
    this.onChangeCallbacks = [];
    
    this.load();
  }

  // Load from localStorage
  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      this.tracks = data ? JSON.parse(data) : [];
      if (!Array.isArray(this.tracks)) {
        this.tracks = [];
      }
    } catch (err) {
      console.error("Failed to load crate from localStorage:", err);
      this.tracks = [];
    }
  }

  // Save to localStorage & NoSQL Database
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.tracks));
      this.triggerChange();
      this.syncToNoSQLCloud();
    } catch (err) {
      console.error("Failed to save crate to localStorage:", err);
      alert("Error: Storage limit reached! Could not save track.");
    }
  }

  async syncToNoSQLCloud() {
    try {
      const user = JSON.parse(localStorage.getItem('obsound_user') || 'null');
      const curatorHandle = user?.handle || '@analog_digger';
      await fetch('/api/nosql/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: 'playlist_crate_' + curatorHandle.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
          name: `${curatorHandle}'s Sonic Crate`,
          curator: curatorHandle,
          tracks: this.tracks,
          trackCount: this.tracks.length
        })
      });
    } catch (e) {
      console.warn("NoSQL cloud sync deferred:", e.message);
    }
  }

  getTracks() {
    return this.tracks;
  }

  hasTrack(trackId) {
    return this.tracks.some(t => t.id === trackId);
  }

  addTrack(track) {
    if (this.hasTrack(track.id)) return false;
    
    // Create a copy of the track containing necessary metadata
    const trackCopy = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      coverArt: track.coverArt,
      previewAudioUrl: track.previewAudioUrl,
      tags: track.tags || [],
      lastFmUrl: track.lastFmUrl || '',
      listeners: track.listeners || 0,
      playcount: track.playcount || 0,
      bio: track.bio || '',
      addedAt: Date.now()
    };
    
    this.tracks.push(trackCopy);
    this.save();
    return true;
  }

  removeTrack(trackId) {
    const index = this.tracks.findIndex(t => t.id === trackId);
    if (index === -1) return false;
    
    this.tracks.splice(index, 1);
    this.save();
    return true;
  }

  clear() {
    this.tracks = [];
    this.save();
  }

  onChange(callback) {
    this.onChangeCallbacks.push(callback);
  }

  triggerChange() {
    for (const callback of this.onChangeCallbacks) {
      callback(this.tracks);
    }
  }

  // Export crate as JSON download
  exportCrate() {
    try {
      const dataStr = JSON.stringify(this.tracks, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `obsound_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error("Export failed:", err);
      return false;
    }
  }

  // Import crate from JSON file
  importCrate(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) {
            throw new Error("Invalid format: Backup must be a list of tracks.");
          }
          
          // Verify basic track structure
          const validTracks = imported.filter(t => t && t.id && t.title && t.artist && t.previewAudioUrl);
          
          if (validTracks.length === 0 && imported.length > 0) {
            throw new Error("No valid track metadata found in backup file.");
          }

          // Merge tracks (avoiding duplicates)
          let count = 0;
          for (const track of validTracks) {
            if (!this.hasTrack(track.id)) {
              this.tracks.push(track);
              count++;
            }
          }
          
          this.save();
          resolve(count);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error("File reading failed."));
      reader.readAsText(file);
    });
  }
}
