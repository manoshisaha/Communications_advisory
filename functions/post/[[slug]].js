// functions/post/[[slug]].js
// Serves fully server-rendered blog post pages at /post/slug-name
// Google can index these — all content is in the HTML, no JS needed

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts[1];

  // No slug = redirect to blog listing
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
<head>
<meta charset="UTF-8">
<title>Not Found – Communication Advisory</title>
<meta name="robots" content="noindex">
<style>body{font-family:sans-serif;text-align:center;padding:4rem;background:#faf8f5}
h2{color:#004874;font-size:1.5rem;margin-bottom:1rem}
a{color:#c51a1b;font-weight:600;text-decoration:none}</style>
</head>
<body>
<h2>Article not found</h2>
<p style="color:#888;margin-bottom:1.5rem">This article may have been moved.</p>
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
      if (lm) fm[lm[1].trim()] = lm[2].trim().replace(/^["']|["']$/g, '');
    });
    fm.body = text.slice(m[0].length).trim();
    return fm;
  }

  function mdToHtml(md) {
    if (!md) return '';
    let h = md;
    h = h.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) =>
      `<pre><code>${c.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`);
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    h = h.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    h = h.replace(/^### (.+)$/gm,  '<h3>$1</h3>');
    h = h.replace(/^## (.+)$/gm,   '<h2>$1</h2>');
    h = h.replace(/^# (.+)$/gm,    '<h1>$1</h1>');
    h = h.replace(/^---+$/gm, '<hr>');
    h = h.replace(/!\[([^\]]*)\]\(([^)"]+)\)/g,
      '<figure><img src="$2" alt="$1" style="width:100%;border-radius:8px;"><figcaption style="font-size:.8rem;color:#888;text-align:center;margin-top:.5rem;font-style:italic;">$1</figcaption></figure>');
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*([^*\n]+)\*/g,  '<em>$1</em>');
    h = h.replace(/__(.+?)__/g, '<strong>$1</strong>');
    h = h.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    h = h.replace(/((?:^[*\-+] .+\n?)+)/gm, m =>
      '<ul>' + m.trim().split('\n').map(l =>
        `<li>${l.replace(/^[*\-+] /, '')}</li>`).join('') + '</ul>');
    h = h.replace(/((?:^\d+\. .+\n?)+)/gm, m =>
      '<ol>' + m.trim().split('\n').map(l =>
        `<li>${l.replace(/^\d+\. /, '')}</li>`).join('') + '</ol>');
    return h.split(/\n\n+/).map(b => {
      b = b.trim();
      if (!b) return '';
      if (/^<(h[1-6]|ul|ol|blockquote|pre|figure|hr)/.test(b)) return b;
      return '<p>' + b.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
  }

  function esc(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB',
      {day:'numeric', month:'long', year:'numeric'}); }
    catch(e) { return d; }
  }

  const post = parseFrontmatter(mdText);
  const title = post.title || 'Article';
  const desc = post.excerpt || post.body.slice(0,160).replace(/\n/g,' ');
  const canonical = `https://communicationsadvisory.com/post/${slug}`;
  const hasImage = post.image && post.image !== '""' && post.image !== "''";
  const body = mdToHtml(post.body);

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
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${esc(title)}","description":"${esc(desc)}","author":{"@type":"Organization","name":"Communication Advisory"},"publisher":{"@type":"Organization","name":"Communication Advisory","url":"https://communicationsadvisory.com"},"url":"${canonical}","datePublished":"${post.date||''}"}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<style>
:root{--red:#c51a1b;--red-dark:#a01415;--blue:#004874;--blue-dark:#003459;--cream:#faf8f5;--warm-gray:#f2efe9;--text-dark:#1a1a1a;--text-mid:#4a4a4a;--text-light:#888;--border:rgba(0,0,0,0.09)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:'Lato',sans-serif;background:var(--cream);color:var(--text-dark)}
.topbar{background:#fff;border-bottom:1px solid var(--border);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between}
.topbar-logo{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:700;color:var(--blue);text-decoration:none}
.topbar-logo span{color:var(--red)}
.topbar-back{font-size:.875rem;font-weight:600;color:var(--text-mid);text-decoration:none;display:flex;align-items:center;gap:6px;padding:.5rem 1rem;border:1px solid var(--border);border-radius:100px;transition:all .2s}
.topbar-back:hover{border-color:var(--red);color:var(--red)}
.article-banner{background:var(--blue-dark);padding:3rem 2rem 3.5rem;color:#fff}
.article-banner-inner{max-width:760px;margin:0 auto}
.article-cat{display:inline-block;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--red);background:rgba(197,26,27,.15);border:1px solid rgba(197,26,27,.3);padding:.3rem .875rem;border-radius:100px;margin-bottom:1.5rem}
.article-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.75rem,4vw,2.75rem);font-weight:700;line-height:1.25;color:#fff;margin-bottom:1.25rem}
.article-meta{font-size:.8125rem;color:rgba(255,255,255,.5)}
.article-image{max-width:760px;margin:0 auto;padding:0 2rem}
.article-image img{width:100%;display:block;border-radius:0 0 10px 10px;max-height:400px;object-fit:cover}
.article-body-wrap{max-width:760px;margin:0 auto;padding:3rem 2rem 6rem}
.article-body{font-size:1.0625rem;line-height:1.9;color:var(--text-mid);text-align:justify;text-justify:inter-word}
.article-body p{margin-bottom:1.5rem}
.article-body h2{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:700;color:var(--blue);margin:2.5rem 0 1rem;padding-bottom:.625rem;border-bottom:2px solid var(--red)}
.article-body h3{font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:600;color:var(--blue);margin:2rem 0 .75rem}
.article-body h4{font-size:1rem;font-weight:700;color:var(--text-dark);margin:1.5rem 0 .5rem}
.article-body a{color:var(--red);text-decoration:underline;font-weight:500;text-underline-offset:3px}
.article-body a:hover{color:var(--red-dark)}
.article-body strong{font-weight:700;color:var(--text-dark)}
.article-body em{font-style:italic}
.article-body blockquote{border-left:4px solid var(--red);padding:.5rem 0 .5rem 1.5rem;margin:2rem 0;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-style:italic;color:var(--blue);line-height:1.6}
.article-body ul,.article-body ol{margin:1rem 0 1.5rem 1.75rem;line-height:1.9}
.article-body li{margin-bottom:.375rem}
.article-body pre{background:var(--warm-gray);border-radius:6px;padding:1.25rem;overflow-x:auto;margin:1.5rem 0;font-size:.875rem;line-height:1.6}
.article-body code{background:var(--warm-gray);padding:2px 6px;border-radius:3px;font-size:.875em}
.article-body figure{margin:2rem 0}
.article-body hr{border:none;border-top:1px solid var(--border);margin:2.5rem 0}
.article-cta{background:var(--blue);color:#fff;border-radius:12px;padding:2.5rem;margin-top:3rem;text-align:center}
.article-cta h3{font-family:'Cormorant Garamond',serif;font-size:1.5rem;margin-bottom:.75rem}
.article-cta p{font-size:.9rem;color:rgba(255,255,255,.7);margin-bottom:1.5rem;line-height:1.7}
.article-cta a{display:inline-block;background:var(--red);color:#fff;text-decoration:none;padding:.875rem 2.5rem;border-radius:4px;font-weight:700;transition:background .2s}
.article-cta a:hover{background:var(--red-dark)}
footer{background:#0d1e2e;color:rgba(255,255,255,.5);padding:1.5rem 2rem;text-align:center;font-size:.8rem}
footer a{color:rgba(255,255,255,.35);text-decoration:none}
</style>
</head>
<body>
<div class="topbar">
  <a href="/" class="topbar-logo"><span>C</span>ommunication <span>A</span>dvisory</a>
  <a href="/blog.html" class="topbar-back">← All Articles</a>
</div>
<div class="article-banner">
  <div class="article-banner-inner">
    <div class="article-cat">${esc(post.category||'Insight')}</div>
    <h1 class="article-title">${esc(title)}</h1>
    <div class="article-meta">${esc(fmtDate(post.date))}${post.read_time?' · '+esc(post.read_time):''}</div>
  </div>
</div>
${hasImage?`<div class="article-image"><img src="${esc(post.image)}" alt="${esc(title)}"></div>`:''}
<div class="article-body-wrap">
  <div class="article-body">${body}</div>
  <div class="article-cta">
    <h3>Ready to have this conversation?</h3>
    <p>Every engagement begins with understanding your context. All initial conversations are confidential.</p>
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
