// functions/index.js
// Cloudflare Pages Function — injects CMS data server-side into homepage HTML
// Handles: hero.yml (subheading etc), settings.yml (email/social), logos.yml (partner logos)

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Only handle homepage GET requests
  if (request.method !== 'GET' ||
      (url.pathname !== '/' && url.pathname !== '/index.html')) {
    return next();
  }

  const response = await next();
  let html = await response.text();

  async function fetchFile(path) {
    try {
      const r = await fetch(new URL(path, url.origin).toString());
      if (!r.ok) return null;
      return await r.text();
    } catch (e) { return null; }
  }

  function extractVal(text, key) {
    if (!text) return null;
    const blockRe = new RegExp(`^${key}:\\s*[|>]-?\\s*$`, 'm');
    const blockM = text.match(blockRe);
    if (blockM) {
      const afterIdx = text.indexOf(blockM[0]) + blockM[0].length + 1;
      const lines = text.slice(afterIdx).split('\n');
      const block = [];
      for (const l of lines) {
        if (!l.startsWith('  ') && l.trim() !== '') break;
        block.push(l.replace(/^  /, '').trim());
      }
      return block.filter(Boolean).join(' ').trim();
    }
    const keyRe = new RegExp(`^${key}:\\s*`, 'm');
    const keyM = text.match(keyRe);
    if (!keyM) return null;
    const startPos = text.indexOf(keyM[0]) + keyM[0].length;
    const rest = text.slice(startPos);
    const q = rest[0];
    if (q === '"') {
      let i = 1, result = '';
      while (i < rest.length) {
        if (rest[i] === '\\' && i + 1 < rest.length) { result += rest[i+1]; i += 2; }
        else if (rest[i] === '"') break;
        else { result += rest[i]; i++; }
      }
      return result.replace(/\n\s*/g, ' ').trim();
    }
    if (q === "'") {
      const end = rest.indexOf("'", 1);
      if (end > 0) return rest.slice(1, end).replace(/\n\s*/g, ' ').trim();
    }
    const eol = rest.indexOf('\n');
    return (eol > 0 ? rest.slice(0, eol) : rest).trim();
  }

  function parseLogosList(text) {
    if (!text) return [];
    const logos = [];
    const partnersIdx = text.indexOf('partners:');
    if (partnersIdx < 0) return [];
    const listText = text.slice(partnersIdx);
    const items = listText.split(/\n- /);
    for (let i = 1; i < items.length; i++) {
      const block = items[i];
      const logo = {};
      const nameM = block.match(/(?:^|\n)\s*name:\s*(.+)/);
      if (nameM) logo.name = nameM[1].trim().replace(/^["']|["']$/g, '');
      const logoM = block.match(/(?:^|\n)\s*logo:\s*(.+)/);
      if (logoM) {
        const val = logoM[1].trim().replace(/^["']|["']$/g, '').trim();
        if (val && val !== '""' && val !== "''") logo.logo = val;
      }
      const urlM = block.match(/(?:^|\n)\s*url:\s*(.+)/);
      if (urlM) {
        const val = urlM[1].trim().replace(/^["']|["']$/g, '').trim();
        if (val && val !== '""' && val !== "''") logo.url = val;
      }
      if (logo.name) logos.push(logo);
    }
    return logos;
  }

  function buildLogoWall(logos) {
    if (!logos.length) return null;
    return logos.map(p => {
      const inner = p.logo
        ? `<img src="${p.logo}" alt="${esc(p.name)}" style="max-width:100%;max-height:48px;object-fit:contain;filter:grayscale(80%);opacity:0.7;transition:filter 0.2s,opacity 0.2s;" onmouseover="this.style.filter='grayscale(0%)';this.style.opacity='1'" onmouseout="this.style.filter='grayscale(80%)';this.style.opacity='0.7'">`
        : `<div class="logo-item-text">${esc(p.name)}</div>`;
      return p.url
        ? `<a href="${esc(p.url)}" target="_blank" rel="noopener" class="logo-item" style="text-decoration:none;">${inner}</a>`
        : `<div class="logo-item">${inner}</div>`;
    }).join('\n        ');
  }

  function esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Inject hero.yml
  const heroYml = await fetchFile('/_data/hero.yml');
  if (heroYml) {
    const headline   = extractVal(heroYml, 'headline');
    const subheading = extractVal(heroYml, 'subheading');
    const btnPrimary = extractVal(heroYml, 'btn_primary');
    const btnSecond  = extractVal(heroYml, 'btn_secondary');
    if (headline)   html = html.replace(/(<h1[^>]*id="heroHeadline"[^>]*>)([\s\S]*?)(<\/h1>)/, `$1${headline}$3`);
    if (subheading) html = html.replace(/(<p[^>]*id="heroSubheading"[^>]*>)([\s\S]*?)(<\/p>)/, `$1${esc(subheading)}$3`);
    if (btnPrimary) html = html.replace(/(<a[^>]*id="heroBtnPrimary"[^>]*>)([\s\S]*?)(<\/a>)/, `$1${esc(btnPrimary)}$3`);
    if (btnSecond)  html = html.replace(/(<a[^>]*id="heroBtnSecondary"[^>]*>)([\s\S]*?)(<\/a>)/, `$1${esc(btnSecond)}$3`);
  }

  // Inject settings.yml
  const settingsYml = await fetchFile('/_data/settings.yml');
  if (settingsYml) {
    const email    = extractVal(settingsYml, 'email');
    const linkedin = extractVal(settingsYml, 'linkedin');
    const twitter  = extractVal(settingsYml, 'twitter');
    const facebook = extractVal(settingsYml, 'facebook');
    if (email)    html = html.replace(/commsadvisoryinfo@gmail\.com/g, esc(email));
    if (linkedin && linkedin !== '""') html = html.replace(/(<a[^>]*id="footerLinkedIn"[^>]*)href="[^"]*"/, `$1href="${esc(linkedin)}"`);
    if (twitter  && twitter  !== '""') html = html.replace(/(<a[^>]*id="footerTwitter"[^>]*)href="[^"]*"/, `$1href="${esc(twitter)}"`);
    if (facebook && facebook !== '""') html = html.replace(/(<a[^>]*id="footerFacebook"[^>]*)href="[^"]*"/, `$1href="${esc(facebook)}"`);
  }

  // Inject logos.yml
  const logosYml = await fetchFile('/_data/logos.yml');
  if (logosYml) {
    const logos = parseLogosList(logosYml);
    const logoHtml = buildLogoWall(logos);
    if (logoHtml) {
      html = html.replace(
        /(<div class="logo-wall" id="logoWall">)([\s\S]*?)(<\/div>)/,
        `$1\n        ${logoHtml}\n      $3`
      );
    }
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
