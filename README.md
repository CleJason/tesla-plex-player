# Tesla Plex Player ⚡🚗🎵

A lightweight, Plexamp-inspired music browser and player engineered specifically for **Tesla's in-car browser** over flaky cellular connections. 

Built with zero heavy front-end frameworks (vanilla HTML5, modern CSS, and ES6 JS) to ensure rapid loading, minimal memory footprint, and high reliability on embedded Chromium touchscreens.

---

## Key Features

- **Plex API Server-Side Proxy**: Your `PLEX_TOKEN` stays strictly server-side and is never exposed to the client or in transit URLs.
- **Tesla Touch-First UI**: Dark theme, high-contrast, and large tap targets (minimum 48–64px) sized for ~1200x800 touchscreen navigation.
- **Single `<audio>` Architecture**: Employs a single lightweight audio element with zero unnecessary video decoders or heavy framework overhead.
- **Cellular Drop Resilience**:
  - **Automatic Stall Recovery**: Detects stalls (`stalled`, `waiting`, or network `error`) and auto-retries streaming with exponential backoff (1s, 2s, 4s, 8s) resuming from the exact `currentTime`.
  - **15s Heartbeat Ping**: Pings `/api/health` every 15s. If 3 pings fail consecutively, displays a non-intrusive "Reconnecting..." indicator without reloading the page or disrupting audio buffered in memory.
  - **Persistent Session State**: Automatically saves current queue, active track index, scrubber position, volume, and shuffle mode to `localStorage`. If the browser tab or car MCU reboots, you can resume right where you left off.
  - **Background / Dimmed Screen Optimization**: Listens to `document.visibilitychange` to suspend UI render timers and animation loops when the tab is hidden or driving, saving CPU, battery, and cellular bandwidth.
- **Audio Transcoding for Mobile**: Proxies Plex's universal transcode endpoint (`/music/:/transcode/universal/start.mp3`) at 192kbps or direct streams compatible AAC/MP3 files with full HTTP Range request support (`206 Partial Content`).
- **MediaSession API Integration**: Supports Tesla steering wheel scroll/skip controls and lockscreen widget metadata (track title, artist, album art).
- **Reverse-Proxy Friendly**: Configured with `app.set('trust proxy', true)` and relative API routes for seamless integration behind Nginx, Traefik, Caddy, or Cloudflare Tunnels.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Heartbeat & status ping (returns `{ status: "ok", mode: "live" \| "mock" }`) |
| `GET` | `/api/artists` | List all artists in the music library |
| `GET` | `/api/artists/:id` | List albums for a given artist |
| `GET` | `/api/albums/:id` | List tracks for an album |
| `GET` | `/api/playlists` | List audio playlists |
| `GET` | `/api/playlists/:id` | List tracks in a playlist |
| `GET` | `/api/search?q=` | Live search across artists, albums, and tracks |
| `GET` | `/api/shuffle/:containerId` | Return a shuffled track list for an artist, album, playlist, or library (`all`) |
| `GET` | `/api/stream/:trackId` | Stream audio with HTTP Range support (`206 Partial Content`) and optional transcoding |
| `GET` | `/api/thumb?path=` | Proxies album and artist artwork with 24h HTTP caching headers |

---

## Quick Start (Local Run)

