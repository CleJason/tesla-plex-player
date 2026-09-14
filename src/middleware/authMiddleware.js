import { config } from '../config.js';

export const SESSION_COOKIE_NAME = 'tesla_plex_session';

export function isAuthenticated(req) {
  const sessionUserId = req.signedCookies?.[SESSION_COOKIE_NAME];
  if (!sessionUserId) return false;
  return String(sessionUserId).toLowerCase() === String(config.allowedPlexUserId).toLowerCase();
}

/**
 * Middleware protecting all /api/* routes except /api/health and /api/auth/*
 */
export function requireApiAuth(req, res, next) {
  // Always permit healthcheck
  if (req.path === '/health') {
    return next();
  }

  if (isAuthenticated(req)) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized. Please login.'
  });
}

/**
 * Middleware protecting page navigation.
 * Redirects to /login if unauthenticated.
 */
export function requirePageAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }
  return res.redirect('/login');
}

/**
 * Middleware for the /login page route.
 * If already authenticated, redirects straight to /.
 */
export function redirectIfAuthenticated(req, res, next) {
  if (isAuthenticated(req)) {
    return res.redirect('/');
  }
  return next();
}
