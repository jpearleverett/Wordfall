// ─── Deep Link Parser ──────────────────────────────────────────────────────
// Parses incoming deep link URLs into structured data for the app to handle.
// Supports wordfall:// custom scheme links and https:// universal links.

export interface DeepLinkData {
  type: 'referral' | 'challenge' | 'daily' | 'unknown';
  referralCode?: string;
  challengeId?: string;
  levelSeed?: number;
}

/**
 * Parse a deep link URL into structured data.
 *
 * Supported URL patterns:
 *   wordfall://referral/{code}     -> { type: 'referral', referralCode: code }
 *   wordfall://challenge/{id}      -> { type: 'challenge', challengeId: id }
 *   wordfall://daily               -> { type: 'daily' }
 *   wordfall://open?ref={code}     -> { type: 'referral', referralCode: code }
 *   wordfall://open?challenge={id} -> { type: 'challenge', challengeId: id }
 *
 * Returns { type: 'unknown' } for unrecognized URLs.
 */
export function parseDeepLink(url: string): DeepLinkData {
  try {
    // Normalize: strip trailing slashes and whitespace
    const cleaned = url.trim().replace(/\/+$/, '');

    // Try to extract scheme and path
    // Handle both wordfall://path and https://wordfall.app/path
    let path = '';
    let queryString = '';

    const queryIndex = cleaned.indexOf('?');
    if (queryIndex !== -1) {
      queryString = cleaned.substring(queryIndex + 1);
      const beforeQuery = cleaned.substring(0, queryIndex);
      path = extractPath(beforeQuery);
    } else {
      path = extractPath(cleaned);
    }

    // Normalize path: lowercase, strip leading/trailing slashes
    path = path.toLowerCase().replace(/^\/+|\/+$/g, '');

    // Route-based patterns
    if (path.startsWith('referral/')) {
      const code = path.substring('referral/'.length).trim();
      if (code.length > 0) {
        return { type: 'referral', referralCode: code.toUpperCase() };
      }
    }

    if (path.startsWith('challenge/')) {
      const id = path.substring('challenge/'.length).trim();
      if (id.length > 0) {
        return { type: 'challenge', challengeId: id };
      }
    }

    if (path === 'daily') {
      return { type: 'daily' };
    }

    // Query parameter fallback for wordfall://open?ref=CODE or ?challenge=ID
    if (queryString) {
      const params = parseQueryString(queryString);

      if (params.ref) {
        return { type: 'referral', referralCode: params.ref.toUpperCase() };
      }

      if (params.challenge) {
        return { type: 'challenge', challengeId: params.challenge };
      }

      if (params.seed) {
        const seed = parseInt(params.seed, 10);
        if (!isNaN(seed)) {
          return { type: 'daily', levelSeed: seed };
        }
      }
    }

    return { type: 'unknown' };
  } catch {
    // Never crash on a malformed URL
    return { type: 'unknown' };
  }
}

/**
 * Build a deep link URL for a referral code.
 */
export function buildReferralLink(referralCode: string): string {
  return `wordfall://referral/${referralCode}`;
}

/**
 * Build a deep link URL for a challenge.
 */
export function buildChallengeLink(challengeId: string): string {
  return `wordfall://challenge/${challengeId}`;
}

/**
 * Build a deep link URL for the daily puzzle.
 */
export function buildDailyLink(): string {
  return 'wordfall://daily';
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractPath(url: string): string {
  // Remove scheme (wordfall://, https://, etc.)
  const schemeMatch = url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//);
  if (schemeMatch) {
    let afterScheme = url.substring(schemeMatch[0].length);
    // For https:// URLs, also strip the host portion (e.g., wordfall.app)
    if (schemeMatch[0].startsWith('https://') || schemeMatch[0].startsWith('http://')) {
      const slashIndex = afterScheme.indexOf('/');
      if (slashIndex !== -1) {
        afterScheme = afterScheme.substring(slashIndex);
      } else {
        afterScheme = '';
      }
    }
    return afterScheme;
  }
  return url;
}

function parseQueryString(qs: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = qs.split('&');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex !== -1) {
      const key = decodeURIComponent(pair.substring(0, eqIndex));
      const value = decodeURIComponent(pair.substring(eqIndex + 1));
      params[key] = value;
    }
  }
  return params;
}
