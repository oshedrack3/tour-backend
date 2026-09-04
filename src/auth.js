import { v4 as uuid } from "uuid";

export async function handleAuthRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "POST" && pathname === "/auth/register") {
    return await register(request, env);
  }

  if (request.method === "POST" && pathname === "/auth/login") {
    return await login(request, env);
  }

  if (request.method === "POST" && pathname === "/auth/logout") {
    return await logout(request, env);
  }

  if (request.method === "POST" && pathname === "/auth/verify") {
    return await verify(request, env);
  }

  return Response.json(
    {
      success: false,
      message: "Auth route not found."
    },
    { status: 404 }
  );
}

async function register(request, env) {
  try {
    const body =
      await request.json();

    const username =
      String(
        body.username || ""
      ).trim();

    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();

    const phone =
      String(
        body.phone || ""
      ).trim();

    const password =
      String(
        body.password || ""
      );

    const role =
      String(
        body.role || "player"
      )
        .trim()
        .toLowerCase();

    if (
      !username ||
      !email ||
      !phone ||
      !password
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Username, email, phone and password are required."
        },
        {
          status: 400
        }
      );
    }

    if (
      !["admin", "player"].includes(
        role
      )
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Invalid role."
        },
        {
          status: 400
        }
      );
    }

    if (
      password.length < 6
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Password must be at least 6 characters."
        },
        {
          status: 400
        }
      );
    }

    const id =
      uuid();

    const createdAt =
      Date.now();

    const passwordHash =
      await hashPassword(
        password
      );

    try {
      await env.DB
        .prepare(`
          INSERT INTO users (
            id,
            username,
            email,
            phone,
            password_hash,
            role,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id,
          username,
          email,
          phone,
          passwordHash,
          role,
          createdAt
        )
        .run();

    } catch (error) {
      const message =
        String(
          error?.message || ""
        ).toLowerCase();

      console.error(
        "Registration database error:",
        error
      );

      if (
        message.includes(
          "unique constraint"
        ) &&
        message.includes(
          "users.username"
        )
      ) {
        return Response.json(
          {
            success: false,
            message:
              "Username already exists."
          },
          {
            status: 409
          }
        );
      }

      if (
        message.includes(
          "unique constraint"
        ) &&
        message.includes(
          "users.email"
        )
      ) {
        return Response.json(
          {
            success: false,
            message:
              "Email already exists."
          },
          {
            status: 409
          }
        );
      }

      return Response.json(
        {
          success: false,
          message:
            "Unable to create account. Please try again."
        },
        {
          status: 500
        }
      );
    }

    return Response.json(
      {
        success: true,
        message:
          "Account created successfully.",
        user: {
          id,
          username,
          email,
          phone,
          role,
          created_at:
            createdAt
        }
      },
      {
        status: 201
      }
    );

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Registration failed. Please try again."
      },
      {
        status: 500
      }
    );
  }
}


async function login(request, env) {
  try {
    const body = await request.json();

    const loginValue = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!loginValue || !password) {
      return Response.json(
        {
          success: false,
          message: "Login and password are required."
        },
        { status: 400 }
      );
    }

    const user = await env.DB
      .prepare(`
        SELECT
          id,
          username,
          email,
          password_hash,
          role,
          created_at
        FROM users
        WHERE LOWER(username) = ?
           OR LOWER(email) = ?
        LIMIT 1
      `)
      .bind(loginValue, loginValue)
      .first();

    if (!user) {
      return Response.json(
        {
          success: false,
          title: "Account Not Found",
          message: "No account exists with these login details."
        },
        { status: 404 }
      );
    }

    const validPassword = await verifyPassword(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return Response.json(
        {
          success: false,
          title: "Invalid Password",
          message:
            "The Password is incorrect, Please check and try again."
        },
        { status: 401 }
      );
    }

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `)
      .bind(user.id)
      .run();

    const token = uuid();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;

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

    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Login failed."
      },
      { status: 500 }
    );
  }
}

async function logout(request, env) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();

    if (!token) {
      return Response.json(
        {
          success: false,
          message: "Token is required."
        },
        { status: 400 }
      );
    }

    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE token = ?
      `)
      .bind(token)
      .run();

    return Response.json({
      success: true,
      message: "Logged out successfully."
    });
  } catch (error) {
    console.error("Logout error:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Logout failed."
      },
      { status: 500 }
    );
  }
}

async function verify(request, env) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();

    if (!token) {
      return Response.json(
        {
          success: false,
          message: "Token is required."
        },
        { status: 400 }
      );
    }

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
          u.created_at
        FROM sessions s
        INNER JOIN users u
          ON u.id = s.user_id
        WHERE s.token = ?
        LIMIT 1
      `)
      .bind(token)
      .first();

    if (!session) {
      return Response.json(
        {
          success: false,
          message: "Invalid session."
        },
        { status: 401 }
      );
    }

    if (!Number(session.active)) {
      return Response.json(
        {
          success: false,
          message: "Session inactive."
        },
        { status: 401 }
      );
    }

    if (Date.now() > Number(session.expires_at)) {
      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE token = ?
        `)
        .bind(token)
        .run();

      return Response.json(
        {
          success: false,
          message: "Session expired."
        },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      user: {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
        created_at: session.created_at
      }
    });
  } catch (error) {
    console.error("Verify error:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Session verification failed."
      },
      { status: 500 }
    );
  }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    {
      name: "PBKDF2"
    },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return (
    arrayBufferToBase64(salt) +
    "." +
    arrayBufferToBase64(bits)
  );
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(".")) {
    return false;
  }

  const parts = storedHash.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const salt = base64ToUint8Array(parts[0]);
  const expectedHash = parts[1];

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    {
      name: "PBKDF2"
    },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );

  const actualHash = arrayBufferToBase64(bits);

  return actualHash === expectedHash;
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

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}