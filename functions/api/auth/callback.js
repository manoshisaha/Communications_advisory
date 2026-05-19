// Cloudflare Pages Function — GitHub OAuth callback
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing authorization code.", { status: 400 });
  }

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
    return new Response("Failed to contact GitHub: " + e.message, { status: 502 });
  }

  const token = tokenData.access_token;
  if (!token) {
    const reason = tokenData.error_description || tokenData.error || "Unknown";
    return new Response("Authentication failed: " + reason, { status: 401 });
  }

  // Use the proven Netlify/Decap postMessage format exactly
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authorizing...</title>
</head>
<body>
  <p style="font-family:sans-serif;color:#888;text-align:center;padding-top:40vh;margin:0;">
    Authorizing, please wait...
  </p>
  <script>
    (function() {
      function receiveMessage(e) {
        console.log("receiveMessage", e);
        window.opener.postMessage(
          'authorization:github:success:{"token":"${token}","provider":"github"}',
          e.origin
        );
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    })();
  <\/script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
