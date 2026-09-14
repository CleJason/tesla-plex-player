import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3355', 10),
  plexServerUrl: (process.env.PLEX_SERVER_URL || '').replace(/\/+$/, ''),
  plexToken: process.env.PLEX_TOKEN || '',
  plexMusicSectionId: process.env.PLEX_MUSIC_SECTION_ID || null,
  transcodeAudio: process.env.TRANSCODE_AUDIO !== 'false',
  audioBitrate: parseInt(process.env.AUDIO_BITRATE || '192', 10),
  clientIdentifier: process.env.PLEX_CLIENT_IDENTIFIER || 'tesla-plex-player',
  // Auto-enable mock mode if explicitly requested or if no Plex URL/token is configured
  useMockPlex: process.env.USE_MOCK_PLEX === 'true' || (!process.env.PLEX_SERVER_URL && !process.env.PLEX_TOKEN),
  // Auth settings
  sessionSecret: process.env.SESSION_SECRET || 'tesla-plex-secret-key-38d72e9a',
  allowedPlexUserId: process.env.ALLOWED_PLEX_USER_ID || 'mock-user-123',
  cookieSecure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : (process.env.NODE_ENV === 'production'),
  cookieMaxAge: 10 * 365 * 24 * 60 * 60 * 1000 // ~10 years, effectively never expires
};
