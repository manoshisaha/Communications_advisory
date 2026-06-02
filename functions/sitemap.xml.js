// functions/sitemap.xml.js
// Dynamic sitemap — auto-includes all blog posts
// Replaces the static sitemap.xml

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const origin = 'https://communicationsadvisory.com';

  let postUrls = '';

  try {
    const apiUrl = 'https://api.github.com/repos/manoshisaha/Communications_advisory/contents/_posts';
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CommunicationsAdvisory-Website',
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (res.ok) {
      const files = await res.json();
      const slugs = files
        .filter(f => f.type === 'file' && f.name.endsWith('.md'))
        .map(f => f.name.replace(/\.md$/, ''));

      postUrls = slugs.map(slug => `
  <url>
    <loc>${origin}/post/${slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');
    }
  } catch(e) {}

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>${origin}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>${origin}/blog.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
${postUrls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
