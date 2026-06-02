// functions/index.js
// Cloudflare Pages Function — injects CMS data server-side
// hero.yml, settings.yml, logos.yml, gallery.yml

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  if (request.method !== 'GET' || (url.pathname !== '/' && url.pathname !== '/index.html')) {
    return next();
  }

  const response = await next();
  let html = await response.text();

  async function fetchFile(path) {
    try {
      const r = await fetch(new URL(path, url.origin).toString());
      return r.ok ? await r.text() : null;
    } catch(e) { return null; }
  }

  function esc(s) {
    return (s||'').toString()
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function extractVal(text, key) {
    if (!text) return null;
    const bm = text.match(new RegExp(`^${key}:\\s*[|>]-?\\s*$`, 'm'));
    if (bm) {
      const after = text.slice(text.indexOf(bm[0]) + bm[0].length + 1);
      return after.split('\n')
        .filter(l => l.startsWith('  ') || l.trim() === '')
        .map(l => l.replace(/^  /, '').trim())
        .filter(Boolean).join(' ');
    }
    const km = text.match(new RegExp(`^${key}:\\s*`, 'm'));
    if (!km) return null;
    const rest = text.slice(text.indexOf(km[0]) + km[0].length);
    const q = rest[0];
    if (q === '"') {
      let i = 1, r = '';
      while (i < rest.length) {
        if (rest[i] === '\\' && i+1 < rest.length) { r += rest[i+1]; i += 2; }
        else if (rest[i] === '"') break;
        else { r += rest[i]; i++; }
      }
      return r.replace(/\n\s*/g, ' ').trim();
    }
    if (q === "'") {
      const e = rest.indexOf("'", 1);
      return e > 0 ? rest.slice(1, e).replace(/\n\s*/g, ' ').trim() : null;
    }
    const eol = rest.indexOf('\n');
    return (eol > 0 ? rest.slice(0, eol) : rest).trim();
  }

  // Parse YAML list — handles Decap CMS indented format "  - "
  function parseList(text, listKey) {
    if (!text) return [];
    const idx = text.indexOf(listKey + ':');
    if (idx < 0) return [];
    const listText = text.slice(idx);

    // Decap CMS uses 2-space indented lists: "\n  - "
    let blocks = listText.split(/\n  - /);
    // Fallback: non-indented
    if (blocks.length <= 1) blocks = listText.split(/\n- /);

    const items = [];
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      const item = {};
      ['name','title','subtitle','image','logo','url'].forEach(field => {
        const m = b.match(new RegExp(`(?:^|\\n)\\s*${field}:\\s*(.+)`));
        if (m) {
          const v = m[1].trim().replace(/^["']|["']$/g, '').trim();
          if (v && v !== '""' && v !== "''") item[field] = v;
        }
      });
      if (Object.keys(item).length > 0) items.push(item);
    }
    return items;
  }

  // ── HERO ────────────────────────────────────────────
  const heroYml = await fetchFile('/_data/hero.yml');
  if (heroYml) {
    const h = extractVal(heroYml, 'headline');
    const s = extractVal(heroYml, 'subheading');
    const p = extractVal(heroYml, 'btn_primary');
    const b = extractVal(heroYml, 'btn_secondary');
    if (h) html = html.replace(/(<h1[^>]*id="heroHeadline"[^>]*>)([\s\S]*?)(<\/h1>)/, `$1${h}$3`);
    if (s) html = html.replace(/(<p[^>]*id="heroSubheading"[^>]*>)([\s\S]*?)(<\/p>)/, `$1${esc(s)}$3`);
    if (p) html = html.replace(/(<a[^>]*id="heroBtnPrimary"[^>]*>)([\s\S]*?)(<\/a>)/, `$1${esc(p)}$3`);
    if (b) html = html.replace(/(<a[^>]*id="heroBtnSecondary"[^>]*>)([\s\S]*?)(<\/a>)/, `$1${esc(b)}$3`);
  }

  // ── SETTINGS ────────────────────────────────────────
  const settYml = await fetchFile('/_data/settings.yml');
  if (settYml) {
    const email = extractVal(settYml, 'email');
    const li    = extractVal(settYml, 'linkedin');
    const tw    = extractVal(settYml, 'twitter');
    const fb    = extractVal(settYml, 'facebook');
    if (email) html = html.replace(/commsadvisoryinfo@gmail\.com/g, esc(email));
    if (li && li !== '""') html = html.replace(/(<a[^>]*id="footerLinkedIn"[^>]*)href="[^"]*"/, `$1href="${esc(li)}"`);
    if (tw && tw !== '""') html = html.replace(/(<a[^>]*id="footerTwitter"[^>]*)href="[^"]*"/, `$1href="${esc(tw)}"`);
    if (fb && fb !== '""') html = html.replace(/(<a[^>]*id="footerFacebook"[^>]*)href="[^"]*"/, `$1href="${esc(fb)}"`);
  }

  // ── LOGOS ───────────────────────────────────────────
  const logosYml = await fetchFile('/_data/logos.yml');
  if (logosYml) {
    const logos = parseList(logosYml, 'partners');
    if (logos.length) {
      const logoHtml = logos.map(p => {
        const inner = p.logo
          ? `<img src="${esc(p.logo)}" alt="${esc(p.name||'')}" style="max-width:100%;max-height:48px;object-fit:contain;filter:grayscale(80%);opacity:0.7;transition:filter .2s,opacity .2s;" onmouseover="this.style.filter='grayscale(0%)';this.style.opacity='1'" onmouseout="this.style.filter='grayscale(80%)';this.style.opacity='0.7'">`
          : `<div class="logo-item-text">${esc(p.name||'')}</div>`;
        return p.url
          ? `<a href="${esc(p.url)}" target="_blank" rel="noopener" class="logo-item" style="text-decoration:none;">${inner}</a>`
          : `<div class="logo-item">${inner}</div>`;
      }).join('\n        ');
      html = html.replace(
        /(<div class="logo-wall" id="logoWall">)([\s\S]*?)(<\/div>)/,
        `$1\n        ${logoHtml}\n      $3`
      );
    }
  }

  // ── GALLERY ─────────────────────────────────────────
  const galYml = await fetchFile('/_data/gallery.yml');
  if (galYml) {
    const items = parseList(galYml, 'items');
    if (items.length) {
      const g = ['g1','g2','g3','g4','g5','g6','g7','g8'];
      const renderItem = (item, i) => {
        const imgTag = item.image
          ? `<img src="${esc(item.image)}" alt="${esc(item.title||'')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.8;">`
          : '';
        return `<div class="gallery-item ${g[i % g.length]}">${imgTag}<div class="gallery-caption"><div class="gallery-caption-title">${esc(item.title||'')}</div><div class="gallery-caption-sub">${esc(item.subtitle||'')}</div></div></div>`;
      };
      const rendered = items.map(renderItem).join('\n      ');
      // Replace ENTIRE gallery-track content (including fallback static items)
      html = html.replace(
        /(<div class="gallery-track" id="galleryTrack">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/,
        `$1\n      ${rendered}\n      <!-- loop -->\n      ${rendered}\n    </div>\n  </div>\n</section>`
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
