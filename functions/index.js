// functions/index.js
// Cloudflare Pages Function
// Injects CMS data server-side: hero, settings, logos, gallery

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (request.method !== 'GET' ||
      (url.pathname !== '/' && url.pathname !== '/index.html')) {
    return next();
  }

  const response = await next();
  let html = await response.text();

  async function get(path) {
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

  // Extracts a YAML value by key — handles ALL formats Decap CMS produces:
  // 1. Plain single-line:   key: value
  // 2. Plain multi-line:    key: line one\n  continuation (2-space indent)
  // 3. Quoted single-line:  key: "value"
  // 4. Quoted multi-line:   key: "line one\n  continuation"
  // 5. Block scalar:        key: |\n  line one\n  line two
  function extractVal(text, key) {
    if (!text) return null;

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const km = lines[i].match(new RegExp(`^${key}:\\s*(.*)?$`));
      if (!km) continue;

      let raw = (km[1] || '').trim();

      // Block scalar: | or |-
      if (raw === '|' || raw === '|-' || raw === '>') {
        const block = [];
        i++;
        while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
          block.push(lines[i].replace(/^  /, '').trim());
          i++;
        }
        return block.filter(Boolean).join(' ');
      }

      // Quoted string (single or double)
      if (raw.startsWith('"') || raw.startsWith("'")) {
        const q = raw[0];
        let inner = raw.slice(1);
        // Check if closing quote is on same line
        if (inner.endsWith(q)) {
          return inner.slice(0, -1);
        }
        // Multi-line quoted — collect until closing quote
        i++;
        while (i < lines.length) {
          const chunk = lines[i].trim();
          if (chunk.endsWith(q)) {
            inner += ' ' + chunk.slice(0, -1);
            break;
          }
          inner += ' ' + chunk;
          i++;
        }
        return inner.trim();
      }

      // Plain value — may continue on next lines with 2-space indent
      let result = raw;
      while (i + 1 < lines.length && lines[i + 1].startsWith('  ')) {
        i++;
        result += ' ' + lines[i].trim();
      }
      return result.trim();
    }
    return null;
  }

  function list(text, key) {
    if (!text) return [];
    const idx = text.indexOf(key + ':');
    if (idx < 0) return [];
    const chunk = text.slice(idx);
    let blocks = chunk.split(/\n  - /);
    if (blocks.length <= 1) blocks = chunk.split(/\n- /);
    const items = [];
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      const item = {};
      ['name','title','subtitle','image','logo','url'].forEach(f => {
        const m = b.match(new RegExp(`(?:^|\\n)\\s*${f}:\\s*(.+)`));
        if (m) {
          const v = m[1].trim().replace(/^["']|["']$/g,'').trim();
          if (v && v !== '""' && v !== "''") item[f] = v;
        }
      });
      if (Object.keys(item).length) items.push(item);
    }
    return items;
  }

  // ── HERO ────────────────────────────────────────────
  const hero = await get('/_data/hero.yml');
  if (hero) {
    const h = extractVal(hero, 'headline');
    const s = extractVal(hero, 'subheading');
    const p = extractVal(hero, 'btn_primary');
    const b = extractVal(hero, 'btn_secondary');
    if (h) html = html.replace(/(<h1[^>]*id="heroHeadline"[^>]*>)([\s\S]*?)(<\/h1>)/, `$1${h}$3`);
    if (s) html = html.replace(/(<p[^>]*id="heroSubheading"[^>]*>)([\s\S]*?)(<\/p>)/, `$1${esc(s)}$3`);
    if (p) html = html.replace(/(<a[^>]*id="heroBtnPrimary"[^>]*>)([\s\S]*?)(<\/a>)/, `$1${esc(p)}$3`);
    if (b) html = html.replace(/(<a[^>]*id="heroBtnSecondary"[^>]*>)([\s\S]*?)(<\/a>)/, `$1${esc(b)}$3`);
  }

  // ── SETTINGS ────────────────────────────────────────
  const sett = await get('/_data/settings.yml');
  if (sett) {
    const email = extractVal(sett, 'email');
    const li    = extractVal(sett, 'linkedin');
    const tw    = extractVal(sett, 'twitter');
    const fb    = extractVal(sett, 'facebook');
    if (email) html = html.replace(/commsadvisoryinfo@gmail\.com/g, esc(email));
    if (li && li !== '""') html = html.replace(/(<a[^>]*id="footerLinkedIn"[^>]*)href="[^"]*"/, `$1href="${esc(li)}"`);
    if (tw && tw !== '""') html = html.replace(/(<a[^>]*id="footerTwitter"[^>]*)href="[^"]*"/, `$1href="${esc(tw)}"`);
    if (fb && fb !== '""') html = html.replace(/(<a[^>]*id="footerFacebook"[^>]*)href="[^"]*"/, `$1href="${esc(fb)}"`);
  }

  // ── LOGOS ───────────────────────────────────────────
  const logos = await get('/_data/logos.yml');
  if (logos) {
    const items = list(logos, 'partners');
    if (items.length) {
      const logoHtml = items.map(p => {
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
  const gal = await get('/_data/gallery.yml');
  if (gal) {
    const items = list(gal, 'items');
    if (items.length) {
      const g = ['g1','g2','g3','g4','g5','g6','g7','g8'];
      const renderItem = (item, i) => {
        const imgStyle = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.8;';
        const imgTag = item.image
          ? `<img src="${esc(item.image)}" alt="${esc(item.title||'')}" style="${imgStyle}">`
          : '';
        return `<div class="gallery-item ${g[i%g.length]}">${imgTag}<div class="gallery-caption"><div class="gallery-caption-title">${esc(item.title||'')}</div><div class="gallery-caption-sub">${esc(item.subtitle||'')}</div></div></div>`;
      };
      const rendered = items.map(renderItem).join('\n      ');
      const OPEN = '<div class="gallery-track" id="galleryTrack">';
      const trackIdx = html.indexOf(OPEN);
      if (trackIdx !== -1) {
        const contentStart = trackIdx + OPEN.length;
        const closeIdx = html.indexOf('</div>\n  </div>\n</section>', contentStart);
        if (closeIdx !== -1) {
          html = html.slice(0, contentStart) +
            '\n      ' + rendered + '\n      ' + rendered + '\n    ' +
            html.slice(closeIdx);
        }
      }
    }
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
