import { config } from '../config.js';
import { mockArtists, mockAlbums, mockTracks, mockPlaylists } from './mockPlexData.js';
import { generateToneWav } from './audioGenerator.js';
import { generateSvgArtwork } from './svgArtwork.js';

let cachedMusicSectionId = null;

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class PlexService {
  constructor() {
    this.serverUrl = config.plexServerUrl;
    this.token = config.plexToken;
    this.clientIdentifier = config.clientIdentifier;
    this.isMock = config.useMockPlex;
  }

  getHeaders() {
    return {
      'Accept': 'application/json',
      'X-Plex-Token': this.token,
      'X-Plex-Client-Identifier': this.clientIdentifier,
      'X-Plex-Product': 'Tesla Plex Player',
      'X-Plex-Version': '1.0.0',
      'X-Plex-Device': 'Tesla In-Car Browser',
      'X-Plex-Platform': 'Tesla'
    };
  }

  async fetchPlex(endpoint) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.serverUrl}${endpoint}`;
    const res = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Plex API error ${res.status} ${res.statusText}: ${text}`);
    }

    return res.json();
  }

  async getMusicSectionId() {
    if (this.isMock) return 'mock-music';
    if (config.plexMusicSectionId) return config.plexMusicSectionId;
    if (cachedMusicSectionId) return cachedMusicSectionId;

    const data = await this.fetchPlex('/library/sections');
    const sections = data?.MediaContainer?.Directory || [];
    const musicSection = sections.find(s => s.type === 'artist');

    if (!musicSection) {
      throw new Error('No music library section found on Plex Media Server');
    }

    cachedMusicSectionId = musicSection.key;
    return cachedMusicSectionId;
  }

  async getArtists() {
    if (this.isMock) {
      return mockArtists;
    }

    const sectionId = await this.getMusicSectionId();
    const data = await this.fetchPlex(`/library/sections/${sectionId}/all?type=8&sort=titleSort:asc`);
    const items = data?.MediaContainer?.Metadata || [];

    return items.map(item => ({
      id: String(item.ratingKey),
      title: item.title,
      thumb: item.thumb ? `/api/thumb?path=${encodeURIComponent(item.thumb)}` : null,
      albumCount: item.childCount || 0,
      summary: item.summary || ''
    }));
  }

  async getArtistAlbums(artistId) {
  if (this.isMock) {
    const albums = mockAlbums.filter(a => a.artistId === artistId);
    return albums;
  }

  const sectionId = await this.getMusicSectionId();
  const data = await this.fetchPlex(`/library/sections/${sectionId}/all?type=9&artist.id=${artistId}`);
  const items = data?.MediaContainer?.Metadata || [];

  return items.map(item => ({
    id: String(item.ratingKey),
    artistId: String(artistId),
    artistTitle: item.parentTitle,
    title: item.title,
    year: item.year || null,
    thumb: item.thumb ? `/api/thumb?path=${encodeURIComponent(item.thumb)}` : null,
    trackCount: item.leafCount || 0
  }));
}

  async getAlbumTracks(albumId) {
    if (this.isMock) {
      const tracks = mockTracks.filter(t => t.albumId === albumId);
      return tracks;
    }

    const data = await this.fetchPlex(`/library/metadata/${albumId}/children`);
    const items = data?.MediaContainer?.Metadata || [];

    return items.map((item, idx) => ({
      id: String(item.ratingKey),
      albumId: String(albumId),
      artistId: String(item.grandparentRatingKey || ''),
      artistTitle: item.grandparentTitle || item.originalTitle || '',
      albumTitle: item.parentTitle || '',
      index: item.index || idx + 1,
      title: item.title,
      duration: item.duration || 0,
      thumb: (item.thumb || item.parentThumb) ? `/api/thumb?path=${encodeURIComponent(item.thumb || item.parentThumb)}` : null,
      codec: item.Media?.[0]?.audioCodec || 'mp3'
    }));
  }

  async getPlaylists() {
    if (this.isMock) {
      return mockPlaylists;
    }

    const data = await this.fetchPlex('/playlists?playlistType=audio');
    const items = data?.MediaContainer?.Metadata || [];

    return items.map(item => ({
      id: String(item.ratingKey),
      title: item.title,
      trackCount: item.leafCount || 0,
      duration: item.duration || 0,
      thumb: item.composite ? `/api/thumb?path=${encodeURIComponent(item.composite)}` : null
    }));
  }

  async getPlaylistTracks(playlistId) {
    if (this.isMock) {
      const pl = mockPlaylists.find(p => p.id === playlistId);
      if (!pl) return [];
      return pl.trackIds.map(tid => mockTracks.find(t => t.id === tid)).filter(Boolean);
    }

    const data = await this.fetchPlex(`/playlists/${playlistId}/items`);
    const items = data?.MediaContainer?.Metadata || [];

    return items.map((item, idx) => ({
      id: String(item.ratingKey),
      albumId: String(item.parentRatingKey || ''),
      artistId: String(item.grandparentRatingKey || ''),
      artistTitle: item.grandparentTitle || item.originalTitle || '',
      albumTitle: item.parentTitle || '',
      index: item.index || idx + 1,
      title: item.title,
      duration: item.duration || 0,
      thumb: (item.thumb || item.parentThumb) ? `/api/thumb?path=${encodeURIComponent(item.thumb || item.parentThumb)}` : null,
      codec: item.Media?.[0]?.audioCodec || 'mp3'
    }));
  }

  async search(query) {
    if (!query || !query.trim()) {
      return { artists: [], albums: [], tracks: [] };
    }
    const q = query.trim().toLowerCase();

    if (this.isMock) {
      const artists = mockArtists.filter(a => a.title.toLowerCase().includes(q));
      const albums = mockAlbums.filter(a => a.title.toLowerCase().includes(q) || a.artistTitle.toLowerCase().includes(q));
      const tracks = mockTracks.filter(t => t.title.toLowerCase().includes(q) || t.artistTitle.toLowerCase().includes(q) || t.albumTitle.toLowerCase().includes(q));
      return { artists, albums, tracks };
    }

    const sectionId = await this.getMusicSectionId();
    const data = await this.fetchPlex(`/hubs/search?query=${encodeURIComponent(query)}&sectionId=${sectionId}&limit=30`);
    const hubs = data?.MediaContainer?.Hub || [];

    const result = { artists: [], albums: [], tracks: [] };

    for (const hub of hubs) {
      const items = hub.Metadata || [];
      if (hub.type === 'artist') {
        result.artists = items.map(item => ({
          id: String(item.ratingKey),
          title: item.title,
          thumb: item.thumb ? `/api/thumb?path=${encodeURIComponent(item.thumb)}` : null,
          albumCount: item.childCount || 0
        }));
      } else if (hub.type === 'album') {
        result.albums = items.map(item => ({
          id: String(item.ratingKey),
          artistTitle: item.parentTitle,
          title: item.title,
          year: item.year || null,
          thumb: item.thumb ? `/api/thumb?path=${encodeURIComponent(item.thumb)}` : null,
          trackCount: item.leafCount || 0
        }));
      } else if (hub.type === 'track') {
        result.tracks = items.map((item, idx) => ({
          id: String(item.ratingKey),
          albumId: String(item.parentRatingKey || ''),
          artistId: String(item.grandparentRatingKey || ''),
          artistTitle: item.grandparentTitle || item.originalTitle || '',
          albumTitle: item.parentTitle || '',
          index: item.index || idx + 1,
          title: item.title,
          duration: item.duration || 0,
          thumb: (item.thumb || item.parentThumb) ? `/api/thumb?path=${encodeURIComponent(item.thumb || item.parentThumb)}` : null,
          codec: item.Media?.[0]?.audioCodec || 'mp3'
        }));
      }
    }

    return result;
  }

  async getShuffleTracks(containerId) {
    if (this.isMock) {
      let candidateTracks = [];
      if (containerId.startsWith('art-')) {
        candidateTracks = mockTracks.filter(t => t.artistId === containerId);
      } else if (containerId.startsWith('alb-')) {
        candidateTracks = mockTracks.filter(t => t.albumId === containerId);
      } else if (containerId.startsWith('pl-')) {
        const pl = mockPlaylists.find(p => p.id === containerId);
        if (pl) {
          candidateTracks = pl.trackIds.map(tid => mockTracks.find(t => t.id === tid)).filter(Boolean);
        }
      } else {
        candidateTracks = [...mockTracks];
      }
      return shuffleArray(candidateTracks);
    }

    let tracks = [];
    try {
      if (containerId === 'all') {
        const sectionId = await this.getMusicSectionId();
        const data = await this.fetchPlex(`/library/sections/${sectionId}/all?type=10&sort=random&limit=100`);
        const items = data?.MediaContainer?.Metadata || [];
        tracks = items.map((item, idx) => ({
          id: String(item.ratingKey),
          albumId: String(item.parentRatingKey || ''),
          artistId: String(item.grandparentRatingKey || ''),
          artistTitle: item.grandparentTitle || item.originalTitle || '',
          albumTitle: item.parentTitle || '',
          index: item.index || idx + 1,
          title: item.title,
          duration: item.duration || 0,
          thumb: (item.thumb || item.parentThumb) ? `/api/thumb?path=${encodeURIComponent(item.thumb || item.parentThumb)}` : null,
          codec: item.Media?.[0]?.audioCodec || 'mp3'
        }));
        return shuffleArray(tracks);
      }

      const meta = await this.fetchPlex(`/library/metadata/${containerId}`);
      const item = meta?.MediaContainer?.Metadata?.[0];
      const type = item?.type;

      if (type === 'artist') {
        const leaves = await this.fetchPlex(`/library/metadata/${containerId}/allLeaves`);
        const items = leaves?.MediaContainer?.Metadata || [];
        tracks = items.map((t, idx) => ({
          id: String(t.ratingKey),
          albumId: String(t.parentRatingKey || ''),
          artistId: String(containerId),
          artistTitle: t.grandparentTitle || item.title || '',
          albumTitle: t.parentTitle || '',
          index: t.index || idx + 1,
          title: t.title,
          duration: t.duration || 0,
          thumb: (t.thumb || t.parentThumb) ? `/api/thumb?path=${encodeURIComponent(t.thumb || t.parentThumb)}` : null,
          codec: t.Media?.[0]?.audioCodec || 'mp3'
        }));
      } else if (type === 'album') {
        tracks = await this.getAlbumTracks(containerId);
      } else if (type === 'playlist') {
        tracks = await this.getPlaylistTracks(containerId);
      } else {
        tracks = await this.getAlbumTracks(containerId);
      }
    } catch {
      try {
        tracks = await this.getPlaylistTracks(containerId);
      } catch (err) {
        throw new Error(`Unable to load shuffle tracks for container ${containerId}: ${err.message}`);
      }
    }

    return shuffleArray(tracks);
  }

  async getTrackStreamInfo(trackId) {
    if (this.isMock) {
      const track = mockTracks.find(t => t.id === trackId) || mockTracks[0];
      return {
        isMock: true,
        track,
        frequency: track.frequency || 440,
        durationSeconds: Math.min(30, Math.floor(track.duration / 1000))
      };
    }

    const data = await this.fetchPlex(`/library/metadata/${trackId}`);
    const track = data?.MediaContainer?.Metadata?.[0];
    if (!track) {
      throw new Error(`Track ${trackId} not found`);
    }

    const media = track.Media?.[0];
    const part = media?.Part?.[0];
    const codec = media?.audioCodec?.toLowerCase() || '';

    const canDirectPlay = !config.transcodeAudio && (codec === 'mp3' || codec === 'aac' || codec === 'm4a');

    let streamUrl;
    if (canDirectPlay && part?.key) {
      streamUrl = `${this.serverUrl}${part.key}?X-Plex-Token=${this.token}`;
    } else {
      // Plex Universal Transcoder to MP3 for guaranteed compatibility in Tesla Chromium.
      // NOTE: this URL is loaded directly by the browser's <audio> tag, so none of the
      // headers from getHeaders() are sent — every required X-Plex-* value must be a
      // query param here. Missing X-Plex-Session-Identifier is what caused 400s.
      const sessionId = `${this.clientIdentifier}-${trackId}`;
      const transcodeParams = new URLSearchParams({
        path: `/library/metadata/${trackId}`,
        mediaIndex: '0',
        partIndex: '0',
        protocol: 'http',
        offset: '0',
        fastSeek: '1',
        directPlay: '0',
        directStream: '1',
        audioQuality: String(config.audioBitrate),
        audioBoost: '100',
        hasMDE: '1',
        location: 'lan',
        'X-Plex-Token': this.token,
        'X-Plex-Client-Identifier': this.clientIdentifier,
        'X-Plex-Session-Identifier': sessionId,
        'X-Plex-Product': 'Tesla Plex Player',
        'X-Plex-Version': '1.0.0',
        'X-Plex-Device': 'Tesla In-Car Browser',
        'X-Plex-Platform': 'Tesla'
      });
      streamUrl = `${this.serverUrl}/music/:/transcode/universal/start.mp3?${transcodeParams.toString()}`;
    }

    return {
      isMock: false,
      trackId,
      streamUrl,
      title: track.title,
      artist: track.grandparentTitle || '',
      album: track.parentTitle || '',
      duration: track.duration,
      codec
    };
  }

  getThumbUrl(thumbPath, width = 400, height = 400) {
    if (this.isMock || !thumbPath) {
      return null;
    }
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      minSize: '1',
      upscale: '1',
      url: thumbPath,
      'X-Plex-Token': this.token
    });
    return `${this.serverUrl}/photo/:/transcode?${params.toString()}`;
  }

  getMockThumb(mockId) {
    const colors = {
      'art-1': 'amber',
      'art-2': 'purple',
      'art-3': 'cyan',
      'art-4': 'rose',
      'art-5': 'emerald',
      'alb-1': 'amber',
      'alb-2': 'amber',
      'alb-3': 'purple',
      'alb-4': 'purple',
      'alb-5': 'cyan',
      'alb-6': 'rose',
      'alb-7': 'emerald',
      'pl-1': 'cyan',
      'pl-2': 'purple'
    };

    let title = 'Music';
    let subtitle = 'Plex';

    const artist = mockArtists.find(a => a.id === mockId);
    if (artist) {
      title = artist.title;
      subtitle = 'Artist';
    } else {
      const album = mockAlbums.find(a => a.id === mockId);
      if (album) {
        title = album.title;
        subtitle = album.artistTitle;
      } else {
        const pl = mockPlaylists.find(p => p.id === mockId);
        if (pl) {
          title = pl.title;
          subtitle = 'Playlist';
        }
      }
    }

    return generateSvgArtwork(title, subtitle, colors[mockId] || 'amber');
  }
}

export const plexService = new PlexService();