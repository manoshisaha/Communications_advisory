// functions/api/posts/index.js
// Cloudflare Pages Function — returns list of all post slugs dynamically
// Called by the blog JS loader instead of the static _posts/index.json
// This way new posts appear automatically without editing index.json

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers so the page JS can fetch this
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // Use GitHub API to list files in _posts/ folder
    // No auth needed for public repos
    const apiUrl = 'https://api.github.com/repos/manoshisaha/Communications_advisory/contents/_posts';
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CommunicationsAdvisory-Website',
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!res.ok) {
      // Fallback to static index.json if GitHub API fails
      const fallback = await fetch(new URL('/_posts/index.json', url.origin).toString());
      if (fallback.ok) {
        const data = await fallback.json();
        return new Response(JSON.stringify(data), { headers });
      }
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const files = await res.json();

    // Filter to only .md files, exclude index.json, extract slugs
    const slugs = files
      .filter(f => f.type === 'file' && f.name.endsWith('.md'))
      .map(f => f.name.replace(/\.md$/, ''))
      .sort()
      .reverse(); // newest first (YYYY-MM-DD filenames sort correctly)

    return new Response(JSON.stringify(slugs), { headers });

  } catch (e) {
    // Final fallback — return known posts
    const fallback = [
      "2025-05-01-when-one-news-cycle-can-fracture-credibility",
      "2025-04-01-bangladesh-inflection-point",
      "2025-03-01-leaders-voice-matters"
    ];
    return new Response(JSON.stringify(fallback), { headers });
  }
}
