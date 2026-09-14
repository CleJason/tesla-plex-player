import { state } from './state.js';

class AudioEngine {
  constructor() {
    this.audio = document.createElement('audio');
    this.audio.id = 'tesla-audio-core';
    this.audio.preload = 'auto';
    // Append to DOM body so browser policies allow full background playback
    document.body.appendChild(this.audio);

    this.retryCount = 0;
    this.maxRetries = 4;
    this.retryTimer = null;
    this.stallTimer = null;
    this.savedPosition = 0;
    this.isRetrying = false;
    this.savePositionInterval = null;

    this.setupAudioListeners();
    this.setupStateSubscriptions();
    this.setupVisibilityHandling();
    this.setupMediaSession();

    // Restore previously saved state if available
    this.restoreInitialTrack();
  }

  setupAudioListeners() {
    const a = this.audio;

    a.addEventListener('play', () => {
      state.isPlaying = true;
      state.notify('playback_state_changed', { isPlaying: true, isBuffering: false });
      this.clearStallTimer();
      this.startPositionSaver();
    });

    a.addEventListener('pause', () => {
      state.isPlaying = false;
      state.currentTime = a.currentTime;
      state.saveToStorage();
      state.notify('playback_state_changed', { isPlaying: false, isBuffering: false });
      this.stopPositionSaver();
    });

    a.addEventListener('timeupdate', () => {
      if (!this.isRetrying && a.currentTime > 0) {
        state.currentTime = a.currentTime;
        this.savedPosition = a.currentTime;
      }
      // If tab is visible, update progress
      if (!document.hidden) {
        state.notify('time_updated', {
          currentTime: a.currentTime,
          duration: a.duration || state.duration || 0
        });
      }
    });

    a.addEventListener('loadedmetadata', () => {
      state.duration = a.duration || 0;
      state.notify('metadata_loaded', { duration: a.duration });

      // If restoring position from previous session or retry
      if (this.savedPosition > 0 && Math.abs(a.currentTime - this.savedPosition) > 1) {
        try {
          a.currentTime = this.savedPosition;
        } catch (e) {
          console.warn('Seeking on loadedmetadata deferred:', e);
        }
      }
    });

    a.addEventListener('canplay', () => {
      this.clearStallTimer();
      if (this.isRetrying) {
        console.log('[Audio] Stream recovered after retry');
        this.isRetrying = false;
        state.notify('playback_state_changed', { isPlaying: true, isBuffering: false });
        if (this.savedPosition > 0) {
          try {
            a.currentTime = this.savedPosition;
          } catch (e) {}
        }
        a.play().catch(err => console.warn('Resume play after retry prevented:', err));
      }
    });

    a.addEventListener('playing', () => {
      this.clearStallTimer();
      state.notify('playback_state_changed', { isPlaying: true, isBuffering: false });
      // Reset retry counter after 5s of clean playback
      setTimeout(() => {
        if (!a.paused && !a.ended && a.readyState >= 3) {
          this.retryCount = 0;
        }
      }, 5000);
    });

    // Auto-advance to next track on end
    a.addEventListener('ended', () => {
      this.clearStallTimer();
      this.savedPosition = 0;
      state.nextTrack();
    });

    // Cellular Drop & Stall Detection
    a.addEventListener('waiting', () => {
      state.notify('playback_state_changed', { isPlaying: state.isPlaying, isBuffering: true });
      this.armStallDetector('waiting');
    });

    a.addEventListener('stalled', () => {
      state.notify('playback_state_changed', { isPlaying: state.isPlaying, isBuffering: true });
      this.armStallDetector('stalled');
    });

    a.addEventListener('error', (e) => {
      console.warn('[Audio] Audio element error event:', e);
      this.triggerRetry('error');
    });
  }

  armStallDetector(reason) {
    this.clearStallTimer();
    // If waiting/stalled for longer than 4.5 seconds on cellular, initiate retry
    this.stallTimer = setTimeout(() => {
      if (state.isPlaying && (this.audio.readyState < 3 || this.audio.networkState === 2)) {
        console.warn(`[Audio] Audio stalled for >4.5s (${reason}). Auto-retrying stream...`);
        this.triggerRetry(reason);
      }
    }, 4500);
  }

