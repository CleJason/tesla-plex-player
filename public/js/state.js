const STORAGE_KEY = 'tesla_plexamp_state_v1';

class PlayerState {
  constructor() {
    this.queue = [];
    this.currentIndex = -1;
    this.currentTime = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.isShuffle = false;
    this.originalQueue = [];
    this.volume = 1.0;
    this.isMuted = false;
    this.currentView = 'artists';
    this.viewParams = null;
    this.breadcrumbs = [];
    this.listeners = new Set();

    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);

      if (Array.isArray(data.queue) && data.queue.length > 0) {
        this.queue = data.queue;
        this.originalQueue = Array.isArray(data.originalQueue) ? data.originalQueue : [...data.queue];
        this.currentIndex = typeof data.currentIndex === 'number' && data.currentIndex >= 0 && data.currentIndex < this.queue.length
          ? data.currentIndex
          : 0;
        this.currentTime = typeof data.currentTime === 'number' ? data.currentTime : 0;
      }

      if (typeof data.isShuffle === 'boolean') {
        this.isShuffle = data.isShuffle;
      }
      if (typeof data.volume === 'number') {
        this.volume = Math.max(0, Math.min(1, data.volume));
      }
      if (typeof data.isMuted === 'boolean') {
        this.isMuted = data.isMuted;
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
  }

  saveToStorage() {
    try {
      const data = {
        queue: this.queue,
        originalQueue: this.originalQueue,
        currentIndex: this.currentIndex,
        currentTime: this.currentTime,
        isShuffle: this.isShuffle,
        volume: this.volume,
        isMuted: this.isMuted
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to persist state to localStorage:', e);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event, payload) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload, this);
      } catch (err) {
        console.error('State listener error:', err);
      }
    }
  }

  getCurrentTrack() {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  setQueue(tracks, startIndex = 0, autoPlay = true) {
    if (!Array.isArray(tracks) || tracks.length === 0) return;
    this.originalQueue = [...tracks];
    this.queue = this.isShuffle ? this._shuffleArray([...tracks]) : [...tracks];
    this.currentIndex = Math.max(0, Math.min(startIndex, this.queue.length - 1));
    this.currentTime = 0;
    this.saveToStorage();
    this.notify('queue_changed', { autoPlay });
  }

  playTrackFromQueue(index) {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      this.currentTime = 0;
      this.saveToStorage();
      this.notify('track_changed', { autoPlay: true });
    }
  }

  nextTrack() {
    if (this.queue.length === 0) return;
    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
    } else {
      // Loop back to start of queue
      this.currentIndex = 0;
    }
    this.currentTime = 0;
    this.saveToStorage();
    this.notify('track_changed', { autoPlay: true });
  }

  prevTrack() {
    if (this.queue.length === 0) return;
    // If track has been playing for more than 3 seconds, restart current track
    if (this.currentTime > 3) {
      this.currentTime = 0;
      this.notify('seek', { time: 0 });
      return;
    }

    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.queue.length - 1;
    }
    this.currentTime = 0;
    this.saveToStorage();
    this.notify('track_changed', { autoPlay: true });
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    const currentTrack = this.getCurrentTrack();

    if (this.isShuffle) {
      // Shuffle the queue, keeping current track first
      const remaining = this.queue.filter((_, idx) => idx !== this.currentIndex);
      this.queue = currentTrack ? [currentTrack, ...this._shuffleArray(remaining)] : this._shuffleArray(this.queue);
      this.currentIndex = currentTrack ? 0 : 0;
    } else {
      // Restore original queue order and find where current track was
      this.queue = [...this.originalQueue];
      if (currentTrack) {
        const foundIdx = this.queue.findIndex(t => t.id === currentTrack.id);
        this.currentIndex = foundIdx !== -1 ? foundIdx : 0;
      }
    }

    this.saveToStorage();
    this.notify('shuffle_toggled', { isShuffle: this.isShuffle });
  }

  _shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export const state = new PlayerState();
