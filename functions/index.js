// functions/index.js
// Cloudflare Pages Function
// Injects CMS data into homepage: hero, settings, logos, gallery

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

  function val(text, key) {
    if (!text) return null;
    // Block scalar
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

  function list(text, key) {
    if (!text) return [];
    const idx = text.indexOf(key + ':');
    if (idx < 0) return [];
    const chunk = text.slice(idx);
    // Decap CMS uses 2-space indented lists
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
    const h=val(hero,'headline'), s=val(hero,'subheading'),
          p=val(hero,'btn_primary'), b=val(hero,'btn_secondary');
    if(h) html=html.replace(/(<h1[^>]*id="heroHeadline"[^>]*>)([\s\S]*?)(<\/h1>)/,`$1${h}$3`);
    if(s) html=html.replace(/(<p[^>]*id="heroSubheading"[^>]*>)([\s\S]*?)(<\/p>)/,`$1${esc(s)}$3`);
    if(p) html=html.replace(/(<a[^>]*id="heroBtnPrimary"[^>]*>)([\s\S]*?)(<\/a>)/,`$1${esc(p)}$3`);
    if(b) html=html.replace(/(<a[^>]*id="heroBtnSecondary"[^>]*>)([\s\S]*?)(<\/a>)/,`$1${esc(b)}$3`);
  }

  // ── SETTINGS ────────────────────────────────────────
  const sett = await get('/_data/settings.yml');
  if (sett) {
    const email=val(sett,'email'), li=val(sett,'linkedin'),
          tw=val(sett,'twitter'), fb=val(sett,'facebook');
    if(email) html=html.replace(/commsadvisoryinfo@gmail\.com/g,esc(email));
    if(li&&li!=='""') html=html.replace(/(<a[^>]*id="footerLinkedIn"[^>]*)href="[^"]*"/,`$1href="${esc(li)}"`);
    if(tw&&tw!=='""') html=html.replace(/(<a[^>]*id="footerTwitter"[^>]*)href="[^"]*"/,`$1href="${esc(tw)}"`);
    if(fb&&fb!=='""') html=html.replace(/(<a[^>]*id="footerFacebook"[^>]*)href="[^"]*"/,`$1href="${esc(fb)}"`);
  }

  // ── LOGOS ───────────────────────────────────────────
  const logos = await get('/_data/logos.yml');
  if (logos) {
    const items = list(logos,'partners');
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
  // Replaces gallery items one by one matching by index position
  // This avoids any HTML structure issues
  const gal = await get('/_data/gallery.yml');
  if (gal) {
    const items = list(gal,'items');
    if (items.length) {
      const g = ['g1','g2','g3','g4','g5','g6','g7','g8'];

      // Build new gallery track content
      const renderItem = (item, i) => {
        const imgStyle = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.8;';
        const imgTag = item.image
          ? `<img src="${esc(item.image)}" alt="${esc(item.title||'')}" style="${imgStyle}">`
          : '';
        return `<div class="gallery-item ${g[i%g.length]}">${imgTag}<div class="gallery-caption"><div class="gallery-caption-title">${esc(item.title||'')}</div><div class="gallery-caption-sub">${esc(item.subtitle||'')}</div></div></div>`;
      };

      const single = items.map(renderItem).join('\n      ');
      const doubled = single + '\n      ' + single;

      // Replace the entire content of the gallery track
      const TRACK_OPEN = '<div class="gallery-track" id="galleryTrack">';
      const TRACK_CLOSE = '</div>\n  </div>\n</section>';

      const trackIdx = html.indexOf(TRACK_OPEN);
      if (trackIdx !== -1) {
        // Find the wrap end - look for </div>\n  </div>\n</section> after the track
        const searchFrom = trackIdx + TRACK_OPEN.length;
        // Find closing pattern: </div> that closes gallery-track-wrap then </section>
        const wrapCloseIdx = html.indexOf('</div>\n  </div>\n</section>', searchFrom);
        if (wrapCloseIdx !== -1) {
          html = html.slice(0, trackIdx + TRACK_OPEN.length) +
            '\n      ' + doubled + '\n    ' +
            html.slice(wrapCloseIdx);
        } else {
          // Fallback: find </div>\n</section>
          const altClose = html.indexOf('</div>\n</section>', searchFrom);
          if (altClose !== -1) {
            html = html.slice(0, trackIdx + TRACK_OPEN.length) +
              '\n      ' + doubled + '\n    ' +
              html.slice(altClose);
          }
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
