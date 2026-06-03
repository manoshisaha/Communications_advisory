export async function onRequest(context) {
  const headers = {'Content-Type':'application/json','Cache-Control':'no-cache','Access-Control-Allow-Origin':'*'};
  try {
    const res = await fetch('https://api.github.com/repos/manoshisaha/Communications_advisory/contents/_posts',
      {headers:{'User-Agent':'CA-Website','Accept':'application/vnd.github.v3+json'}});
    if (res.ok) {
      const files = await res.json();
      const slugs = files.filter(f=>f.type==='file'&&f.name.endsWith('.md'))
        .map(f=>f.name.replace(/\.md$/,'')).sort().reverse();
      return new Response(JSON.stringify(slugs),{headers});
    }
  } catch(e) {}
  try {
    const fb = await fetch(new URL('/_posts/index.json', new URL(context.request.url).origin).toString());
    if (fb.ok) return new Response(await fb.text(),{headers});
  } catch(e) {}
  return new Response('[]',{headers});
}
