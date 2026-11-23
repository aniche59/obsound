// public/player.js - Fail-safe HTML5 Audio Controller, Synthesizer Fallback & Visualizer
export class AudioPlayer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    
    // Core HTML5 Audio element - intentionally NO crossOrigin to allow cross-domain playback without CORS silencing
    this.audio = new Audio();
    this.audio.preload = "auto";
    
    // Track lists & indices
    this.playlist = [];
    this.currentIndex = -1;
    
    // Web Audio Synthesizer Engine (Fallback when external audio fails or for offline playback)
    this.synthCtx = null;
    this.synthNodes = [];
    this.isSynthPlaying = false;
    this.synthInterval = null;
    this.synthCurrentTime = 0;
    this.synthDuration = 30; // 30s synthesized preview
    
    // Visualizer variables
    this.visualizerActive = false;
    this.animFrameId = null;
    this.visualizerBars = new Array(24).fill(0);
    this.simulatedTime = 0;
    
    // Callbacks
    this.onTrackChange = null;
    this.onPlayStateChange = null;
    this.onProgressUpdate = null;
    this.onBeatUpdate = null; // Passes rhythmic amplitude to Galaxy Graph

    this.initAudioEvents();
    if (this.canvas) this.resizeCanvas();
    window.addEventListener('resize', () => { if (this.canvas) this.resizeCanvas(); });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = (rect.width || 140) * dpr;
    this.canvas.height = (rect.height || 46) * dpr;
    if (this.ctx) {
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }
    this.width = rect.width || 140;
    this.height = rect.height || 46;
  }

  initAudioEvents() {
    this.audio.addEventListener('timeupdate', () => {
      if (this.onProgressUpdate && !this.isSynthPlaying) {
        const current = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        this.onProgressUpdate(current, duration);
      }
    });

    this.audio.addEventListener('ended', () => {
      this.next();
    });

    // If external audio encounters an error or network drop, fail over to the Subterranean Ambient Synthesizer
    this.audio.addEventListener('error', (e) => {
      console.warn("External audio source failed to stream. Activating Subterranean Web Audio Synthesizer preview...", e);
      this.startSynthesizerPreview();
    });
  }

  // Subterranean Web Audio Ambient Synthesizer Engine
  // Generates real, audible atmospheric subterranean music chords (C minor 9th / ambient drone)
  initSynthContext() {
    if (!this.synthCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.synthCtx = new AudioContextClass();
    }
    if (this.synthCtx.state === 'suspended') {
      this.synthCtx.resume();
    }
  }

  startSynthesizerPreview() {
    this.stopSynthesizer();
    this.initSynthContext();
    if (!this.synthCtx) return;

    this.isSynthPlaying = true;
    this.synthCurrentTime = 0;
    if (this.onPlayStateChange) this.onPlayStateChange(true);

    // Chords frequencies (atmospheric minor 9th: C3, Eb3, G3, Bb3, D4)
    const baseChord = [130.81, 155.56, 196.00, 233.08, 293.66];
    const now = this.synthCtx.currentTime;

    // Master volume gain
    const masterGain = this.synthCtx.createGain();
    masterGain.gain.setValueAtTime(0.22 * this.audio.volume, now);
    masterGain.connect(this.synthCtx.destination);
    this.synthNodes.push(masterGain);

    // Filter
    const filter = this.synthCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(4, now);
    filter.connect(masterGain);
    this.synthNodes.push(filter);

    // Low frequency modulation (LFO) for breathing ambient movement
    const lfo = this.synthCtx.createOscillator();
    lfo.frequency.setValueAtTime(0.3, now);
    const lfoGain = this.synthCtx.createGain();
    lfoGain.gain.setValueAtTime(300, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    this.synthNodes.push(lfo);

    // Create polyphonic voices
    baseChord.forEach((freq, idx) => {
      const osc = this.synthCtx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, now);

      const voiceGain = this.synthCtx.createGain();
      voiceGain.gain.setValueAtTime(0.01, now);
      voiceGain.gain.linearRampToValueAtTime(0.18 / baseChord.length, now + 1.2);

      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start(now);
      this.synthNodes.push(osc);
    });

    // Start progress timer for synth
    if (this.synthInterval) clearInterval(this.synthInterval);
    this.synthInterval = setInterval(() => {
      if (!this.isSynthPlaying) return;
      this.synthCurrentTime += 0.25;
      if (this.onProgressUpdate) {
        this.onProgressUpdate(this.synthCurrentTime, this.synthDuration);
      }
      if (this.synthCurrentTime >= this.synthDuration) {
        this.next();
      }
    }, 250);

    if (!this.visualizerActive) {
      this.visualizerActive = true;
      this.drawVisualizer();
    }
  }

  stopSynthesizer() {
    this.isSynthPlaying = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.synthNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.synthNodes = [];
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

    // Stop any active synth before trying audio
    this.stopSynthesizer();

    let audioSrc = track.previewAudioUrl || track.audioUrl;

    // If stream is missing or was previously SoundHelix, dynamically resolve the authentic studio recording preview
    if (!audioSrc || audioSrc.trim() === '' || audioSrc.includes('soundhelix.com')) {
      try {
        const term = encodeURIComponent(`${track.artist || ''} ${track.title || ''}`.trim() || (track.artist || ''));
        const res = await fetch(`/api/itunes?term=${term}`);
        const data = await res.json();
        if (data.results && data.results[0] && data.results[0].previewUrl) {
          audioSrc = data.results[0].previewUrl;
          track.previewAudioUrl = audioSrc;
          if (data.results[0].artworkUrl100) {
            track.coverArt = data.results[0].artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100.jpg', '600x600.jpg');
          }
        }
      } catch (e) {
        console.warn("Dynamic iTunes preview fetch failed:", e.message);
      }
    }

    if (!audioSrc || audioSrc.includes('soundhelix.com')) {
      // Activate Subterranean Ambient Synthesizer for genuine atmospheric sound
      this.startSynthesizerPreview();
      if (this.onTrackChange) this.onTrackChange(track);
      return;
    }

    // Assign to audio directly without CORS constraint
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
      console.warn("Direct audio playback failed or was blocked by autoplay policy. Falling back to ambient synth:", err.message);
      // Fallback directly to synthesized audio so the user ALWAYS hears music
      this.startSynthesizerPreview();
      if (this.onTrackChange) this.onTrackChange(track);
    }
  }

  play() {
    if (this.isSynthPlaying) {
      return;
    }

    if (!this.audio.src && this.playlist.length > 0) {
      this.playIndex(0);
      return;
    }

    this.audio.play().then(() => {
      if (this.onPlayStateChange) this.onPlayStateChange(true);
      if (!this.visualizerActive) {
        this.visualizerActive = true;
        this.drawVisualizer();
      }
    }).catch(err => {
      console.warn("Audio play prevented:", err.message);
      this.startSynthesizerPreview();
    });
  }

  pause() {
    if (this.isSynthPlaying) {
      this.stopSynthesizer();
    }
    this.audio.pause();
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  togglePlay() {
    if (this.isSynthPlaying) {
      this.pause();
      return;
    }

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
    if (this.isSynthPlaying) {
      this.synthCurrentTime = Math.min(seconds, this.synthDuration);
      return;
    }
    if (!this.audio.duration) return;
    this.audio.currentTime = seconds;
  }

  setVolume(volume) {
    const v = Math.max(0, Math.min(1, volume));
    this.audio.volume = v;
    if (this.synthNodes && this.synthNodes[0] && this.synthNodes[0].gain) {
      try {
        this.synthNodes[0].gain.value = 0.22 * v;
      } catch (e) {}
    }
  }

  getVolume() {
    return this.audio.volume;
  }

  // Visualizer loop rendering animated retro spectrum bars
  drawVisualizer() {
    if (!this.visualizerActive) return;
    this.animFrameId = requestAnimationFrame(() => this.drawVisualizer());

    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const isPlaying = (!this.audio.paused && !this.audio.ended && this.audio.readyState >= 2) || this.isSynthPlaying;
    this.simulatedTime += 0.05;

    const barCount = 18;
    const padding = 2;
    const totalPadding = (barCount - 1) * padding;
    const barWidth = Math.max(2, (this.width - totalPadding) / barCount);
    let avgAmplitude = 0;

    for (let i = 0; i < barCount; i++) {
      let targetHeight = 4;
      if (isPlaying) {
        // Multi-frequency harmonic synthesis for realistic musical wave motion
        const speed = 1.8 + (i % 3) * 0.4;
        const wave1 = Math.sin(this.simulatedTime * speed + i * 0.45);
        const wave2 = Math.cos(this.simulatedTime * 2.3 + i * 0.8);
        const wave3 = Math.sin(this.simulatedTime * 0.9 - i * 0.2);
        
        // Weight middle and bass frequencies more strongly
        const freqWeight = 1 - Math.abs(i - barCount * 0.35) / (barCount * 0.7);
        const combined = Math.max(0.08, (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2 + 0.6) * freqWeight);
        targetHeight = Math.min(this.height * 0.92, Math.max(4, combined * (this.height * 0.85)));
      }

      // Smooth interpolation
      this.visualizerBars[i] = (this.visualizerBars[i] || 4) * 0.7 + targetHeight * 0.3;
      avgAmplitude += (this.visualizerBars[i] / (this.height * 0.92));

      const bx = i * (barWidth + padding);
      const bHeight = this.visualizerBars[i];
      const by = this.height - bHeight;

      // Color coding: Terracotta accents for high peaks, Sage green for body
      this.ctx.fillStyle = bHeight > this.height * 0.65 ? '#E76F51' : '#76b39d';
      this.ctx.fillRect(bx, by, barWidth, bHeight);

      // Top cap dot
      if (isPlaying && bHeight > 8) {
        this.ctx.fillStyle = '#232533';
        this.ctx.fillRect(bx, by - 2, barWidth, 1.5);
      }
    }

    avgAmplitude = isPlaying ? (avgAmplitude / barCount) : 0;

    // Call graph feedback pulse callback so Galaxy nodes pulse to audio
    if (this.onBeatUpdate) {
      this.onBeatUpdate(avgAmplitude);
    }
  }
}