  clearStallTimer() {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  triggerRetry(triggerReason) {
    if (this.isRetrying) return;
    this.clearStallTimer();

    const currentTrack = state.getCurrentTrack();
    if (!currentTrack) return;

    if (this.retryCount >= this.maxRetries) {
      console.error(`[Audio] Max retries reached (${this.maxRetries}). Pausing playback.`);
      this.isRetrying = false;
      state.isPlaying = false;
      state.notify('playback_state_changed', { isPlaying: false, isBuffering: false, error: 'Connection lost. Tap play to retry.' });
      return;
    }

    this.retryCount++;
    this.isRetrying = true;
    this.savedPosition = this.audio.currentTime || state.currentTime || 0;

    // Exponential backoff: 1s, 2s, 4s, 8s
    const backoffMs = Math.min(8000, 1000 * Math.pow(2, this.retryCount - 1));
    console.log(`[Audio] Retrying stream (attempt ${this.retryCount}/${this.maxRetries}) in ${backoffMs}ms from position ${this.savedPosition.toFixed(1)}s...`);

    state.notify('playback_state_changed', {
      isPlaying: true,
      isBuffering: true,
      statusMessage: `Reconnecting stream (attempt ${this.retryCount}/${this.maxRetries})...`
    });

    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.loadTrackStream(currentTrack, true);
    }, backoffMs);
  }

  setupStateSubscriptions() {
    state.subscribe((event, payload) => {
      if (event === 'queue_changed' || event === 'track_changed') {
        const track = state.getCurrentTrack();
        if (track) {
          this.retryCount = 0;
          this.isRetrying = false;
          this.savedPosition = 0
          this.clearStallTimer();
          this.loadTrackStream(track, payload?.autoPlay ?? true);
        }
      } else if (event === 'seek') {
        this.seek(payload.time);
      }
    });
  }

  restoreInitialTrack() {
    const track = state.getCurrentTrack();
    if (track) {
      this.savedPosition = state.currentTime || 0;
      // Preload without auto-playing on page start so user can resume with one tap
      this.loadTrackStream(track, false);
    }
  }

  loadTrackStream(track, autoPlay = true) {
    if (!track) return;
    const retryParam = this.isRetrying ? `&retry=${Date.now()}` : '';
    const streamUrl = `/api/stream/${encodeURIComponent(track.id)}?pos=${Math.floor(this.savedPosition)}${retryParam}`;

    this.audio.src = streamUrl;
    this.audio.load();

    this.updateMediaSession(track);

    if (autoPlay) {
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[Audio] Playback start was deferred by browser policy:', err);
          state.isPlaying = false;
          state.notify('playback_state_changed', { isPlaying: false, isBuffering: false });
        });
      }
    }
  }

  play() {
    if (!this.audio.src) {
      const track = state.getCurrentTrack();
      if (track) {
        this.loadTrackStream(track, true);
        return;
      }
    }
    this.audio.play().catch(err => {
      console.warn('[Audio] play() failed:', err);
    });
  }

  pause() {
    this.audio.pause();
  }

  togglePlayPause() {
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  seek(seconds) {
    if (this.audio.duration && !isNaN(seconds)) {
      const targetTime = Math.max(0, Math.min(seconds, this.audio.duration));
      this.audio.currentTime = targetTime;
      state.currentTime = targetTime;
      this.savedPosition = targetTime;
      state.saveToStorage();
    }
  }

  setVolume(volume) {
    const val = Math.max(0, Math.min(1, volume));
    this.audio.volume = val;
    state.volume = val;
    state.saveToStorage();
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    state.isMuted = this.audio.muted;
    state.saveToStorage();
    state.notify('mute_toggled', { isMuted: this.audio.muted });
  }

  startPositionSaver() {
    this.stopPositionSaver();
    // Throttle writing position to localStorage every 3 seconds during playback
    this.savePositionInterval = setInterval(() => {
      if (state.isPlaying && this.audio.currentTime > 0) {
        state.currentTime = this.audio.currentTime;
        state.saveToStorage();
      }
    }, 3000);
  }

  stopPositionSaver() {
    if (this.savePositionInterval) {
      clearInterval(this.savePositionInterval);
      this.savePositionInterval = null;
    }
  }

  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab is hidden / screen dimmed: stop interval-based position saving
        this.stopPositionSaver();
      } else {
        // Tab restored: resume position saver if playing and update UI immediately
        if (state.isPlaying) {
          this.startPositionSaver();
        }
        state.notify('time_updated', {
          currentTime: this.audio.currentTime,
          duration: this.audio.duration || state.duration || 0
        });
      }
    });
  }

  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => state.prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => state.nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    } catch (e) {
      console.warn('MediaSession action handler registration issue:', e);
    }
  }

  updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !track) return;

    try {
      const artwork = [];
      if (track.thumb) {
        artwork.push(
          { src: track.thumb, sizes: '96x96', type: 'image/jpeg' },
          { src: track.thumb, sizes: '256x256', type: 'image/jpeg' },
          { src: track.thumb, sizes: '512x512', type: 'image/jpeg' }
        );
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Track',
        artist: track.artistTitle || 'Unknown Artist',
        album: track.albumTitle || '',
        artwork
      });
    } catch (e) {
      console.warn('Failed to update MediaSession metadata:', e);
    }
  }
}

export const player = new AudioEngine();
