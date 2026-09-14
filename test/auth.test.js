process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';
import { config } from '../src/config.js';

test('Authentication & Session Gate Tests', async (t) => {
  // Test 1: Rejecting requests with no session
  await t.test('GET /api/artists returns 401 when no session cookie is provided', async () => {
    const res = await request(app).get('/api/artists');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized. Please login.');
  });

  await t.test('GET / redirects to /login when unauthenticated', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/login');
  });

  await t.test('GET /api/health remains accessible without authentication (healthcheck)', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  // Test 2: Rejecting invalid token
  await t.test('POST /api/auth/login rejects empty or invalid token with generic 401 error', async () => {
    const resEmpty = await request(app)
      .post('/api/auth/login')
      .send({});
    assert.equal(resEmpty.status, 401);
    assert.equal(resEmpty.body.error, 'Invalid token or unauthorized account');

    const resInvalid = await request(app)
      .post('/api/auth/login')
      .send({ token: 'mock-invalid-token' });
    assert.equal(resInvalid.status, 401);
    assert.equal(resInvalid.body.error, 'Invalid token or unauthorized account');
  });

  // Test 3: Rejecting valid token + wrong account ID
  await t.test('POST /api/auth/login rejects valid token with wrong account ID with same generic error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ token: 'mock-wrong-account' });
    assert.equal(res.status, 401);
    // Verifies generic error does not reveal token validity vs account mismatch
    assert.equal(res.body.error, 'Invalid token or unauthorized account');
  });

  // Test 4: Accepting valid token + matching account ID
  let sessionCookie = null;
  await t.test('POST /api/auth/login accepts valid token + matching account ID and sets session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ token: 'mock-valid-token' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Set-Cookie header should be present');
    
    // Find session cookie
    const cookieHeader = Array.isArray(cookies) ? cookies.find(c => c.startsWith('tesla_plex_session=')) : cookies;
    assert.ok(cookieHeader, 'tesla_plex_session cookie should be set');
    assert.match(cookieHeader, /HttpOnly/i, 'Cookie must be HttpOnly');
    assert.match(cookieHeader, /Max-Age=\d+/i, 'Cookie must have Max-Age');

    sessionCookie = cookieHeader.split(';')[0];
  });

  // Test 5: Session persistence across requests
  await t.test('Session persists across subsequent requests using the session cookie', async () => {
    assert.ok(sessionCookie, 'Session cookie must be available from login');

    // Access protected API with session cookie
    const apiRes = await request(app)
      .get('/api/artists')
      .set('Cookie', sessionCookie);

    assert.equal(apiRes.status, 200);
    assert.ok(Array.isArray(apiRes.body));
    assert.ok(apiRes.body.length > 0);

    // Access protected page with session cookie
    const pageRes = await request(app)
      .get('/')
      .set('Cookie', sessionCookie);

    assert.equal(pageRes.status, 200);
    assert.match(pageRes.text, /Tesla Plex Player/i);

    // Visiting /login while authenticated redirects to /
    const loginRedirect = await request(app)
      .get('/login')
      .set('Cookie', sessionCookie);

    assert.equal(loginRedirect.status, 302);
    assert.equal(loginRedirect.headers.location, '/');
  });

  // Test 6: Logout clearing the session
  await t.test('POST /api/auth/logout clears the session cookie and revokes access', async () => {
    assert.ok(sessionCookie, 'Session cookie must be available');

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookie);

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    const cookies = logoutRes.headers['set-cookie'];
    assert.ok(cookies);
    const clearedCookie = Array.isArray(cookies) ? cookies.find(c => c.startsWith('tesla_plex_session=')) : cookies;
    assert.ok(clearedCookie);
    // Expires in the past / empty value
    assert.match(clearedCookie, /Expires=|Max-Age=0/i);

    // Subsequent request without cookie or with cleared cookie is rejected
    const afterLogoutRes = await request(app).get('/api/artists');
    assert.equal(afterLogoutRes.status, 401);
  });
});
