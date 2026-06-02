// functions/api/posts/index.js
// Returns JSON array of all post slugs — auto-discovers from GitHub API
// No manual index.json updates needed ever again

export async function onRequest(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  };

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
        .sort().reverse();
      return new Response(JSON.stringify(slugs), { headers });
    }
  } catch(e) {}

  // Fallback to static index.json
  try {
    const url = new URL(context.request.url);
    const fallback = await fetch(new URL('/_posts/index.json', url.origin).toString());
    if (fallback.ok) return new Response(await fallback.text(), { headers });
  } catch(e) {}

  return new Response('[]', { headers });
}
