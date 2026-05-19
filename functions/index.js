// functions/index.js
// Cloudflare Pages Function — injects CMS data server-side
// Handles: hero.yml, settings.yml, logos.yml, gallery.yml

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

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

  function esc(str) {
    return (str || '').toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Extract a single scalar value from YAML text
  function extractVal(text, key) {
    if (!text) return null;
    // Block scalar
    const blockRe = new RegExp(`^${key}:\\s*[|>]-?\\s*$`, 'm');
    const blockM = text.match(blockRe);
    if (blockM) {
      const after = text.slice(text.indexOf(blockM[0]) + blockM[0].length + 1);
      const lines = after.split('\n');
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
        if (rest[i] === '\\' && i + 1 < rest.length) { result += rest[i + 1]; i += 2; }
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

  // Parse a YAML list of objects (partners or gallery items)
  function parseYamlList(text, listKey) {
    if (!text) return [];
    const items = [];
    const listIdx = text.indexOf(`${listKey}:`);
    if (listIdx < 0) return [];
    const listText = text.slice(listIdx);
    const blocks = listText.split(/\n- /);
    for (let i = 1; i < blocks.length; i++) {
      const block = '  ' + blocks[i];
      const item = {};
      const fields = ['name', 'title', 'subtitle', 'image', 'logo', 'url'];
      fields.forEach(field => {
        const m = block.match(new RegExp(`\\n?\\s*${field}:\\s*(.+)`));
        if (m) {
          const val = m[1].trim().replace(/^["']|["']$/g, '').trim();
          if (val && val !== '""' && val !== "''") item[field] = val;
        }
      });
      if (Object.keys(item).length > 0) items.push(item);
    }
    return items;
  }

  // Build gallery HTML — items duplicated for seamless loop
  function buildGalleryItems(items) {
    if (!items.length) return null;
    const gradients = ['g1','g2','g3','g4','g5','g6','g7','g8'];
    const renderItem = (item, i) => {
      const cls = gradients[i % gradients.length];
      const imgHtml = item.image
        ? `<img src="${esc(item.image)}" alt="${esc(item.title || '')}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.75;">`
        : '';
      return `<div class="gallery-item ${cls}">
        ${imgHtml}
        <div class="gallery-caption">
          <div class="gallery-caption-title">${esc(item.title || '')}</div>
          <div class="gallery-caption-sub">${esc(item.subtitle || '')}</div>
        </div>
      </div>`;
    };
    // Render items + duplicate for seamless CSS scroll loop
    const rendered = items.map((item, i) => renderItem(item, i)).join('\n      ');
    const duplicate = items.map((item, i) => renderItem(item, i)).join('\n      ');
    return rendered + '\n      <!-- Duplicate for seamless loop -->\n      ' + duplicate;
  }

  // Build logo wall HTML
  function buildLogoWall(logos) {
    if (!logos.length) return null;
    return logos.map(p => {
      const inner = p.logo
        ? `<img src="${esc(p.logo)}" alt="${esc(p.name || '')}" style="max-width:100%;max-height:48px;object-fit:contain;filter:grayscale(80%);opacity:0.7;transition:filter 0.2s,opacity 0.2s;" onmouseover="this.style.filter='grayscale(0%)';this.style.opacity='1'" onmouseout="this.style.filter='grayscale(80%)';this.style.opacity='0.7'">`
        : `<div class="logo-item-text">${esc(p.name || '')}</div>`;
      return p.url
        ? `<a href="${esc(p.url)}" target="_blank" rel="noopener" class="logo-item" style="text-decoration:none;">${inner}</a>`
        : `<div class="logo-item">${inner}</div>`;
    }).join('\n        ');
  }

  // ── INJECT hero.yml ──────────────────────────────────────────
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

  // ── INJECT settings.yml ──────────────────────────────────────
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

  // ── INJECT logos.yml ─────────────────────────────────────────
  const logosYml = await fetchFile('/_data/logos.yml');
  if (logosYml) {
    const logos = parseYamlList(logosYml, 'partners');
    const logoHtml = buildLogoWall(logos);
    if (logoHtml) {
      html = html.replace(
        /(<div class="logo-wall" id="logoWall">)([\s\S]*?)(<\/div>)/,
        `$1\n        ${logoHtml}\n      $3`
      );
    }
  }

  // ── INJECT gallery.yml ───────────────────────────────────────
  const galleryYml = await fetchFile('/_data/gallery.yml');
  if (galleryYml) {
    const items = parseYamlList(galleryYml, 'items');
    const galleryHtml = buildGalleryItems(items);
    if (galleryHtml) {
      html = html.replace(
        /(<div class="gallery-track" id="galleryTrack">)([\s\S]*?)(<\/div>)/,
        `$1\n      ${galleryHtml}\n    $3`
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
