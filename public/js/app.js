import { api } from './api.js';
import { player } from './audioPlayer.js';
import { state } from './state.js';

// Helper: format seconds to M:SS
function formatTime(secs) {
  if (isNaN(secs) || secs === Infinity || secs === undefined || secs === null) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// DOM Elements
const viewport = document.getElementById('main-viewport');
const breadcrumbsEl = document.getElementById('breadcrumbs');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const tabArtists = document.getElementById('tab-artists');
const tabPlaylists = document.getElementById('tab-playlists');
const tabQueueHeader = document.getElementById('tab-queue-header');
const brandHomeBtn = document.getElementById('brand-home-btn');

const reconnectingBanner = document.getElementById('reconnecting-banner');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');

// Now Playing Elements
const npThumb = document.getElementById('np-thumb');
const npTitle = document.getElementById('np-title');
const npSubtitle = document.getElementById('np-subtitle');
const btnPlayPause = document.getElementById('btn-play-pause');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const btnQueueToggle = document.getElementById('btn-queue-toggle');
const scrubberSlider = document.getElementById('scrubber-slider');
const scrubberFill = document.getElementById('scrubber-fill');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const btnMute = document.getElementById('btn-mute');
const iconVolHigh = document.getElementById('icon-vol-high');
const iconVolMuted = document.getElementById('icon-vol-muted');
const volumeSlider = document.getElementById('volume-slider');
const btnLogout = document.getElementById('btn-logout');

// Queue Drawer
const queueDrawer = document.getElementById('queue-drawer');
const closeQueueBtn = document.getElementById('close-queue-btn');
const queueList = document.getElementById('queue-list');

let isScrubbing = false;
let searchDebounceTimer = null;
let activeView = 'artists';

// Navigation & Breadcrumb History
let navigationStack = [];

function pushNav(crumb) {
  navigationStack.push(crumb);
  renderBreadcrumbs();
}

function popNavTo(index) {
  navigationStack = navigationStack.slice(0, index + 1);
  const target = navigationStack[navigationStack.length - 1];
  if (target && target.action) {
    target.action(false);
  }
  renderBreadcrumbs();
}

function renderBreadcrumbs() {
  breadcrumbsEl.innerHTML = '';
  navigationStack.forEach((crumb, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = 'crumb-separator';
      sep.textContent = '›';
      breadcrumbsEl.appendChild(sep);
    }
    const item = document.createElement('span');
    item.className = `crumb-item ${idx === navigationStack.length - 1 ? 'active' : ''}`;
    item.textContent = crumb.label;
    if (idx < navigationStack.length - 1) {
      item.addEventListener('click', () => popNavTo(idx));
    }
    breadcrumbsEl.appendChild(item);
  });
}

function setActiveTab(viewName) {
  activeView = viewName;
  tabArtists.classList.toggle('active', viewName === 'artists');
  tabPlaylists.classList.toggle('active', viewName === 'playlists');
  tabQueueHeader.classList.toggle('active', viewName === 'queue');
}

// Views

