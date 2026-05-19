// Cloudflare Pages Function — GitHub OAuth start
// Route: /api/auth
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/callback`;

  if (!env.GITHUB_CLIENT_ID) {
    return new Response(
      "GITHUB_CLIENT_ID is not set in Cloudflare environment variables. See SETUP_GUIDE.md Step 2b.",
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.set("scope", "repo,user");

  return Response.redirect(githubAuthUrl.toString(), 302);
}
