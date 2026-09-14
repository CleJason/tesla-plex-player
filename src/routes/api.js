import { Router } from 'express';
import { plexService } from '../services/plexService.js';
import { generateToneWav } from '../services/audioGenerator.js';
import { Readable } from 'stream';

const router = Router();

// GET /api/health - Heartbeat ping endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    mode: plexService.isMock ? 'mock' : 'live'
  });
});

// GET /api/artists - List all artists in the music library
router.get('/artists', async (req, res, next) => {
  try {
    const artists = await plexService.getArtists();
    res.json(artists);
  } catch (err) {
    next(err);
  }
});

// GET /api/artists/:id - Albums for an artist
router.get('/artists/:id', async (req, res, next) => {
  try {
    const albums = await plexService.getArtistAlbums(req.params.id);
    res.json(albums);
  } catch (err) {
    next(err);
  }
});

// GET /api/albums/:id - Tracks for an album
router.get('/albums/:id', async (req, res, next) => {
  try {
    const tracks = await plexService.getAlbumTracks(req.params.id);
    res.json(tracks);
  } catch (err) {
    next(err);
  }
});

// GET /api/playlists - List playlists
router.get('/playlists', async (req, res, next) => {
  try {
    const playlists = await plexService.getPlaylists();
    res.json(playlists);
  } catch (err) {
    next(err);
  }
});

// GET /api/playlists/:id - Tracks in a playlist
router.get('/playlists/:id', async (req, res, next) => {
  try {
    const tracks = await plexService.getPlaylistTracks(req.params.id);
    res.json(tracks);
  } catch (err) {
    next(err);
  }
});

// GET /api/search?q= - Search artists/albums/tracks
router.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const results = await plexService.search(query);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/shuffle/:containerId - Returns a shuffled track list for an album/playlist/artist/all
router.get('/shuffle/:containerId', async (req, res, next) => {
  try {
    const tracks = await plexService.getShuffleTracks(req.params.containerId);
    res.json(tracks);
  } catch (err) {
    next(err);
  }
});

// GET /api/thumb - Artwork proxy to keep Plex token server-side and provide caching
router.get('/thumb', async (req, res, next) => {
  try {
    const { path: thumbPath, mock: mockId, w, h } = req.query;

    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    if (mockId || plexService.isMock) {
      const svg = plexService.getMockThumb(mockId || thumbPath || 'art-1');
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    if (!thumbPath) {
      return res.status(400).send('Missing thumb path');
    }

    const width = parseInt(w || '400', 10);
    const height = parseInt(h || '400', 10);
    const plexThumbUrl = plexService.getThumbUrl(thumbPath, width, height);

    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    const thumbRes = await fetch(plexThumbUrl, {
      signal: abortController.signal
    });

    if (!thumbRes.ok) {
      return res.status(thumbRes.status).send('Failed to fetch artwork from Plex');
    }

    const contentType = thumbRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);

    const stream = Readable.fromWeb(thumbRes.body);
    stream.pipe(res);
  } catch (err) {
    if (err.name === 'AbortError') return;
    next(err);
  }
});

// GET /api/stream/:trackId - Proxies audio stream with Range support and transcodes if needed
router.get('/stream/:trackId', async (req, res, next) => {
  try {
    const { trackId } = req.params;
    const streamInfo = await plexService.getTrackStreamInfo(trackId);

    // Mock Mode Stream (generates WAV buffer for instant testing & seeking)
    if (streamInfo.isMock) {
      const freq = streamInfo.frequency || 440;
      const duration = streamInfo.durationSeconds || 15;
      const fullBuffer = generateToneWav(duration, freq);
      const totalLength = fullBuffer.length;

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'no-cache');

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

        if (start >= totalLength || end >= totalLength || start > end) {
          res.setHeader('Content-Range', `bytes */${totalLength}`);
          return res.status(416).send('Requested Range Not Satisfiable');
        }

        const chunk = fullBuffer.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
        res.setHeader('Content-Length', chunk.length);
        return res.end(chunk);
      }

      res.status(200);
      res.setHeader('Content-Length', totalLength);
      return res.end(fullBuffer);
    }

    // Live Plex Stream Proxying
    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    const fetchHeaders = {};
    if (req.headers.range) {
      fetchHeaders['Range'] = req.headers.range;
    }

    const plexResponse = await fetch(streamInfo.streamUrl, {
      headers: fetchHeaders,
      signal: abortController.signal
    });

    if (!plexResponse.ok && plexResponse.status !== 206) {
      const errText = await plexResponse.text().catch(() => '');
      return res.status(plexResponse.status).send(`Plex stream error: ${errText}`);
    }

    // Set response headers
    res.status(plexResponse.status);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');

    const forwardHeaders = ['content-type', 'content-length', 'content-range'];
    for (const h of forwardHeaders) {
      const val = plexResponse.headers.get(h);
      if (val) {
        res.setHeader(h, val);
      }
    }

    if (!res.getHeader('content-type')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }

    const nodeStream = Readable.fromWeb(plexResponse.body);
    nodeStream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    nodeStream.pipe(res);
  } catch (err) {
    if (err.name === 'AbortError') return;
    next(err);
  }
});

export default router;