1. Clone or navigate to the repository:
   ```bash
   cd tesla-plex-polayer
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Configure your `.env`:
   ```env
   PORT=3000
   PLEX_SERVER_URL=http://192.168.1.100:32400
   PLEX_TOKEN=your_secret_plex_token
   TRANSCODE_AUDIO=true
   AUDIO_BITRATE=192
   ```
   *(Note: If `PLEX_SERVER_URL` or `PLEX_TOKEN` is left blank, the player automatically boots into Mock Mode with sample artists and tone playback so you can test immediately!)*

4. Install dependencies and start:
   ```bash
   npm install
   npm start
   ```

5. Open [http://localhost:3355](http://localhost:3355) in your browser.

---

## Deploying with Docker Compose (Home Server / Unraid)

### 1. `docker-compose.yml`

Create or use the included `docker-compose.yml`:

```yaml
services:
  tesla-plex-player:
    build: .
    container_name: tesla-plex-player
    restart: unless-stopped
    ports:
      - "3355:3355"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - PORT=3355
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://127.0.0.1:3355/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
```

Run:
```bash
docker compose up -d --build
```

### 2. Unraid Setup

1. In Unraid Docker management, click **Add Container**.
2. Name: `tesla-plex-player`.
3. Repository: build locally or map to your Docker registry.
4. Add the following Environment Variables:
   - `PORT`: `3355`
   - `PLEX_SERVER_URL`: Your local or internal Plex URL (e.g. `http://192.168.1.50:32400`).
   - `PLEX_TOKEN`: Your Plex token.
   - `TRANSCODE_AUDIO`: `true`.
   - `AUDIO_BITRATE`: `192`.
5. Port: map container port `3355` to host port `3355`.

---

## Reverse Proxy Setup (Accessing outside your Home Network)

Because your Tesla browser runs over cellular data while away from home, expose this app via an HTTPS reverse proxy:

### Nginx / NPM (Nginx Proxy Manager)
- **Domain Names**: `music.yourdomain.com`
- **Scheme**: `http`, **Forward Hostname**: your Docker host IP, **Port**: `3355`
- **Websockets Support**: Enabled (optional)
- **Block Common Exploits**: Enabled
- **SSL**: Force SSL with Let's Encrypt certificate.

### Cloudflare Tunnel (Zero-Trust)
1. Add a Public Hostname in your Cloudflare Tunnel dashboard:
   - Subdomain: `music.yourdomain.com`
   - Service: `HTTP -> localhost:3355`
2. No open router ports needed!

---

## How to Find Your Plex Token

1. Sign into Plex Web in your browser.
2. Navigate to any track or album, click the **...** (More Actions) menu, and click **Get Info**.
3. In the bottom-left corner of the info dialog, click **View XML**.
4. Look at the URL in your browser's address bar. At the very end of the URL, you'll see `X-Plex-Token=XXXXXX`.
5. Copy that value into your `.env` file for `PLEX_TOKEN`.

---

## How to Find Your Plex Account ID (for ALLOWED_PLEX_USER_ID)

To ensure only you can access the app from your Tesla, set `ALLOWED_PLEX_USER_ID` to your numeric Plex user ID or username:

1. With your Plex token in hand, run:
   ```bash
   curl -H "X-Plex-Token: YOUR_PLEX_TOKEN" https://plex.tv/api/v2/user
   ```
2. In the JSON response, locate `"id": 12345678` (or `"username": "your_username"`).
3. Set `ALLOWED_PLEX_USER_ID=12345678` in your `.env` file.
4. Set `SESSION_SECRET=a_random_secure_secret_string` to sign your session cookies.
5. When accessed over HTTPS (via reverse proxy), set `COOKIE_SECURE=true`.

When you first visit the app, you'll see a dark-themed sign-in screen at `/login`. Paste your token once to log in. The server sets a signed, secure, HTTP-only cookie with a ~10-year expiration so your Tesla's browser never gets logged out unless you manually tap the Logout button.

---

## Running the Automated Test Suite

Run the full suite of server, stream, and authentication tests:

```bash
npm test
```

Tests verify:
- Authentication gate: rejecting unauthenticated API calls (401) and page loads (redirect to `/login`)
- Rejecting invalid/empty tokens
- Rejecting valid tokens for unauthorized accounts with generic errors
- Accepting authorized tokens and issuing signed ~10-year session cookies
- Session persistence across requests
- Logout clearing session cookies
- Health check heartbeat (unauthenticated)
- Artists, albums, and playlists listing
- Search querying
- Shuffling algorithms
- Audio streaming with full 200 OK responses
- Audio streaming with HTTP Range requests (`206 Partial Content` slices)
- SVG thumbnail generation and caching headers
