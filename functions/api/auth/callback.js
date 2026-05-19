// Cloudflare Pages Function — GitHub OAuth callback
// Route: /api/auth/callback
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing authorization code.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Exchange the code for a GitHub access token
  let tokenData;
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });
    tokenData = await tokenRes.json();
  } catch (e) {
    return new Response("Failed to contact GitHub: " + e.message, {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const token = tokenData.access_token;

  if (!token) {
    const reason = tokenData.error_description || tokenData.error || "Unknown";
    return new Response("Authentication failed: " + reason, {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Pass token back to Decap CMS via postMessage
  const tokenPayload = JSON.stringify({
    token: token,
    provider: "github",
  });

  const escapedPayload = tokenPayload.replace(/\\/g, '\\\\').replace(/`/g, '\\`');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Authenticating...</title></head>
<body>
<p style="font-family:sans-serif;color:#888;text-align:center;margin-top:40vh;">
  Completing login, please wait...
</p>
<script>
(function() {
  var payload = \`${escapedPayload}\`;
  function sendToken(e) {
    window.opener.postMessage(
      'authorization:github:success:' + payload,
      e.origin
    );
  }
  window.addEventListener('message', sendToken, false);
  window.opener.postMessage('authorizing:github', '*');
})();
<\/script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
