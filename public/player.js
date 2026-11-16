// public/player.js - HTML5 Audio controller and Web Audio Visualizer
export class AudioPlayer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    
    this.audio = new Audio();
    // Enable CORS to inspect audio with Web Audio API. 
    this.audio.crossOrigin = "anonymous";
    
    // Track lists & indices
    this.playlist = [];
    this.currentIndex = -1;
    
    // Web Audio variables
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.dataArray = null;
    this.visualizerActive = false;
    
    // Callbacks
    this.onTrackChange = null;
    this.onPlayStateChange = null;
    this.onProgressUpdate = null;
    this.onBeatUpdate = null; // Passes average amplitude back to the graph

    this.initAudioEvents();
    if (this.canvas) this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  initAudioEvents() {
    this.audio.addEventListener('timeupdate', () => {
      if (this.onProgressUpdate) {
        const current = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        this.onProgressUpdate(current, duration);
      }
    });

    this.audio.addEventListener('ended', () => {
      this.next();
    });

    // Handle CORS loading errors gracefully.
    // If the server rejects the anonymous CORS check, load the audio without CORS.
    // In this case, the visualizer is disabled for security, but the audio still plays!
    this.audio.addEventListener('error', (e) => {
      if (this.audio.crossOrigin === "anonymous" && this.audio.src) {
        console.warn("CORS credentials blocked preview stream. Retrying audio in fallback direct mode...");
        const currentSrc = this.audio.src;
        const currentTime = this.audio.currentTime;
        
        this.audio.removeAttribute('crossOrigin');
        this.audio.src = currentSrc;
        this.audio.load();
        
        // Resume playing once loaded
        this.audio.addEventListener('canplay', function handler() {
          this.currentTime = currentTime;
          this.play().catch(err => console.error("Fallback playback failed:", err));
          this.removeEventListener('canplay', handler);
        });
      } else {
        console.error("Audio playback error occurred:", this.audio.error);
      }
    });
  }

  // Set up Web Audio API node connection once audio plays (user interaction required)
  initWebAudio() {
    if (this.audioCtx) return; // Already initialized

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256; // 128 frequency bins
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.source = this.audioCtx.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (err) {
      console.warn("Web Audio API not supported or blocked by browser policy:", err.message);
    }
  }

  setPlaylist(tracks, startIndex = 0) {
    this.playlist = tracks;
    this.currentIndex = startIndex;
    this.playIndex(this.currentIndex);
  }

  async playIndex(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    const track = this.playlist[index];

    // Ensure Web Audio is set up
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // Reset CORS attribute to anonymous for the next track
    this.audio.crossOrigin = "anonymous";

    // Guaranteed working audio stream fallback
    const fallbackPreviews = [
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"
    ];
    let audioSrc = track.previewAudioUrl;
    if (!audioSrc || audioSrc.trim() === '') {
      const charSum = (track.title || '').length + (track.artist || '').length;
      const fIdx = Math.abs(charSum) % fallbackPreviews.length;
      audioSrc = fallbackPreviews[fIdx];
      track.previewAudioUrl = audioSrc;
    }

    this.audio.src = audioSrc;
    this.audio.load();

    try {
      await this.audio.play();
      if (this.onPlayStateChange) this.onPlayStateChange(true);
      if (this.onTrackChange) this.onTrackChange(track);
      
      // Start visualizer animation loop
      if (!this.visualizerActive) {
        this.visualizerActive = true;
        this.drawVisualizer();
      }
    } catch (err) {
      console.error("Error playing track:", err.message);
    }
  }

  play() {
    if (!this.audio.src && this.playlist.length > 0) {
      this.playIndex(0);
      return;
    }
    
    // Resume AudioContext if suspended (browser security)
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.audio.play().then(() => {
      if (this.onPlayStateChange) this.onPlayStateChange(true);
    }).catch(err => console.error("Error resuming playback:", err.message));
  }

  pause() {
    this.audio.pause();
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  togglePlay() {
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  next() {
    if (this.playlist.length === 0) return;
    let nextIdx = this.currentIndex + 1;
    if (nextIdx >= this.playlist.length) nextIdx = 0; // Loop playlist
    this.playIndex(nextIdx);
  }

  prev() {
    if (this.playlist.length === 0) return;
    let prevIdx = this.currentIndex - 1;
    if (prevIdx < 0) prevIdx = this.playlist.length - 1; // Loop back
    this.playIndex(prevIdx);
  }

  seek(seconds) {
    if (!this.audio.duration) return;
    this.audio.currentTime = seconds;
  }

  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume() {
    return this.audio.volume;
  }

  // Visualizer loop rendering spectrum bars
  drawVisualizer() {
    if (!this.visualizerActive) return;
    requestAnimationFrame(() => this.drawVisualizer());

    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    let avgAmplitude = 0;

    // Check if we can extract frequency data (fails if CORS fails)
    if (this.analyser && this.audio.crossOrigin === "anonymous") {
      this.analyser.getByteFrequencyData(this.dataArray);
      
      const barWidth = (this.width / this.dataArray.length) * 1.5;
      let barHeight;
      let x = 0;
      
      // Calculate beat amplitude (focusing on low/mid frequencies for rhythm)
      let sum = 0;
      const count = Math.floor(this.dataArray.length * 0.35); // check bottom 35%
      for (let i = 0; i < count; i++) {
        sum += this.dataArray[i];
      }
      avgAmplitude = sum / count / 255; // 0 to 1

      // Draw frequency bars in flat pastel sage green (no glows/gradients per theme style)
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#76b39d';
 
      for (let i = 0; i < this.dataArray.length; i++) {
        // Logarithmic-like scaling for aesthetic variance
        barHeight = (this.dataArray[i] / 255) * this.height * 0.85;
        
        this.ctx.fillRect(x, this.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    } else {
      // Draw a slow procedural wave if visualizer is inactive/CORS blocked
      const time = Date.now() * 0.003;
      this.ctx.strokeStyle = 'rgba(118, 179, 157, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      const points = 50;
      const spacing = this.width / points;
      
      for (let i = 0; i <= points; i++) {
        const x = i * spacing;
        // Generate nice wave heights if audio is playing, otherwise flat
        const scale = this.audio.paused ? 2 : 12;
        const y = this.height / 2 + Math.sin(i * 0.2 + time) * scale;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
      
      // Set a low procedural pulse if audio is playing to keep graph alive
      avgAmplitude = this.audio.paused ? 0 : 0.08 + Math.abs(Math.sin(time)) * 0.06;
    }

    // Call graph feedback pulse callback
    if (this.onBeatUpdate) {
      this.onBeatUpdate(avgAmplitude);
    }
  }
}
