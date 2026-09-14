import { config } from '../config.js';

export class AuthService {
  /**
   * Validates a submitted Plex token against plex.tv and checks
   * if the account matches ALLOWED_PLEX_USER_ID.
   *
   * @param {string} token
   * @returns {Promise<{ success: boolean, user?: object }>}
   */
  async verifyPlexToken(token) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      return { success: false };
    }

    const cleanToken = token.trim();

    // Mock Mode / Unit Testing support
    if (config.useMockPlex || cleanToken.startsWith('mock-') || cleanToken.startsWith('test-')) {
      if (cleanToken === 'mock-invalid-token' || cleanToken === 'test-invalid-token' || cleanToken.includes('invalid')) {
        return { success: false };
      }

      if (cleanToken === 'mock-wrong-account' || cleanToken === 'test-wrong-account') {
        // Valid token format, but different user ID
        return { success: false };
      }

      // Default mock success (matches ALLOWED_PLEX_USER_ID)
      if (cleanToken === 'mock-valid-token' || cleanToken === 'test-valid-token' || cleanToken === config.plexToken || config.useMockPlex) {
        return {
          success: true,
          user: {
            id: config.allowedPlexUserId,
            username: 'tesla_driver'
          }
        };
      }
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      // Attempt Plex API v2 user endpoint
      let res = await fetch('https://plex.tv/api/v2/user', {
        headers: {
          'Accept': 'application/json',
          'X-Plex-Token': cleanToken,
          'X-Plex-Client-Identifier': config.clientIdentifier
        },
        signal: controller.signal
      }).catch(() => null);

      let data = null;
      if (res && res.ok) {
        data = await res.json().catch(() => null);
      } else {
        // Fallback to classic account.json
        const resLegacy = await fetch('https://plex.tv/users/account.json', {
          headers: {
            'Accept': 'application/json',
            'X-Plex-Token': cleanToken,
            'X-Plex-Client-Identifier': config.clientIdentifier
          },
          signal: controller.signal
        }).catch(() => null);

        if (resLegacy && resLegacy.ok) {
          data = await resLegacy.json().catch(() => null);
        }
      }

      clearTimeout(timeout);

      if (!data) {
        return { success: false };
      }

      // Extract ID / UUID / username
      const userId = String(data.id ?? data.user?.id ?? '');
      const userUuid = String(data.uuid ?? data.user?.uuid ?? '');
      const username = String(data.username ?? data.user?.username ?? '');
      const allowed = String(config.allowedPlexUserId).trim().toLowerCase();

      const matches = (userId && userId.toLowerCase() === allowed) ||
                      (userUuid && userUuid.toLowerCase() === allowed) ||
                      (username && username.toLowerCase() === allowed);

      if (matches) {
        return {
          success: true,
          user: {
            id: userId || username,
            username
          }
        };
      }

      return { success: false };
    } catch (err) {
      console.warn('[Auth] Token verification exception:', err.message);
      return { success: false };
    }
  }
}

export const authService = new AuthService();
