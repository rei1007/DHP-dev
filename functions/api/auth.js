export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { password } = await request.json();

    // Cloudflare Pagesの環境変数 ADMIN_PASSWORD と比較
    // 環境変数が設定されていない場合のフォールバック（開発用）も考慮
    const correctPassword = env.ADMIN_PASSWORD || "admin1234";

    if (password === correctPassword) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(
        JSON.stringify({ success: false, message: "Incorrect password" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 401,
        }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: "Server Error" }),
      { status: 500 }
    );
  }
}