export async function showArtistsView(resetNav = true) {
  setActiveTab('artists');
  if (resetNav) {
    navigationStack = [{ label: 'Artists', action: (r) => showArtistsView(r) }];
    renderBreadcrumbs();
  }

  viewport.innerHTML = `
    <div class="view-title-row">
      <h1 class="view-title">Artists</h1>
    </div>
    <div class="state-center">
      <div class="spinner"></div>
      <div>Loading artists...</div>
    </div>
  `;

  try {
    const artists = await api.getArtists();
    if (!artists || artists.length === 0) {
      viewport.innerHTML = `
        <div class="view-title-row"><h1 class="view-title">Artists</h1></div>
        <div class="state-center">
          <div class="state-icon">🎵</div>
          <div>No artists found in your music library.</div>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'card-grid';

    artists.forEach(artist => {
      const card = document.createElement('div');
      card.className = 'item-card';
      const thumbSrc = artist.thumb || `/api/thumb?mock=${encodeURIComponent(artist.id)}`;
      card.innerHTML = `
        <div class="card-art-wrap">
          <img class="card-art" src="${thumbSrc}" alt="${artist.title}" loading="lazy">
        </div>
        <div class="card-title" title="${artist.title}">${artist.title}</div>
        <div class="card-subtitle">${artist.albumCount ? `${artist.albumCount} ${artist.albumCount === 1 ? 'album' : 'albums'}` : 'Artist'}</div>
      `;
      card.addEventListener('click', () => {
        showArtistAlbumsView(artist.id, artist.title);
      });
      grid.appendChild(card);
    });

    viewport.innerHTML = `<div class="view-title-row"><h1 class="view-title">Artists</h1></div>`;
    viewport.appendChild(grid);
  } catch (err) {
    viewport.innerHTML = `
      <div class="state-center">
        <div class="state-icon">⚠️</div>
        <div>Failed to load artists. Please check server connection.</div>
      </div>
    `;
  }
}

export async function showArtistAlbumsView(artistId, artistTitle, pushHistory = true) {
  setActiveTab('artists');
  if (pushHistory) {
    pushNav({ label: artistTitle, action: () => showArtistAlbumsView(artistId, artistTitle, false) });
  }

  viewport.innerHTML = `
    <div class="state-center">
      <div class="spinner"></div>
      <div>Loading albums for ${artistTitle}...</div>
    </div>
  `;

  try {
    const albums = await api.getArtistAlbums(artistId);
    if (!albums || albums.length === 0) {
      viewport.innerHTML = `
        <div class="state-center">
          <div class="state-icon">💿</div>
          <div>No albums found for ${artistTitle}.</div>
        </div>
      `;
      return;
    }

    viewport.innerHTML = `
      <div class="view-title-row">
        <h1 class="view-title">${artistTitle}</h1>
        <button id="btn-shuffle-artist" class="action-btn secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 3 21 3 21 8"></polyline>
            <line x1="4" y1="20" x2="21" y2="3"></line>
            <polyline points="21 16 21 21 16 21"></polyline>
            <line x1="15" y1="15" x2="21" y2="21"></line>
            <line x1="4" y1="4" x2="9" y2="9"></line>
          </svg>
          Shuffle Artist
        </button>
      </div>
      <div class="card-grid" id="albums-grid"></div>
    `;

    document.getElementById('btn-shuffle-artist').addEventListener('click', async () => {
      try {
        const tracks = await api.getShuffle(artistId);
        if (tracks.length > 0) {
          state.isShuffle = true;
          state.setQueue(tracks, 0, true);
        }
      } catch (e) {
        console.error('Shuffle artist failed:', e);
      }
    });

    const grid = document.getElementById('albums-grid');
    albums.forEach(album => {
      const card = document.createElement('div');
      card.className = 'item-card';
      const thumbSrc = album.thumb || `/api/thumb?mock=${encodeURIComponent(album.id)}`;
      card.innerHTML = `
        <div class="card-art-wrap">
          <img class="card-art" src="${thumbSrc}" alt="${album.title}" loading="lazy">
        </div>
        <div class="card-title" title="${album.title}">${album.title}</div>
        <div class="card-subtitle">${album.year ? album.year : ''} ${album.trackCount ? `• ${album.trackCount} tracks` : ''}</div>
      `;
      card.addEventListener('click', () => {
        showAlbumTracksView(album.id, album.title, artistTitle, thumbSrc);
      });
      grid.appendChild(card);
    });
  } catch (err) {
    viewport.innerHTML = `
      <div class="state-center">
        <div class="state-icon">⚠️</div>
        <div>Failed to load albums for this artist.</div>
      </div>
    `;
  }
}

export async function showAlbumTracksView(albumId, albumTitle, artistTitle, albumThumb, pushHistory = true) {
  setActiveTab('artists');
  if (pushHistory) {
    pushNav({ label: albumTitle, action: () => showAlbumTracksView(albumId, albumTitle, artistTitle, albumThumb, false) });
  }

  viewport.innerHTML = `
    <div class="state-center">
      <div class="spinner"></div>
      <div>Loading tracks...</div>
    </div>
  `;

  try {
    const tracks = await api.getAlbumTracks(albumId);
    renderTrackListView({
      type: 'Album',
      title: albumTitle,
      subtitle: artistTitle,
      thumb: albumThumb || (tracks[0] && tracks[0].thumb) || `/api/thumb?mock=${albumId}`,
      tracks,
      containerId: albumId
    });
  } catch (err) {
    viewport.innerHTML = `
      <div class="state-center">
        <div class="state-icon">⚠️</div>
        <div>Failed to load tracks.</div>
      </div>
    `;
  }
}

export async function showPlaylistsView(resetNav = true) {
  setActiveTab('playlists');
  if (resetNav) {
    navigationStack = [{ label: 'Playlists', action: (r) => showPlaylistsView(r) }];
    renderBreadcrumbs();
  }

  viewport.innerHTML = `
    <div class="view-title-row">
      <h1 class="view-title">Playlists</h1>
    </div>
    <div class="state-center">
      <div class="spinner"></div>
      <div>Loading playlists...</div>
    </div>
  `;

  try {
    const playlists = await api.getPlaylists();
    if (!playlists || playlists.length === 0) {
      viewport.innerHTML = `
        <div class="view-title-row"><h1 class="view-title">Playlists</h1></div>
        <div class="state-center">
          <div class="state-icon">📑</div>
          <div>No playlists found.</div>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'card-grid';

    playlists.forEach(pl => {
      const card = document.createElement('div');
      card.className = 'item-card';
      const thumbSrc = pl.thumb || `/api/thumb?mock=${encodeURIComponent(pl.id)}`;
      card.innerHTML = `
        <div class="card-art-wrap">
          <img class="card-art" src="${thumbSrc}" alt="${pl.title}" loading="lazy">
        </div>
        <div class="card-title" title="${pl.title}">${pl.title}</div>
        <div class="card-subtitle">${pl.trackCount} ${pl.trackCount === 1 ? 'track' : 'tracks'}</div>
      `;
      card.addEventListener('click', () => {
        showPlaylistTracksView(pl.id, pl.title, thumbSrc);
      });
      grid.appendChild(card);
    });

    viewport.innerHTML = `<div class="view-title-row"><h1 class="view-title">Playlists</h1></div>`;
    viewport.appendChild(grid);
  } catch (err) {
    viewport.innerHTML = `
      <div class="state-center">
        <div class="state-icon">⚠️</div>
        <div>Failed to load playlists.</div>
      </div>
    `;
  }
}

export async function showPlaylistTracksView(playlistId, playlistTitle, playlistThumb, pushHistory = true) {
  setActiveTab('playlists');
  if (pushHistory) {
    pushNav({ label: playlistTitle, action: () => showPlaylistTracksView(playlistId, playlistTitle, playlistThumb, false) });
  }

  viewport.innerHTML = `
    <div class="state-center">
      <div class="spinner"></div>
      <div>Loading playlist items...</div>
    </div>
  `;

  try {
    const tracks = await api.getPlaylistTracks(playlistId);
    renderTrackListView({
      type: 'Playlist',
      title: playlistTitle,
      subtitle: `${tracks.length} tracks`,
      thumb: playlistThumb || `/api/thumb?mock=${playlistId}`,
      tracks,
      containerId: playlistId
    });
  } catch (err) {
    viewport.innerHTML = `
      <div class="state-center">
        <div class="state-icon">⚠️</div>
        <div>Failed to load playlist tracks.</div>
      </div>
    `;
  }
}

function renderTrackListView({ type, title, subtitle, thumb, tracks, containerId }) {
  const currentTrack = state.getCurrentTrack();

  const totalDurationMs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMins = Math.round(totalDurationMs / 60000);

  viewport.innerHTML = `
    <div class="container-header">
      <img class="container-art" src="${thumb}" alt="${title}">
      <div class="container-info">
        <div class="container-type">${type}</div>
        <h1 class="container-title">${title}</h1>
        <div class="container-meta">${subtitle} • ${tracks.length} tracks (${totalMins} min)</div>
        <div class="container-actions">
          <button id="btn-play-all" class="action-btn primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Play All
          </button>
          <button id="btn-shuffle-container" class="action-btn secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
            Shuffle
          </button>
        </div>
      </div>
    </div>
    <div class="track-list" id="track-list-rows"></div>
  `;

  document.getElementById('btn-play-all').addEventListener('click', () => {
    state.isShuffle = false;
    state.setQueue(tracks, 0, true);
  });

  document.getElementById('btn-shuffle-container').addEventListener('click', async () => {
    try {
      const shuffled = await api.getShuffle(containerId);
      state.isShuffle = true;
      state.setQueue(shuffled.length > 0 ? shuffled : tracks, 0, true);
    } catch (e) {
      state.isShuffle = true;
      state.setQueue(tracks, 0, true);
    }
  });

  const listContainer = document.getElementById('track-list-rows');
  tracks.forEach((track, index) => {
    const isCurrent = currentTrack && currentTrack.id === track.id;
    const row = document.createElement('div');
    row.className = `track-row ${isCurrent ? 'active' : ''} ${isCurrent && state.isPlaying ? 'is-playing' : ''}`;
    row.dataset.trackId = track.id;

    const durationSec = Math.round((track.duration || 0) / 1000);

    row.innerHTML = `
      <div class="track-num">
        <span class="track-num-text">${track.index || index + 1}</span>
        <svg class="track-playing-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </div>
      <div class="track-details">
        <div class="track-title">${track.title}</div>
        <div class="track-artist">${track.artistTitle || ''}</div>
      </div>
      <div class="track-duration">${formatTime(durationSec)}</div>
    `;

    row.addEventListener('click', () => {
      state.isShuffle = false;
      state.setQueue(tracks, index, true);
    });

    listContainer.appendChild(row);
  });
}

// Search Results View
export async function showSearchResultsView(query) {
  if (!query || !query.trim()) {
    showArtistsView();
    return;
  }

  setActiveTab('search');
  navigationStack = [{ label: `Search: "${query}"`, action: () => showSearchResultsView(query) }];
  renderBreadcrumbs();

  viewport.innerHTML = `
    <div class="state-center">
      <div class="spinner"></div>
      <div>Searching for "${query}"...</div>
    </div>
  `;

  try {
    const results = await api.search(query);
    const { artists, albums, tracks } = results;

    const hasAny = (artists?.length || 0) + (albums?.length || 0) + (tracks?.length || 0) > 0;

    if (!hasAny) {
      viewport.innerHTML = `
        <div class="state-center">
          <div class="state-icon">🔍</div>
          <div>No results found for "${query}"</div>
        </div>
      `;
      return;
    }

    viewport.innerHTML = `<div class="view-title-row"><h1 class="view-title">Results for "${query}"</h1></div>`;

    // Artists Section
    if (artists && artists.length > 0) {
      const artSec = document.createElement('div');
      artSec.className = 'search-section';
      artSec.innerHTML = `<div class="search-section-header">Artists</div><div class="card-grid" id="search-artists-grid"></div>`;
      viewport.appendChild(artSec);

      const grid = artSec.querySelector('#search-artists-grid');
      artists.forEach(artist => {
        const card = document.createElement('div');
        card.className = 'item-card';
        const thumb = artist.thumb || `/api/thumb?mock=${artist.id}`;
        card.innerHTML = `
          <div class="card-art-wrap"><img class="card-art" src="${thumb}" alt="${artist.title}" loading="lazy"></div>
          <div class="card-title">${artist.title}</div>
          <div class="card-subtitle">${artist.albumCount ? `${artist.albumCount} albums` : 'Artist'}</div>
        `;
        card.addEventListener('click', () => showArtistAlbumsView(artist.id, artist.title));
        grid.appendChild(card);
      });
    }

    // Albums Section
    if (albums && albums.length > 0) {
      const albSec = document.createElement('div');
      albSec.className = 'search-section';
      albSec.innerHTML = `<div class="search-section-header">Albums</div><div class="card-grid" id="search-albums-grid"></div>`;
      viewport.appendChild(albSec);

      const grid = albSec.querySelector('#search-albums-grid');
      albums.forEach(album => {
        const card = document.createElement('div');
        card.className = 'item-card';
        const thumb = album.thumb || `/api/thumb?mock=${album.id}`;
        card.innerHTML = `
          <div class="card-art-wrap"><img class="card-art" src="${thumb}" alt="${album.title}" loading="lazy"></div>
          <div class="card-title">${album.title}</div>
          <div class="card-subtitle">${album.artistTitle || ''}</div>
        `;
        card.addEventListener('click', () => showAlbumTracksView(album.id, album.title, album.artistTitle, thumb));
        grid.appendChild(card);
      });
    }

    // Tracks Section
    if (tracks && tracks.length > 0) {
      const trkSec = document.createElement('div');
      trkSec.className = 'search-section';
      trkSec.innerHTML = `<div class="search-section-header">Tracks</div><div class="track-list" id="search-tracks-list"></div>`;
      viewport.appendChild(trkSec);

      const list = trkSec.querySelector('#search-tracks-list');
      tracks.forEach((track, index) => {
        const row = document.createElement('div');
        row.className = 'track-row';
        row.innerHTML = `
          <div class="track-num"><span class="track-num-text">${index + 1}</span></div>
          <div class="track-details">
            <div class="track-title">${track.title}</div>
            <div class="track-artist">${track.artistTitle || ''} • ${track.albumTitle || ''}</div>
          </div>
          <div class="track-duration">${formatTime(Math.round((track.duration || 0) / 1000))}</div>
        `;
        row.addEventListener('click', () => {
          state.setQueue([track], 0, true);
        });
        list.appendChild(row);
      });
    }
  } catch (err) {
    viewport.innerHTML = `
      <div class="state-center">
        <div class="state-icon">⚠️</div>
        <div>Search failed. Please try again.</div>
      </div>
    `;
  }
}

// Queue Drawer View
function updateQueueDrawer() {
  queueList.innerHTML = '';
  if (state.queue.length === 0) {
    queueList.innerHTML = `
      <div class="state-center" style="padding: 40px 0;">
        <div class="state-icon" style="font-size: 2rem;">🎵</div>
        <div>Queue is empty</div>
      </div>
    `;
    return;
  }

  state.queue.forEach((track, idx) => {
    const isCurrent = idx === state.currentIndex;
    const row = document.createElement('div');
    row.className = `track-row ${isCurrent ? 'active' : ''} ${isCurrent && state.isPlaying ? 'is-playing' : ''}`;
    row.style.height = '52px';

    row.innerHTML = `
      <div class="track-num">
        <span class="track-num-text">${idx + 1}</span>
        <svg class="track-playing-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </div>
      <div class="track-details">
        <div class="track-title" style="font-size: 0.95rem;">${track.title}</div>
        <div class="track-artist" style="font-size: 0.8rem;">${track.artistTitle || ''}</div>
      </div>
      <div class="track-duration">${formatTime(Math.round((track.duration || 0) / 1000))}</div>
    `;

    row.addEventListener('click', () => {
      state.playTrackFromQueue(idx);
    });

    queueList.appendChild(row);
  });
}

// Setup Event Listeners
function setupEvents() {
  // Navigation Tabs
  tabArtists.addEventListener('click', () => showArtistsView());
  tabPlaylists.addEventListener('click', () => showPlaylistsView());
  brandHomeBtn.addEventListener('click', () => showArtistsView());

  tabQueueHeader.addEventListener('click', () => {
    queueDrawer.classList.toggle('open');
    if (queueDrawer.classList.contains('open')) {
      updateQueueDrawer();
    }
  });

  btnQueueToggle.addEventListener('click', () => {
    queueDrawer.classList.toggle('open');
    if (queueDrawer.classList.contains('open')) {
      updateQueueDrawer();
    }
  });

  closeQueueBtn.addEventListener('click', () => {
    queueDrawer.classList.remove('open');
  });

  // Search input debouncing
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    searchClearBtn.classList.toggle('visible', val.length > 0);

    clearTimeout(searchDebounceTimer);
    if (val.length >= 2) {
      searchDebounceTimer = setTimeout(() => {
        showSearchResultsView(val);
      }, 300);
    } else if (val.length === 0) {
      showArtistsView();
    }
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.remove('visible');
    showArtistsView();
  });

  // Playback transport buttons
  btnPlayPause.addEventListener('click', () => {
    player.togglePlayPause();
  });

  btnPrev.addEventListener('click', () => {
    state.prevTrack();
  });

  btnNext.addEventListener('click', () => {
    state.nextTrack();
  });

  btnShuffle.addEventListener('click', () => {
    state.toggleShuffle();
  });

  // Timeline scrubber
  scrubberSlider.addEventListener('input', (e) => {
    isScrubbing = true;
    const pct = parseFloat(e.target.value);
    scrubberFill.style.width = `${pct}%`;
    const dur = player.audio.duration || state.duration || 0;
    timeCurrent.textContent = formatTime((pct / 100) * dur);
  });

  scrubberSlider.addEventListener('change', (e) => {
    const pct = parseFloat(e.target.value);
    const dur = player.audio.duration || state.duration || 0;
    const seekTime = (pct / 100) * dur;
    player.seek(seekTime);
    isScrubbing = false;
  });

  // Volume slider and mute
  volumeSlider.value = state.volume;
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    player.setVolume(val);
    updateVolumeIcon(val, state.isMuted);
  });

  btnMute.addEventListener('click', () => {
    player.toggleMute();
  });

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      api.logout();
    });
  }

  // Keyboard controls for in-car browser or test keyboard
  window.addEventListener('keydown', (e) => {
    if (document.activeElement === searchInput) return;

    if (e.code === 'Space') {
      e.preventDefault();
      player.togglePlayPause();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      state.nextTrack();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      state.prevTrack();
    } else if (e.code === 'Escape') {
      queueDrawer.classList.remove('open');
    }
  });
}

