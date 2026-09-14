export function generateSvgArtwork(title, subtitle, colorScheme = 'amber') {
  const schemes = {
    amber: ['#1f1606', '#d97706', '#fbbf24'],
    cyan: ['#041d24', '#0284c7', '#38bdf8'],
    purple: ['#1a0b2e', '#7c3aed', '#a78bfa'],
    emerald: ['#022c22', '#059669', '#34d399'],
    rose: ['#2e0b16', '#e11d48', '#fb7185']
  };

  const [bgDark, primary, secondary] = schemes[colorScheme] || schemes.amber;
  const safeTitle = (title || 'Music').replace(/[<>&"]/g, '');
  const safeSubtitle = (subtitle || 'Plex').replace(/[<>&"]/g, '');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgDark}" />
      <stop offset="100%" stop-color="#0a0a0c" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="${secondary}" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="16" fill="url(#bgGrad)" />
  <circle cx="200" cy="160" r="90" fill="none" stroke="url(#accentGrad)" stroke-width="4" stroke-opacity="0.3" />
  <circle cx="200" cy="160" r="50" fill="url(#accentGrad)" opacity="0.15" />
  <path d="M185 130 L230 160 L185 190 Z" fill="${secondary}" />
  <text x="200" y="295" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${safeTitle}</text>
  <text x="200" y="325" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#9ca3af">${safeSubtitle}</text>
</svg>`;
}
