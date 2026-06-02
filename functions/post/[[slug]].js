// functions/post/[[slug]].js
// FIXED: properly handles /post/slug-name URLs only
// Does NOT interfere with /post.html

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Only handle clean /post/slug paths — NOT /post.html
  // If pathname is exactly /post or /post/ or ends in .html, skip
  if (url.pathname === '/post' || 
      url.pathname === '/post/' || 
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    return next();
  }

  const parts = url.pathname.split('/').filter(Boolean);
  // parts[0] = 'post', parts[1] = slug
  const slug = parts[1];

  if (!slug) {
    return Response.redirect(new URL('/blog.html', url.origin).toString(), 302);
  }

  async function fetchFile(path) {
    try {
      const r = await fetch(new URL(path, url.origin).toString());
      return r.ok ? await r.text() : null;
    } catch(e) { return null; }
  }

  const mdText = await fetchFile(`/_posts/${slug}.md`);
  if (!mdText) {
    return new Response(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Article Not Found – Communication Advisory</title>
<meta name="robots" content="noindex">
<style>body{font-family:sans-serif;text-align:center;padding:4rem;background:#faf8f5}h2{color:#004874;font-size:1.5rem;margin-bottom:1rem}a{color:#c51a1b;font-weight:600}</style>
</head>
<body>
<h2>Article not found</h2>
<p style="color:#666;margin-bottom:1.5rem">The article you're looking for doesn't exist or has been moved.</p>
<a href="/blog.html">← Back to all articles</a>
</body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  }

  function parseFrontmatter(text) {
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return { body: text };
    const fm = {};
    m[1].split('\n').forEach(line => {
      const lm = line.match(/^([\w_]+):\s*(.*)$/);
      if (lm) fm[lm[1].trim()] = lm[2].trim().replace(/^["']|["']$/g,'');
    });
    fm.body = text.slice(m[0].length).trim();
    return fm;
  }

  function mdToHtml(md) {
    if (!md) return '';
    let h = md;
    h = h.replace(/```[\w]*\n?([\s\S]*?)```/g, (_,c) =>
      `<pre><code>${c.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    h = h.replace(/^# (.+)$/gm,  '<h1>$1</h1>');
    h = h.replace(/^---+$/gm, '<hr>');
    h = h.replace(/!\[([^\]]*)\]\(([^)"]+)\)/g,
      '<figure><img src="$2" alt="$1" style="width:100%;border-radius:8px;"><figcaption style="font-size:.8rem;color:#888;text-align:center;margin-top:.5rem">$1</figcaption></figure>');
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g,   '<strong>$1</strong>');
    h = h.replace(/\*([^*\n]+)\*/g,    '<em>$1</em>');
    h = h.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    h = h.replace(/((?:^[*\-+] .+\n?)+)/gm, m =>
      `<ul>${m.trim().split('\n').map(l=>`<li>${l.replace(/^[*\-+] /,'')}</li>`).join('')}</ul>`);
    h = h.replace(/((?:^\d+\. .+\n?)+)/gm, m =>
      `<ol>${m.trim().split('\n').map(l=>`<li>${l.replace(/^\d+\. /,'')}</li>`).join('')}</ol>`);
    return h.split(/\n\n+/).map(b => {
      b = b.trim();
      if (!b) return '';
      if (/^<(h[1-6]|ul|ol|blockquote|pre|figure|hr)/.test(b)) return b;
      return `<p>${b.replace(/\n/g,'<br>')}</p>`;
    }).join('\n');
  }

  function fmt(d) {
    try { return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); }
    catch(e) { return d||''; }
  }

  function esc(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const post = parseFrontmatter(mdText);
  const title = post.title || 'Article';
  const desc = post.excerpt || post.body.slice(0,160).replace(/\n/g,' ');
  const canonical = `https://communicationsadvisory.com/post/${slug}`;
  const body = mdToHtml(post.body);
  const hasImage = post.image && post.image !== '""' && post.image !== "''";

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
${hasImage ? `<meta property="og:image" content="${esc(post.image)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/CA_logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${esc(title)}","description":"${esc(desc)}","author":{"@type":"Organization","name":"Communication Advisory"},"publisher":{"@type":"Organization","name":"Communication Advisory","url":"https://communicationsadvisory.com"},"url":"${canonical}","datePublished":"${post.date||''}"}
</script>
<style>
:root{--red:#c51a1b;--red-dark:#a01415;--blue:#004874;--blue-dark:#003459;
--cream:#faf8f5;--warm-gray:#f2efe9;--text-dark:#1a1a1a;--text-mid:#4a4a4a;
--text-light:#888;--border:rgba(0,0,0,0.09);--nav-h:72px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Lato',sans-serif;background:var(--cream);color:var(--text-dark)}
nav{position:fixed;top:0;left:0;right:0;z-index:100;height:var(--nav-h);
  background:rgba(255,255,255,.97);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);display:flex;align-items:center}
.nav-inner{max-width:800px;margin:0 auto;padding:0 2rem;width:100%;
  display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:700;
  color:var(--blue);text-decoration:none}
.nav-logo span{color:var(--red)}
.nav-back{font-size:.875rem;color:var(--text-mid);text-decoration:none;font-weight:500}
.nav-back:hover{color:var(--red)}
.post-hero{padding-top:calc(var(--nav-h) + 3rem);background:var(--blue-dark);
  color:#fff;padding-bottom:3rem}
.post-hero-inner{max-width:800px;margin:0 auto;padding:0 2rem}
.post-category{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;
  color:var(--red);font-weight:700;margin-bottom:1rem;display:block}
.post-title{font-family:'Cormorant Garamond',serif;
  font-size:clamp(1.8rem,4vw,2.75rem);font-weight:700;line-height:1.2;margin-bottom:1.5rem}
.post-meta{font-size:.8125rem;color:rgba(255,255,255,.55)}
.post-image{max-width:800px;margin:0 auto}
.post-image img{width:100%;display:block;max-height:420px;object-fit:cover}
.post-body-wrap{max-width:800px;margin:0 auto;padding:3rem 2rem 5rem}
.post-body{font-size:1.0625rem;line-height:1.85;color:var(--text-mid);
  text-align:justify;text-justify:inter-word}
.post-body p{margin-bottom:1.25rem;text-align:justify}
.post-body h2{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:700;
  color:var(--blue);margin:2.5rem 0 1rem;padding-bottom:.5rem;
  border-bottom:1px solid var(--border)}
.post-body h3{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:600;
  color:var(--blue);margin:2rem 0 .75rem}
.post-body h4{font-family:'Cormorant Garamond',serif;font-size:1.05rem;font-weight:600;
  color:var(--blue);margin:1.5rem 0 .5rem}
.post-body a{color:var(--red);text-decoration:underline;font-weight:500}
.post-body a:hover{color:var(--red-dark)}
.post-body strong{font-weight:700;color:var(--text-dark)}
.post-body em{font-style:italic}
.post-body ul,.post-body ol{margin:1rem 0 1.25rem 1.5rem;line-height:1.8}
.post-body li{margin-bottom:.4rem}
.post-body blockquote{border-left:3px solid var(--red);padding-left:1.5rem;
  font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-style:italic;
  color:var(--blue);margin:2rem 0}
.post-body pre{background:var(--warm-gray);border-radius:6px;padding:1.25rem;
  overflow-x:auto;margin:1.5rem 0;font-size:.875rem;line-height:1.6}
.post-body code{background:var(--warm-gray);padding:2px 6px;border-radius:3px;font-size:.875em}
.post-body figure{margin:2rem 0}
.post-body figcaption{font-size:.8rem;color:var(--text-light);text-align:center;margin-top:.5rem}
.post-body hr{border:none;border-top:1px solid var(--border);margin:2rem 0}
.post-cta{background:var(--blue);color:#fff;border-radius:10px;
  padding:2.5rem;margin-top:3rem;text-align:center}
.post-cta h3{font-family:'Cormorant Garamond',serif;font-size:1.4rem;margin-bottom:.75rem}
.post-cta p{font-size:.9rem;color:rgba(255,255,255,.7);margin-bottom:1.5rem}
.post-cta a{background:var(--red);color:#fff;text-decoration:none;padding:.75rem 2rem;
  border-radius:4px;font-weight:700;font-size:.9rem;display:inline-block}
.post-cta a:hover{background:var(--red-dark)}
footer{background:#0d1e2e;color:rgba(255,255,255,.5);padding:2rem;text-align:center;font-size:.8125rem}
footer a{color:rgba(255,255,255,.35);text-decoration:none}
</style>
</head>
<body>
<nav>
  <div class="nav-inner">
    <a href="/" class="nav-logo"><span>C</span>ommunication <span>A</span>dvisory</a>
    <a href="/blog.html" class="nav-back">← All Articles</a>
  </div>
</nav>

<div class="post-hero">
  <div class="post-hero-inner">
    <span class="post-category">${esc(post.category||'Insight')}</span>
    <h1 class="post-title">${esc(title)}</h1>
    <div class="post-meta">${esc(fmt(post.date))}${post.read_time ? ' · ' + esc(post.read_time) : ''}</div>
  </div>
</div>

${hasImage ? `<div class="post-image"><img src="${esc(post.image)}" alt="${esc(title)}"></div>` : ''}

<div class="post-body-wrap">
  <div class="post-body">${body}</div>
  <div class="post-cta">
    <h3>Ready to have this conversation?</h3>
    <p>Every engagement begins with understanding your specific context. All conversations are confidential.</p>
    <a href="/#contact">Get in Touch</a>
  </div>
</div>

<footer>
  <a href="/">communicationsadvisory.com</a> &nbsp;·&nbsp; © 2025 Communication Advisory
</footer>
</body>
</html>`, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    }
  });
}
