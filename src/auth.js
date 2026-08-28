import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
function sanitizeUser(user) {
  return {
    id: user.id,
    uid: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    created_at: user.created_at
  };
}
export async function handleAuthRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (
    request.method === "POST" &&
    pathname === "/auth/register"
  ) {
    return await register(request, env);
  }
  if (
    request.method === "POST" &&
    pathname === "/auth/login"
  ) {
    return await login(request, env);
  }
  if (
    request.method === "POST" &&
    pathname === "/auth/logout"
  ) {
    return await logout(request, env);
  }
  if (
    request.method === "POST" &&
    pathname === "/auth/verify"
  ) {
    return await verify(request, env);
  }
  return null;
}
async function register(request, env) {
  try {
    const {
      username,
      email,
      password,
      role
    } = await request.json();
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
    const usernameExists = await env.DB
      .prepare(`
        SELECT id
        FROM users
        WHERE LOWER(username) = LOWER(?)
        LIMIT 1
      `)
      .bind(username)
      .first();
    if (usernameExists) {
      return Response.json({
        success: false,
        message: "Username already exists."
      }, { status: 409 });
    }
    const emailExists = await env.DB
      .prepare(`
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `)
      .bind(email)
      .first();
    if (emailExists) {
      return Response.json({
        success: false,
        message: "Email already exists."
      }, { status: 409 });
    }
    const id = uuid();
    const passwordHash = await bcrypt.hash(
      password,
      10
    );
    const createdAt = Date.now();
    await env.DB
      .prepare(`
        INSERT INTO users (
          id,
          username,
          email,
          password_hash,
          role,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        username,
        email,
        passwordHash,
        role,
        createdAt
      )
      .run();
    const user = {
      id,
      uid: id,
      username,
      email,
      role,
      created_at: createdAt
    };
    return Response.json({
      success: true,
      user
    }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return Response.json({
      success: false,
      message: err.message
    }, { status: 500 });
  }
}
async function login(request, env) {
  try {
    const {
      login: loginValue,
      password
    } = await request.json();
    if (!loginValue || !password) {
      return Response.json({
        success: false,
        message: "Login and password are required."
      }, { status: 400 });
    }
    const user = await env.DB
      .prepare(`
        SELECT *
        FROM users
        WHERE LOWER(username) = LOWER(?)
           OR LOWER(email) = LOWER(?)
        LIMIT 1
      `)
      .bind(
        loginValue,
        loginValue
      )
      .first();
    if (!user) {
      return Response.json({
        success: false,
        title: "Account Not Found",
        message: "No account exists with these login details."
      }, { status: 404 });
    }
    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );
    if (!validPassword) {
      return Response.json({
        success: false,
        title: "Invalid Password",
        message:
          "The Password is incorrect, Please check and try again."
      }, { status: 401 });
    }
    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `)
      .bind(user.id)
      .run();
    const token = uuid();
    const createdAt = Date.now();
    const expiresAt =
      createdAt +
      (30 * 24 * 60 * 60 * 1000);
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
        createdAt,
        expiresAt,
        1
      )
      .run();
    return Response.json({
      success: true,
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error("Login error:", err);
    return Response.json({
      success: false,
      message: err.message
    }, { status: 500 });
  }
}
async function logout(request, env) {
  try {
    const {
      token
    } = await request.json();
    if (!token) {
      return Response.json({
        success: false,
        message: "Token is required."
      }, { status: 400 });
    }
    const session = await env.DB
      .prepare(`
        SELECT token
        FROM sessions
        WHERE token = ?
        LIMIT 1
      `)
      .bind(token)
      .first();
    if (!session) {
      return Response.json({
        success: false,
        message: "Session not found."
      }, { status: 404 });
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
  } catch (err) {
    console.error("Logout error:", err);
    return Response.json({
      success: false,
      message: err.message
    }, { status: 500 });
  }
}
async function verify(request, env) {
  try {
    const {
      token
    } = await request.json();
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
    const user = {
      id: session.id,
      uid: session.id,
      username: session.username,
      email: session.email,
      role: session.role,
      created_at: session.created_at
    };
    return Response.json({
      success: true,
      user
    });
  } catch (err) {
    console.error("Verify error:", err);
    return Response.json({
      success: false,
      message: err.message
    }, { status: 500 });
  }
}
