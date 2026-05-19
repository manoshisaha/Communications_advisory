// Cloudflare Pages Function — GitHub OAuth callback
// GitHub redirects here after login; we exchange the code for a token
// and pass it back to Decap CMS via postMessage
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing authorization code.", { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  if (!token) {
    return new Response("Authentication failed — no token returned.", { status: 401 });
  }

  // Send token back to Decap CMS via postMessage
  const content = `
<!DOCTYPE html>
<html>
<head><title>Authenticating...</title></head>
<body>
<script>
  (function() {
    function receiveMessage(e) {
      window.opener.postMessage(
        'authorization:github:success:' + JSON.stringify({
          token: "${token}",
          provider: "github"
        }),
        e.origin
      );
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  })();
<\/script>
<p>Authenticating, please wait...</p>
</body>
</html>`;

  return new Response(content, {
    headers: { "Content-Type": "text/html" },
  });
}
