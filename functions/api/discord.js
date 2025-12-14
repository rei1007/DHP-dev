export async function onRequest(context) {
  const { request, env } = context;

  // URLからクエリパラメータを取得 (GETリクエストの場合: ログインURL生成用)
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // 環境変数 (Cloudflare Pages Dashboardで設定が必要)
  const CLIENT_ID = env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI = env.DISCORD_REDIRECT_URI; // 例: https://your-site.pages.dev/admin.html
  const ALLOWED_USERS = (env.ALLOWED_DISCORD_IDS || "").split(","); // 許可するユーザーID (カンマ区切り)

  // 1. コードがない場合 -> リダイレクトURLを返す (フロントエンド用)
  if (!code) {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. コードがある場合 -> トークン交換 & ユーザー確認
  try {
    // A. Token Exchange
    const tokenParams = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI,
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: tokenParams,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error: "Failed to get access token", details: tokenData }), { status: 400 });
    }

    // B. Get User Info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // C. Verify User
    if (ALLOWED_USERS.includes(userData.id)) {
      // 成功: ユーザー情報を返す
      return new Response(JSON.stringify({ success: true, user: userData }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      // 権限なし
      return new Response(JSON.stringify({ success: false, error: "Unauthorized user", user: userData }), { status: 403 });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server Error", message: err.message }), { status: 500 });
  }
}
