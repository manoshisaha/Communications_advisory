// functions/api/posts/index.js
// Returns JSON array of all post slugs from GitHub
// New posts appear automatically — no index.json update needed

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  };

  // Try GitHub API to list all .md files in _posts/
  try {
    const res = await fetch(
      'https://api.github.com/repos/manoshisaha/Communications_advisory/contents/_posts',
      { headers: { 'User-Agent': 'CA-Website', 'Accept': 'application/vnd.github.v3+json' } }
    );
    if (res.ok) {
      const files = await res.json();
      const slugs = files
        .filter(f => f.type === 'file' && f.name.endsWith('.md'))
        .map(f => f.name.replace(/\.md$/, ''))
        .sort().reverse(); // newest first
      return new Response(JSON.stringify(slugs), { headers });
    }
  } catch(e) {}

  // Fallback to static index.json
  try {
    const url = new URL(context.request.url);
    const r = await fetch(new URL('/_posts/index.json', url.origin).toString());
    if (r.ok) return new Response(await r.text(), { headers });
  } catch(e) {}

  return new Response('[]', { headers });
}
