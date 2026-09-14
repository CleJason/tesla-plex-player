class ApiService {
  constructor() {
    this.isOnline = true;
    this.consecutiveFailures = 0;
    this.maxFailuresBeforeWarning = 3;
    this.heartbeatIntervalMs = 15000;
    this.heartbeatTimer = null;
    this.listeners = new Set();
  }

  onConnectionChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(status) {
    for (const cb of this.listeners) {
      try {
        cb(status);
      } catch (e) {
        console.error('Connection listener error:', e);
      }
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    // Initial check
    this.checkHealth();

    this.heartbeatTimer = setInterval(() => {
      // If tab is hidden, we can still ping every 30s instead of 15s to save cellular data
      if (document.hidden && Math.random() > 0.5) return;
      this.checkHealth();
    }, this.heartbeatIntervalMs);
  }

  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch('/api/health', {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (this.consecutiveFailures >= this.maxFailuresBeforeWarning) {
          console.log('[Connection] Restored connection to backend');
        }
        this.consecutiveFailures = 0;
        if (!this.isOnline) {
          this.isOnline = true;
          this.notify({ online: true });
        }
      } else {
        this.handleFailure();
      }
    } catch (err) {
      this.handleFailure();
    }
  }

  handleFailure() {
    this.consecutiveFailures++;
    console.warn(`[Connection] Heartbeat failed (${this.consecutiveFailures}/${this.maxFailuresBeforeWarning})`);

    if (this.consecutiveFailures >= this.maxFailuresBeforeWarning && this.isOnline) {
      this.isOnline = false;
      this.notify({ online: false });
    }
  }

  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`/api${endpoint}`, options);
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`Request to /api${endpoint} failed:`, err);
      throw err;
    }
  }

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout request failed:', e);
    } finally {
      window.location.href = '/login';
    }
  }

  getArtists() {
    return this.request('/artists');
  }

  getArtistAlbums(artistId) {
    return this.request(`/artists/${encodeURIComponent(artistId)}`);
  }

  getAlbumTracks(albumId) {
    return this.request(`/albums/${encodeURIComponent(albumId)}`);
  }

  getPlaylists() {
    return this.request('/playlists');
  }

  getPlaylistTracks(playlistId) {
    return this.request(`/playlists/${encodeURIComponent(playlistId)}`);
  }

  search(query) {
    return this.request(`/search?q=${encodeURIComponent(query)}`);
  }

  getShuffle(containerId) {
    return this.request(`/shuffle/${encodeURIComponent(containerId)}`);
  }
}

export const api = new ApiService();