function updateVolumeIcon(vol, isMuted) {
  if (isMuted || vol === 0) {
    iconVolHigh.style.display = 'none';
    iconVolMuted.style.display = 'block';
  } else {
    iconVolHigh.style.display = 'block';
    iconVolMuted.style.display = 'none';
  }
}

// State & UI Synchronizer
function setupStateObservers() {
  // Sync now-playing bar
  const syncNowPlaying = () => {
    const track = state.getCurrentTrack();
    btnShuffle.classList.toggle('active', state.isShuffle);

    if (!track) {
      npTitle.textContent = 'No Track Selected';
      npSubtitle.textContent = 'Select an artist or album';
      npThumb.src = '/api/thumb?mock=art-1';
      timeCurrent.textContent = '0:00';
      timeTotal.textContent = '0:00';
      scrubberSlider.value = 0;
      scrubberFill.style.width = '0%';
      return;
    }

    npTitle.textContent = track.title || 'Unknown Title';
    npSubtitle.textContent = `${track.artistTitle || ''} ${track.albumTitle ? `• ${track.albumTitle}` : ''}`;
    npThumb.src = track.thumb || `/api/thumb?mock=${track.albumId || 'art-1'}`;

    const durSec = Math.round((track.duration || 0) / 1000);
    timeTotal.textContent = formatTime(durSec);

    // Update active row in track list if visible
    document.querySelectorAll('.track-row').forEach(row => {
      const isCurrent = row.dataset.trackId === track.id;
      row.classList.toggle('active', isCurrent);
      row.classList.toggle('is-playing', isCurrent && state.isPlaying);
    });

    if (queueDrawer.classList.contains('open')) {
      updateQueueDrawer();
    }
  };

  state.subscribe((event, payload) => {
    if (event === 'queue_changed' || event === 'track_changed') {
      syncNowPlaying();
    } else if (event === 'playback_state_changed') {
      const { isPlaying, isBuffering } = payload;
      if (isPlaying) {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
      } else {
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
      }

      // Update track row play indicator
      const currentTrack = state.getCurrentTrack();
      if (currentTrack) {
        document.querySelectorAll(`.track-row[data-track-id="${currentTrack.id}"]`).forEach(row => {
          row.classList.toggle('is-playing', isPlaying);
        });
      }

      // If buffering or reconnecting
      if (isBuffering && payload.statusMessage) {
        npSubtitle.textContent = payload.statusMessage;
      } else if (currentTrack) {
        npSubtitle.textContent = `${currentTrack.artistTitle || ''} ${currentTrack.albumTitle ? `• ${currentTrack.albumTitle}` : ''}`;
      }
    } else if (event === 'time_updated' && !isScrubbing) {
      const { currentTime, duration } = payload;
      timeCurrent.textContent = formatTime(currentTime);
      if (duration > 0) {
        timeTotal.textContent = formatTime(duration);
        const pct = (currentTime / duration) * 100;
        scrubberSlider.value = pct;
        scrubberFill.style.width = `${pct}%`;
      }
    } else if (event === 'shuffle_toggled') {
      btnShuffle.classList.toggle('active', payload.isShuffle);
      if (queueDrawer.classList.contains('open')) {
        updateQueueDrawer();
      }
    } else if (event === 'mute_toggled') {
      updateVolumeIcon(state.volume, payload.isMuted);
    }
  });

  // Initial UI sync
  syncNowPlaying();
  updateVolumeIcon(state.volume, state.isMuted);
}

// Connection & Cellular Resilience
function setupResilience() {
  api.onConnectionChange(({ online }) => {
    if (online) {
      reconnectingBanner.classList.remove('visible');
      connectionIndicator.className = 'connection-pill';
      connectionText.textContent = 'Online';
    } else {
      reconnectingBanner.classList.add('visible');
      connectionIndicator.className = 'connection-pill reconnecting';
      connectionText.textContent = 'Reconnecting';
    }
  });

  // Start 15s heartbeat
  api.startHeartbeat();
}

// Initialize Application
function init() {
  setupEvents();
  setupStateObservers();
  setupResilience();
  showArtistsView();
}

window.addEventListener('DOMContentLoaded', init);
