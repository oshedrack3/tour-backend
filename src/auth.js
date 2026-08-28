import { v4 as uuid } from "uuid";

export async function handleAuthRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/auth/register") {
    return await register(request, env);
  }

  if (request.method === "POST" && url.pathname === "/auth/login") {
    return await login(request, env);
  }

  if (request.method === "POST" && url.pathname === "/auth/logout") {
    return await logout(request, env);
  }

  if (request.method === "POST" && url.pathname === "/auth/verify") {
    return await verify(request, env);
  }

  return Response.json({
    success: false,
    message: "Auth route not found."
  }, { status: 404 });
}

async function register(request, env) {
  try {
    const body = await request.json();

    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "").trim();

    if (!username || !email || !password || !role) {
      return Response.json({
        success: false,
        message: "Missing required fields."
      }, { status: 400 });
    }

    if (!["admin", "player"].includes(role)) {
      return Response.json({
        success: false,
        message: "Invalid role."
      }, { status: 400 });
    }

    const existingUsername = await env.DB
      .prepare(`
        SELECT id
        FROM users
        WHERE LOWER(username) = ?
        LIMIT 1
      `)
      .bind(username)
      .first();

    if (existingUsername) {
      return Response.json({
        success: false,
        message: "Username already exists."
      }, { status: 409 });
    }

    const existingEmail = await env.DB
      .prepare(`
        SELECT id
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
      `)
      .bind(email)
      .first();

    if (existingEmail) {
      return Response.json({
        success: false,
        message: "Email already exists."
      }, { status: 409 });
    }

    const id = uuid();
    const now = Date.now();

    const passwordData = await hashPassword(password);

    await env.DB
      .prepare(`
        INSERT INTO users (
          id,
          username,
          email,
          password_hash,
          password_salt,
          role,
          created_at,
          updated_at,
          last_login,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        username,
        email,
        passwordData.hash,
        passwordData.salt,
        role,
        now,
        now,
        null,
        "active"
      )
      .run();

    const user = {
      id,
      username,
      email,
      role,
      created_at: now,
      updated_at: now,
      last_login: null,
      status: "active"
    };

    return Response.json({
      success: true,
      user
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

async function login(request, env) {
  try {
    const body = await request.json();

    const loginValue = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!loginValue || !password) {
      return Response.json({
        success: false,
        message: "Login and password are required."
      }, { status: 400 });
    }

    const user = await env.DB
      .prepare(`
        SELECT
          id,
          username,
          email,
          password_hash,
          password_salt,
          role,
          created_at,
          updated_at,
          last_login,
          status
        FROM users
        WHERE LOWER(username) = ?
           OR LOWER(email) = ?
        LIMIT 1
      `)
      .bind(loginValue, loginValue)
      .first();

    if (!user) {
      return Response.json({
        success: false,
        title: "Account Not Found",
        message: "No account exists with these login details."
      }, { status: 404 });
    }

    if (user.status !== "active") {
      return Response.json({
        success: false,
        message: "This account is not active."
      }, { status: 403 });
    }

    const validPassword = await verifyPassword(
      password,
      user.password_hash,
      user.password_salt
    );

    if (!validPassword) {
      return Response.json({
        success: false,
        title: "Invalid Password",
        message: "The Password is incorrect, Please check and try again."
      }, { status: 401 });
    }

    const now = Date.now();

    await env.DB
      .prepare(`
        UPDATE users
        SET last_login = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(now, now, user.id)
      .run();

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `)
      .bind(user.id)
      .run();

    const token = uuid();

    const expiresAt =
      now + (30 * 24 * 60 * 60 * 1000);

    await env.DB
      .prepare(`
        INSERT INTO sessions (
          token,
          user_id,
          created_at,
          expires_at,
          active
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        token,
        user.id,
        now,
        expiresAt,
        1
      )
      .run();

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: now,
      last_login: now,
      status: user.status
    };

    return Response.json({
      success: true,
      token,
      user: safeUser
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

async function logout(request, env) {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return Response.json({
        success: false,
        message: "Token is required."
      }, { status: 400 });
    }

    const result = await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE token = ?
      `)
      .bind(token)
      .run();

    if (!result.meta.changes) {
      return Response.json({
        success: false,
        message: "Session not found."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "Logged out successfully."
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

async function verify(request, env) {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return Response.json({
        success: false,
        message: "Token is required."
      }, { status: 400 });
    }

    const session = await env.DB
      .prepare(`
        SELECT
          s.token,
          s.user_id,
          s.created_at,
          s.expires_at,
          s.active,
          u.id,
          u.username,
          u.email,
          u.role,
          u.created_at,
          u.updated_at,
          u.last_login,
          u.status
        FROM sessions s
        INNER JOIN users u
          ON u.id = s.user_id
        WHERE s.token = ?
        LIMIT 1
      `)
      .bind(token)
      .first();

    if (!session) {
      return Response.json({
        success: false,
        message: "Invalid session."
      }, { status: 401 });
    }

    if (!session.active) {
      return Response.json({
        success: false,
        message: "Session inactive."
      }, { status: 401 });
    }

    if (Date.now() > session.expires_at) {
      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE token = ?
        `)
        .bind(token)
        .run();

      return Response.json({
        success: false,
        message: "Session expired."
      }, { status: 401 });
    }

    if (session.status !== "active") {
      return Response.json({
        success: false,
        message: "User account is not active."
      }, { status: 403 });
    }

    const user = {
      id: session.id,
      username: session.username,
      email: session.email,
      role: session.role,
      created_at: session.created_at,
      updated_at: session.updated_at,
      last_login: session.last_login,
      status: session.status
    };

    return Response.json({
      success: true,
      user
    });

  } catch (error) {
    return Response.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  return {
    salt: arrayBufferToBase64(salt),
    hash: arrayBufferToBase64(derivedBits)
  };
}

async function verifyPassword(
  password,
  storedHash,
  storedSalt
) {
  const encoder = new TextEncoder();

  const salt = base64ToUint8Array(storedSalt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  const calculatedHash =
    arrayBufferToBase64(derivedBits);

  return calculatedHash === storedHash;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);

  const bytes = new Uint8Array(
    binary.length
  );

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
