process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';

test('Tesla Plex Player - Server & API Tests', async (t) => {
  let authCookie = null;

  // Obtain session cookie for protected tests
  await t.test('Authenticate before running protected tests', async () => {
    const authRes = await request(app)
      .post('/api/auth/login')
      .send({ token: 'mock-valid-token' });

    assert.equal(authRes.status, 200);
    const cookies = authRes.headers['set-cookie'];
    assert.ok(cookies);
    const cookieHeader = Array.isArray(cookies) ? cookies.find(c => c.startsWith('tesla_plex_session=')) : cookies;
    authCookie = cookieHeader.split(';')[0];
  });

  await t.test('GET /api/health returns 200 and status ok (unauthenticated)', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.timestamp);
  });

  await t.test('GET /api/artists returns list of artists', async () => {
    const res = await request(app)
      .get('/api/artists')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    const first = res.body[0];
    assert.ok(first.id);
    assert.ok(first.title);
  });

  await t.test('GET /api/artists/:id returns albums for that artist', async () => {
    const res = await request(app)
      .get('/api/artists/art-1')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    assert.equal(res.body[0].artistId, 'art-1');
  });

  await t.test('GET /api/albums/:id returns tracks for that album', async () => {
    const res = await request(app)
      .get('/api/albums/alb-1')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    const track = res.body[0];
    assert.ok(track.id);
    assert.ok(track.title);
    assert.ok(track.duration);
  });

  await t.test('GET /api/playlists returns playlists', async () => {
    const res = await request(app)
      .get('/api/playlists')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
  });

  await t.test('GET /api/playlists/:id returns tracks in playlist', async () => {
    const res = await request(app)
      .get('/api/playlists/pl-1')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
  });

  await t.test('GET /api/search?q= returns search results across artists, albums, tracks', async () => {
    const res = await request(app)
      .get('/api/search?q=daft')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(res.body.artists);
    assert.ok(res.body.albums);
    assert.ok(res.body.tracks);
    assert.ok(res.body.artists.length > 0 || res.body.albums.length > 0);
  });

  await t.test('GET /api/shuffle/:containerId returns shuffled tracks', async () => {
    const res = await request(app)
      .get('/api/shuffle/all')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
  });

  await t.test('GET /api/thumb returns SVG image for mock artwork', async () => {
    const res = await request(app)
      .get('/api/thumb?mock=art-1')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /image\/svg\+xml/);
    assert.ok(res.headers['cache-control']);
  });

  await t.test('GET /api/stream/:trackId returns full audio stream (200 OK)', async () => {
    const res = await request(app)
      .get('/api/stream/trk-1')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'audio/wav');
    assert.equal(res.headers['accept-ranges'], 'bytes');
    assert.ok(parseInt(res.headers['content-length'], 10) > 1000);
  });

  await t.test('GET /api/stream/:trackId handles HTTP Range request (206 Partial Content)', async () => {
    const res = await request(app)
      .get('/api/stream/trk-1')
      .set('Cookie', authCookie)
      .set('Range', 'bytes=0-99');

    assert.equal(res.status, 206);
    assert.match(res.headers['content-range'], /bytes 0-99\/\d+/);
    assert.equal(res.headers['content-length'], '100');
    assert.equal(res.body.length, 100);
  });
});
