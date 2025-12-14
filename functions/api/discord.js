// Cloudflare Workers (Pages Functions) での Firebase Custom Token 発行ロジック

// Base64URLエンコード (k, v -> string)
function b64url(str) {
    return btoa(String.fromCharCode(...new Uint8Array(new TextEncoder().encode(str))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// 鍵インポート (PEM -> CryptoKey)
async function importPrivateKey(pem) {
    // PEMヘッダー/フッター削除 & 改行削除
    const pemContents = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, '');
        
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    
    return await crypto.subtle.importKey(
        "pkcs8",
        binaryDer.buffer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );
}

// JWT生成
async function createCustomToken(uid, email, privateKeyPem) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
        iss: email,
        sub: email,
        aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
        iat: now,
        exp: now + 3600, // 1時間
        uid: uid,
        claims: { is_admin: true } // 管理者フラグ
    };

    const encodedHeader = b64url(JSON.stringify(header));
    const encodedPayload = b64url(JSON.stringify(payload));
    const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

    const key = await importPrivateKey(privateKeyPem);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
    const encodedSignature = b64url(String.fromCharCode(...new Uint8Array(signature)));

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function onRequest(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const DISCORD_ID = env.DISCORD_CLIENT_ID;
  const DISCORD_SECRET = env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI = env.DISCORD_REDIRECT_URI;
  const ALLOWED_USERS = (env.ALLOWED_DISCORD_IDS || "").split(",");
  
  // Firebase設定 (サービスアカウント)
  const FB_EMAIL = env.FIREBASE_CLIENT_EMAIL; // xxx@project.iam.gserviceaccount.com
  const FB_KEY = env.FIREBASE_PRIVATE_KEY;    // -----BEGIN PRIVATE KEY----- ...

  // 1. コードがない場合 -> リダイレクトURLを返す
  if (!code) {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. コードがある場合 -> 検証 & トークン発行
  try {
    // A. Token Exchange
    const tokenParams = new URLSearchParams({
      client_id: DISCORD_ID,
      client_secret: DISCORD_SECRET,
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
      return new Response(JSON.stringify({ error: "Failed to get discord token", details: tokenData }), { status: 400 });
    }

    // B. Get User Info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // C. Verify User
    if (ALLOWED_USERS.includes(userData.id)) {
      
      // D. Generate Firebase Custom Token
      if (FB_EMAIL && FB_KEY) {
          // 改行コードの復元 (環境変数によっては \n が文字として入っている場合があるため)
          const formattedKey = FB_KEY.replace(/\\n/g, '\n');
          const customToken = await createCustomToken(userData.id, FB_EMAIL, formattedKey);
          
          return new Response(JSON.stringify({ 
              success: true, 
              firebase_token: customToken, 
              user: userData 
          }), { headers: { "Content-Type": "application/json" } });

      } else {
          return new Response(JSON.stringify({ error: "Server config error (Missing Firebase Creds)" }), { status: 500 });
      }

    } else {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized user", user: userData }), { status: 403 });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server Error", message: err.message, stack: err.stack }), { status: 500 });
  }
}
