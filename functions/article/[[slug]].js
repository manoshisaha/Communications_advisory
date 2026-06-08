// functions/post/[[slug]].js
// Serves /post/slug-name URLs for Google indexing
// Regular visitors use post.html?slug= which still works fine

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // parts = ['post', 'slug-name']
  const slug = parts[1];

  if (!slug) {
    return Response.redirect(new URL('/blog.html', url.origin).toString(), 302);
  }

  async function get(path) {
    try {
      const r = await fetch(new URL(path, url.origin).toString());
      return r.ok ? await r.text() : null;
    } catch(e) { return null; }
  }

  const mdText = await get(`/_posts/${slug}.md`);
  if (!mdText) {
    return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Not Found</title><meta name="robots" content="noindex"></head><body style="font-family:sans-serif;text-align:center;padding:4rem"><h2 style="color:#004874">Article not found</h2><a href="/blog.html" style="color:#c51a1b;font-weight:600">← All articles</a></body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  }

  function fm(t) {
    const m = t.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return { body: t };
    const f = {};
    m[1].split('\n').forEach(l => {
      const lm = l.match(/^([\w_]+):\s*(.*)$/);
      if (lm) f[lm[1].trim()] = lm[2].trim().replace(/^["']|["']$/g, '');
    });
    f.body = t.slice(m[0].length).trim();
    return f;
  }

  function md(s) {
    if (!s) return '';
    let h = s;
    h = h.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) =>
      `<pre><code>${c.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`);
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    h = h.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    h = h.replace(/^### (.+)$/gm,  '<h3>$1</h3>');
    h = h.replace(/^## (.+)$/gm,   '<h2>$1</h2>');
    h = h.replace(/^# (.+)$/gm,    '<h1>$1</h1>');
    h = h.replace(/^---+$/gm, '<hr>');
    h = h.replace(/!\[([^\]]*)\]\(([^)"]+)\)/g,
      '<figure><img src="$2" alt="$1" style="width:100%;border-radius:8px"><figcaption style="font-size:.8rem;color:#888;text-align:center;margin-top:.5rem;font-style:italic">$1</figcaption></figure>');
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*([^*\n]+)\*/g,  '<em>$1</em>');
    h = h.replace(/__(.+?)__/g, '<strong>$1</strong>');
    h = h.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    h = h.replace(/((?:^[*\-+] .+\n?)+)/gm, m =>
      '<ul>' + m.trim().split('\n').map(l => `<li>${l.replace(/^[*\-+] /,'')}</li>`).join('') + '</ul>');
    h = h.replace(/((?:^\d+\. .+\n?)+)/gm, m =>
      '<ol>' + m.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /,'')}</li>`).join('') + '</ol>');
    return h.split(/\n\n+/).map(b => {
      b = b.trim();
      if (!b) return '';
      if (/^<(h[1-6]|ul|ol|blockquote|pre|figure|hr)/.test(b)) return b;
      return '<p>' + b.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
  }

  function esc(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function dt(d) {
    try { return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); }
    catch(e) { return d||''; }
  }

  const post = fm(mdText);
  const title = post.title || 'Article';
  const desc = post.excerpt || post.body.slice(0,160).replace(/\n/g,' ');
  const canonical = `https://communicationsadvisory.com/article/${slug}`;
  const hasImg = post.image && post.image !== '""' && post.image !== "''";
  const ogImage = hasImg ? post.image : 'https://communicationsadvisory.com/assets/og-image.jpg';

  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} – Communication Advisory</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/CA_logo.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"${esc(title)}","description":"${esc(desc)}","author":{"@type":"Organization","name":"Communication Advisory"},"publisher":{"@type":"Organization","name":"Communication Advisory","url":"https://communicationsadvisory.com"},"url":"${canonical}","datePublished":"${post.date||''}"}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<style>
:root{--red:#c51a1b;--red-dark:#a01415;--blue:#004874;--blue-dark:#003459;--cream:#faf8f5;--warm-gray:#f2efe9;--text-dark:#1a1a1a;--text-mid:#4a4a4a;--text-light:#888;--border:rgba(0,0,0,0.09)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:'Lato',sans-serif;background:var(--cream);color:var(--text-dark)}
.topbar{background:#fff;border-bottom:1px solid var(--border);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between}
.logo{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:700;color:var(--blue);text-decoration:none}
.logo span{color:var(--red)}
.back{font-size:.875rem;font-weight:600;color:var(--text-mid);text-decoration:none;padding:.5rem 1rem;border:1px solid var(--border);border-radius:100px;transition:all .2s}
.back:hover{border-color:var(--red);color:var(--red)}
.banner{background:var(--blue-dark);padding:3rem 2rem 3.5rem}
.bi{max-width:760px;margin:0 auto}
.cat{display:inline-block;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--red);background:rgba(197,26,27,.15);border:1px solid rgba(197,26,27,.3);padding:.3rem .875rem;border-radius:100px;margin-bottom:1.5rem}
.ttl{font-family:'Cormorant Garamond',serif;font-size:clamp(1.75rem,4vw,2.75rem);font-weight:700;line-height:1.25;color:#fff;margin-bottom:1.25rem}
.meta{font-size:.8125rem;color:rgba(255,255,255,.5)}
.hi{max-width:760px;margin:0 auto;padding:0 2rem}
.hi img{width:100%;display:block;border-radius:0 0 10px 10px;max-height:400px;object-fit:cover}
.bw{max-width:760px;margin:0 auto;padding:3rem 2rem 6rem}
.body{font-size:1.0625rem;line-height:1.9;color:var(--text-mid);text-align:justify;text-justify:inter-word}
.body p{margin-bottom:1.5rem}
.body h2{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:700;color:var(--blue);margin:2.5rem 0 1rem;padding-bottom:.625rem;border-bottom:2px solid var(--red)}
.body h3{font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:600;color:var(--blue);margin:2rem 0 .75rem}
.body h4{font-size:1rem;font-weight:700;color:var(--text-dark);margin:1.5rem 0 .5rem}
.body a{color:var(--red);text-decoration:underline;font-weight:500}
.body a:hover{color:var(--red-dark)}
.body strong{font-weight:700;color:var(--text-dark)}
.body em{font-style:italic}
.body ul,.body ol{margin:1rem 0 1.5rem 1.75rem;line-height:1.9}
.body li{margin-bottom:.375rem}
.body blockquote{border-left:4px solid var(--red);padding:.5rem 0 .5rem 1.5rem;margin:2rem 0;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-style:italic;color:var(--blue)}
.body pre{background:var(--warm-gray);border-radius:6px;padding:1.25rem;overflow-x:auto;margin:1.5rem 0;font-size:.875rem}
.body code{background:var(--warm-gray);padding:2px 6px;border-radius:3px;font-size:.875em}
.body hr{border:none;border-top:1px solid var(--border);margin:2.5rem 0}
.share{margin:2.5rem 0;padding:2rem;background:#fff;border-radius:12px;border:1px solid var(--border)}
.share-label{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:1rem}
.share-btns{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center}
.sb{display:inline-flex;align-items:center;gap:8px;padding:.6rem 1.25rem;border-radius:100px;font-size:.8125rem;font-weight:700;text-decoration:none;cursor:pointer;transition:all .2s;font-family:'Lato',sans-serif;border:none}
.sb.li{background:#0077b5;color:#fff}.sb.li:hover{background:#005f8e}
.sb.fb{background:#1877f2;color:#fff}.sb.fb:hover{background:#1464d3}
.sb.tw{background:#000;color:#fff}.sb.tw:hover{background:#333}
.sb.wa{background:#25d366;color:#fff}.sb.wa:hover{background:#1da851}
.sb.cp{background:#f2efe9;color:#1a1a1a;border:1px solid rgba(0,0,0,.09);cursor:pointer}.sb.cp:hover{background:#004874;color:#fff}
.sb svg{width:16px;height:16px;flex-shrink:0}
.cta{background:var(--blue);color:#fff;border-radius:12px;padding:2.5rem;margin-top:3rem;text-align:center}
.cta h3{font-family:'Cormorant Garamond',serif;font-size:1.5rem;margin-bottom:.75rem}
.cta p{font-size:.9rem;color:rgba(255,255,255,.7);margin-bottom:1.5rem;line-height:1.7}
.cta a{display:inline-block;background:var(--red);color:#fff;text-decoration:none;padding:.875rem 2.5rem;border-radius:4px;font-weight:700}
.cta a:hover{background:var(--red-dark)}
footer{background:#0d1e2e;color:rgba(255,255,255,.5);padding:1.5rem 2rem;text-align:center;font-size:.8rem}
footer a{color:rgba(255,255,255,.35);text-decoration:none}
</style>
</head>
<body>
<div class="topbar">
  <a href="/" class="logo"><span>C</span>ommunication <span>A</span>dvisory</a>
  <a href="/blog.html" class="back">← All Articles</a>
</div>
<div class="banner"><div class="bi">
  <div class="cat">${esc(post.category||'Insight')}</div>
  <h1 class="ttl">${esc(title)}</h1>
  <div class="meta">${esc(dt(post.date))}${post.read_time?' · '+esc(post.read_time):''}</div>
</div></div>
${hasImg?`<div class="hi"><img src="${esc(post.image)}" alt="${esc(title)}"></div>`:''}
<div class="bw">
  <div class="body">${md(post.body)}</div>
  <div class="share">
    <div class="share-label">Share this article</div>
    <div class="share-btns">
      <a class="sb li" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        LinkedIn
      </a>
      <a class="sb fb" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Facebook
      </a>
      <a class="sb tw" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(title)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        X / Twitter
      </a>
      <a class="sb wa" href="https://wa.me/?text=${encodeURIComponent(title + ' ' + canonical)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>
      <button class="sb cp" onclick="(function(){var t=document.createElement('textarea');t.value='${canonical}';document.body.appendChild(t);t.select();try{navigator.clipboard.writeText('${canonical}').then(function(){var b=document.querySelector('.sb.cp span');b.textContent='Copied!';setTimeout(function(){b.textContent='Copy Link'},2000)})}catch(e){document.execCommand('copy');var b=document.querySelector('.sb.cp span');b.textContent='Copied!';setTimeout(function(){b.textContent='Copy Link'},2000)}document.body.removeChild(t)})()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        <span>Copy Link</span>
      </button>
    </div>
  </div>
  <div class="cta">
    <h3>Ready to have this conversation?</h3>
    <p>Every engagement begins with understanding your context. All conversations are confidential.</p>
    <a href="/#contact">Get in Touch</a>
  </div>
</div>
<footer><a href="/">communicationsadvisory.com</a> &nbsp;·&nbsp; © 2025 Communication Advisory</footer>
</body>
</html>`, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    }
  });
}
