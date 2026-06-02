// functions/post/[[slug]].js
// Cloudflare Pages Function — serves fully rendered blog post pages
// URL format: /post/2026-06-01-my-article
// This makes posts indexable by Google (no JS needed to see content)

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Get slug from path: /post/the-slug-here
  const pathParts = url.pathname.split('/').filter(Boolean);
  const slug = pathParts[1]; // e.g. "2026-06-01-how-communication..."

  // If no slug, redirect to blog listing
  if (!slug) {
    return Response.redirect(new URL('/blog.html', url.origin).toString(), 302);
  }

  async function fetchFile(path) {
    try {
      const r = await fetch(new URL(path, url.origin).toString());
      if (!r.ok) return null;
      return await r.text();
    } catch (e) { return null; }
  }

  // Fetch the markdown post
  const mdText = await fetchFile(`/_posts/${slug}.md`);
  if (!mdText) {
    // Post not found — return 404 page
    return new Response(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Post Not Found – Communication Advisory</title>
<meta name="robots" content="noindex">
</head>
<body style="font-family:sans-serif;text-align:center;padding:4rem;">
<h1 style="color:#004874;">Article Not Found</h1>
<p><a href="/blog.html" style="color:#c51a1b;">← Back to all articles</a></p>
</body></html>`, { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  // Parse frontmatter
  function parseFrontmatter(text) {
    const match = text.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { body: text };
    const fm = {};
    match[1].split('\n').forEach(line => {
      const m = line.match(/^([\w_]+):\s*(.*)$/);
      if (m) fm[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
    fm.body = text.slice(match[0].length).trim();
    return fm;
  }

  // Markdown to HTML
  function mdToHtml(md) {
    if (!md) return '';
    let html = md;
    html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
      `<pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^---+$/gm, '<hr>');
    html = html.replace(/!\[([^\]]*)\]\(([^)"]+)\)/g,
      '<figure><img src="$2" alt="$1"><figcaption>$1</figcaption></figure>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/((?:^[*\-+] .+\n?)+)/gm, match => {
      const items = match.trim().split('\n')
        .map(l => `<li>${l.replace(/^[*\-+] /, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    });
    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, match => {
      const items = match.trim().split('\n')
        .map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
      return `<ol>${items}</ol>`;
    });
    const blocks = html.split(/\n\n+/);
    html = blocks.map(block => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|ul|ol|blockquote|pre|figure|hr)/.test(block)) return block;
      block = block.replace(/\n/g, '<br>');
      return `<p>${block}</p>`;
    }).join('\n');
    return html;
  }

  function formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }); }
    catch(e) { return d; }
  }

  function esc(str) {
    return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const post = parseFrontmatter(mdText);
  const title = post.title || 'Article';
  const description = post.excerpt || post.body.slice(0, 160).replace(/\n/g,' ');
  const bodyHtml = mdToHtml(post.body);
  const canonicalUrl = `https://communicationsadvisory.com/post/${slug}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} – Communication Advisory</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Communication Advisory">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonicalUrl}">
${post.image && post.image !== '""' ? `<meta property="og:image" content="${esc(post.image)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --red:#c51a1b; --red-dark:#a01415; --blue:#004874; --blue-dark:#003459;
    --cream:#faf8f5; --warm-gray:#f2efe9;
    --text-dark:#1a1a1a; --text-mid:#4a4a4a; --text-light:#888;
    --border:rgba(0,0,0,0.09); --nav-h:72px;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:'Lato',sans-serif;background:var(--cream);color:var(--text-dark)}
  nav{position:fixed;top:0;left:0;right:0;z-index:100;height:var(--nav-h);
    background:rgba(255,255,255,0.97);backdrop-filter:blur(12px);
    border-bottom:1px solid var(--border);display:flex;align-items:center}
  .nav-inner{max-width:800px;margin:0 auto;padding:0 2rem;width:100%;
    display:flex;align-items:center;justify-content:space-between}
  .nav-logo{font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:700;
    color:var(--blue);text-decoration:none}
  .nav-logo span{color:var(--red)}
  .nav-back{font-size:0.875rem;color:var(--text-mid);text-decoration:none;font-weight:500}
  .nav-back:hover{color:var(--red)}
  .post-hero{padding-top:calc(var(--nav-h) + 3rem);background:var(--blue-dark);
    color:#fff;padding-bottom:3rem}
  .post-hero-inner{max-width:800px;margin:0 auto;padding:0 2rem}
  .post-category{font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;
    color:var(--red);font-weight:700;margin-bottom:1rem;display:block}
  .post-title{font-family:'Cormorant Garamond',serif;
    font-size:clamp(1.8rem,4vw,2.75rem);font-weight:700;line-height:1.2;margin-bottom:1.5rem}
  .post-meta{font-size:0.8125rem;color:rgba(255,255,255,0.55)}
  .post-image{max-width:800px;margin:0 auto}
  .post-image img{width:100%;display:block;max-height:420px;object-fit:cover}
  .post-body-wrap{max-width:800px;margin:0 auto;padding:3rem 2rem 5rem}
  .post-body{font-size:1.0625rem;line-height:1.85;color:var(--text-mid);
    text-align:justify;text-justify:inter-word}
  .post-body p{margin-bottom:1.25rem;text-align:justify}
  .post-body h2{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:700;
    color:var(--blue);margin:2.5rem 0 1rem;padding-bottom:0.5rem;
    border-bottom:1px solid var(--border)}
  .post-body h3{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:600;
    color:var(--blue);margin:2rem 0 0.75rem}
  .post-body h4{font-family:'Cormorant Garamond',serif;font-size:1.05rem;font-weight:600;
    color:var(--blue);margin:1.5rem 0 0.5rem}
  .post-body a{color:var(--red);text-decoration:underline;font-weight:500}
  .post-body a:hover{color:var(--red-dark)}
  .post-body strong{font-weight:700;color:var(--text-dark)}
  .post-body em{font-style:italic}
  .post-body ul,.post-body ol{margin:1rem 0 1.25rem 1.5rem;line-height:1.8}
  .post-body li{margin-bottom:0.4rem}
  .post-body blockquote{border-left:3px solid var(--red);padding-left:1.5rem;
    font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-style:italic;
    color:var(--blue);margin:2rem 0}
  .post-body pre{background:var(--warm-gray);border-radius:6px;padding:1.25rem;
    overflow-x:auto;margin:1.5rem 0;font-size:0.875rem;line-height:1.6}
  .post-body code{background:var(--warm-gray);padding:2px 6px;border-radius:3px;
    font-size:0.875em}
  .post-body figure{margin:2rem 0}
  .post-body figure img{width:100%;border-radius:8px;display:block}
  .post-body figcaption{font-size:0.8rem;color:var(--text-light);text-align:center;
    margin-top:0.5rem}
  .post-body hr{border:none;border-top:1px solid var(--border);margin:2rem 0}
  .post-cta{background:var(--blue);color:#fff;border-radius:10px;
    padding:2.5rem;margin-top:3rem;text-align:center}
  .post-cta h3{font-family:'Cormorant Garamond',serif;font-size:1.4rem;margin-bottom:0.75rem}
  .post-cta p{font-size:0.9rem;color:rgba(255,255,255,0.7);margin-bottom:1.5rem}
  .post-cta a{background:var(--red);color:#fff;text-decoration:none;
    padding:0.75rem 2rem;border-radius:4px;font-weight:700;font-size:0.9rem;
    display:inline-block;transition:background 0.2s}
  .post-cta a:hover{background:var(--red-dark)}
  footer{background:#0d1e2e;color:rgba(255,255,255,0.5);padding:2rem;
    text-align:center;font-size:0.8125rem}
  footer a{color:rgba(255,255,255,0.35);text-decoration:none}
</style>
<!-- Structured data for Google -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${esc(title)}",
  "description": "${esc(description)}",
  "author": {
    "@type": "Organization",
    "name": "Communication Advisory"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Communication Advisory",
    "url": "https://communicationsadvisory.com"
  },
  "url": "${canonicalUrl}",
  "datePublished": "${post.date || ''}",
  "image": "${post.image && post.image !== '""' ? esc(post.image) : 'https://communicationsadvisory.com/assets/og-image.jpg'}"
}
</script>
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
    <span class="post-category">${esc(post.category || 'Insight')}</span>
    <h1 class="post-title">${esc(title)}</h1>
    <div class="post-meta">${esc(formatDate(post.date))}${post.read_time ? ' · ' + esc(post.read_time) : ''}</div>
  </div>
</div>

${post.image && post.image !== '""' ? `<div class="post-image"><img src="${esc(post.image)}" alt="${esc(title)}"></div>` : ''}

<div class="post-body-wrap">
  <div class="post-body">${bodyHtml}</div>
  <div class="post-cta">
    <h3>Ready to have this conversation?</h3>
    <p>Every engagement begins with understanding your specific context. All initial conversations are confidential.</p>
    <a href="/#contact">Get in Touch</a>
  </div>
</div>

<footer>
  <a href="/">communicationsadvisory.com</a> &nbsp;·&nbsp; © 2025 Communication Advisory
</footer>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
