// functions/index.js
// Cloudflare Pages Function — intercepts every request to /
// Reads _data/hero.yml and _data/settings.yml, injects values into HTML server-side
// This runs on Cloudflare's edge — no browser fetch issues, no YAML parsing problems

export async function onRequest(context) {
  const { request, env, next } = context;

  // Only intercept GET requests for the homepage
  const url = new URL(request.url);
  if (request.method !== 'GET' || (url.pathname !== '/' && url.pathname !== '/index.html')) {
    return next();
  }

  // Fetch the original HTML page
  const response = await next();
  let html = await response.text();

  // Helper: fetch a file from the same origin
  async function fetchFile(path) {
    try {
      const r = await fetch(new URL(path, url.origin).toString());
      if (!r.ok) return null;
      return await r.text();
    } catch (e) {
      return null;
    }
  }

  // Robust YAML value extractor — handles all Decap CMS output formats
  function extractVal(text, key) {
    if (!text) return null;

    // Block scalar: key: |\n  line1\n  line2
    const blockRe = new RegExp(`^${key}:\\s*[|>]-?\\s*\\n((?:[ \\t]+.+\\n?)*)`, 'm');
    const blockM = text.match(blockRe);
    if (blockM) {
      return blockM[1]
        .split('\n')
        .map(l => l.replace(/^[ \t]{2}/, '').trim())
        .filter(Boolean)
        .join(' ')
        .trim();
    }

    // Find the key position
    const keyRe = new RegExp(`^${key}:\\s*`, 'm');
    const keyM = text.match(keyRe);
    if (!keyM) return null;

    const startPos = text.indexOf(keyM[0]) + keyM[0].length;
    const rest = text.slice(startPos);
    const firstChar = rest[0];

    // Double-quoted string
    if (firstChar === '"') {
      let i = 1;
      let result = '';
      while (i < rest.length) {
        if (rest[i] === '\\' && i + 1 < rest.length) {
          result += rest[i + 1];
          i += 2;
        } else if (rest[i] === '"') {
          break;
        } else {
          result += rest[i];
          i++;
        }
      }
      // Collapse whitespace/newlines from wrapped lines
      return result.replace(/\n\s*/g, ' ').trim();
    }

    // Single-quoted string
    if (firstChar === "'") {
      const endQ = rest.indexOf("'", 1);
      if (endQ > 0) return rest.slice(1, endQ).replace(/\n\s*/g, ' ').trim();
    }

    // Plain value — take everything to end of line
    const eol = rest.indexOf('\n');
    const val = eol > 0 ? rest.slice(0, eol) : rest;
    return val.trim();
  }

  // Load hero.yml
  const heroYml = await fetchFile('/_data/hero.yml');
  if (heroYml) {
    const headline   = extractVal(heroYml, 'headline');
    const subheading = extractVal(heroYml, 'subheading');
    const btnPrimary = extractVal(heroYml, 'btn_primary');
    const btnSecond  = extractVal(heroYml, 'btn_secondary');

    if (headline) {
      html = html.replace(
        /(<h1[^>]*id="heroHeadline"[^>]*>)([^<]*(?:<[^/][^>]*>[^<]*<\/[^>]+>[^<]*)*?)(<\/h1>)/,
        `$1${headline}$3`
      );
    }
    if (subheading) {
      html = html.replace(
        /(<p[^>]*id="heroSubheading"[^>]*>)([\s\S]*?)(<\/p>)/,
        `$1${escapeHtml(subheading)}$3`
      );
    }
    if (btnPrimary) {
      html = html.replace(
        /(<a[^>]*id="heroBtnPrimary"[^>]*>)([\s\S]*?)(<\/a>)/,
        `$1${escapeHtml(btnPrimary)}$3`
      );
    }
    if (btnSecond) {
      html = html.replace(
        /(<a[^>]*id="heroBtnSecondary"[^>]*>)([\s\S]*?)(<\/a>)/,
        `$1${escapeHtml(btnSecond)}$3`
      );
    }
  }

  // Load settings.yml
  const settingsYml = await fetchFile('/_data/settings.yml');
  if (settingsYml) {
    const email    = extractVal(settingsYml, 'email');
    const linkedin = extractVal(settingsYml, 'linkedin');
    const twitter  = extractVal(settingsYml, 'twitter');
    const facebook = extractVal(settingsYml, 'facebook');

    if (email) {
      html = html.replace(/commsadvisoryinfo@gmail\.com/g, escapeHtml(email));
      html = html.replace(
        /href="mailto:[^"]*"([^>]*id="footerEmail")/g,
        `href="mailto:${escapeHtml(email)}"$1`
      );
    }
    if (linkedin && linkedin !== '""') {
      html = html.replace(/(<a[^>]*id="footerLinkedIn"[^>]*)href="[^"]*"/, `$1href="${escapeHtml(linkedin)}"`);
    }
    if (twitter && twitter !== '""') {
      html = html.replace(/(<a[^>]*id="footerTwitter"[^>]*)href="[^"]*"/, `$1href="${escapeHtml(twitter)}"`);
    }
    if (facebook && facebook !== '""') {
      html = html.replace(/(<a[^>]*id="footerFacebook"[^>]*)href="[^"]*"/, `$1href="${escapeHtml(facebook)}"`);
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache', // Always fresh so CMS changes appear immediately
    },
  });
}
