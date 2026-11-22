export async function authenticate(request, env) {
  const authHeader = request.headers.get("Authorization");

  let token = null;

  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (!token) {
    token = new URL(request.url).searchParams.get("token");
  }

  const guest = {
    success: true,
    token: null,
    user: {
      id: null,
      username: "Guest",
      email: null,
      role: "guest",
      created_at: null
    }
  };

  if (!token) return guest;

  if (token.startsWith("g.")) {
    if (!env.GUEST_TOKEN_SECRET) return guest;

    const guestData = await verifyGuestToken(
      token,
      env.GUEST_TOKEN_SECRET
    );

    if (!guestData) return guest;

    return {
      success: true,
      token,
      user: {
        id: guestData.id,
        username: "Guest",
        email: null,
        role: "guest",
        created_at: null
      }
    };
  }

  try {
    const session = await env.DB
      .prepare(`
        SELECT
          s.token,
          s.user_id,
          s.created_at AS session_created_at,
          s.expires_at,
          s.active,
          u.id,
          u.username,
          u.email,
          u.role,
          u.created_at AS user_created_at
        FROM sessions s
        INNER JOIN users u
          ON u.id = s.user_id
        WHERE s.token = ?
        LIMIT 1
      `)
      .bind(token)
      .first();

    if (!session || !Number(session.active)) {
      return guest;
    }

    if (Date.now() > Number(session.expires_at)) {
      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE token = ?
        `)
        .bind(token)
        .run();

      return guest;
    }

    return {
      success: true,
      token,
      user: {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
        created_at: session.user_created_at
      }
    };
  } catch (error) {
    console.error("Authentication error:", error);

    return {
      success: false,
      status: 500,
      message: error.message || "Authentication failed."
    };
  }
}


function base64UrlEncode(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const binary = atob(
    base64 + "=".repeat((4 - base64.length % 4) % 4)
  );

  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function verifyGuestToken(token, secret) {
  try {
    if (!token.startsWith("g.")) return null;

    const parts = token.split(".");

    if (parts.length !== 3) return null;

    const [, payload, signature] = parts;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      new TextEncoder().encode(payload)
    );

    if (!valid) return null;

    const data = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload))
    );

    if (
      data.role !== "guest" ||
      !data.id ||
      !Number.isFinite(data.exp) ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function createGuestToken(env) {
  if (!env.GUEST_TOKEN_SECRET) {
    throw new Error("Guest token secret is not configured.");
  }

  const payload = {
    id: crypto.randomUUID(),
    role: "guest",
    exp: Math.floor(Date.now() / 1000) + 86400
  };

  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.GUEST_TOKEN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );

  return `g.${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}
