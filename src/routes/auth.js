import { Router } from 'express';
import { authService } from '../services/authService.js';
import { config } from '../config.js';
import { SESSION_COOKIE_NAME, isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(401).json({
        error: 'Invalid token or unauthorized account'
      });
    }

    const result = await authService.verifyPlexToken(token);

    if (!result.success) {
      // Generic error: never reveal whether token was invalid vs. wrong account
      return res.status(401).json({
        error: 'Invalid token or unauthorized account'
      });
    }

    // Determine cookie secure flag
    const isSecure = config.cookieSecure || req.secure || req.headers['x-forwarded-proto'] === 'https';

    // Set signed session cookie with ~10 year lifetime (effectively permanent)
    res.cookie(SESSION_COOKIE_NAME, config.allowedPlexUserId, {
      maxAge: config.cookieMaxAge,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      signed: true
    });

    return res.json({
      success: true,
      message: 'Authentication successful'
    });
  } catch (err) {
    console.error('[Auth Route Error]', err);
    return res.status(401).json({
      error: 'Invalid token or unauthorized account'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax'
  });
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// GET /api/auth/me - Check current session status
router.get('/me', (req, res) => {
  return res.json({
    authenticated: isAuthenticated(req)
  });
});

export default router;
