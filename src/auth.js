import { v4 as uuid } from "uuid";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server";

export async function handleAuthRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  
  if (request.method === "POST" && pathname === "/auth/register") {
    return await register(request, env);
  }
  
  if (request.method === "POST" && pathname === "/auth/login") {
    return await login(request, env);
  }
  
  if (
  request.method === "POST" &&
  pathname === "/auth/reset-password"
) {
  return await resetPassword(request, env);
}
  if (request.method === "POST" && pathname === "/auth/logout") {
    return await logout(request, env);
  }
  
  if (request.method === "POST" && pathname === "/auth/verify") {
    return await verify(request, env);
  }
  
    if (
    request.method === "POST" &&
    pathname === "/auth/passkey/register-options"
  ) {
    return await passkeyRegisterOptions(request, env);
  }
  
  if (
    request.method === "POST" &&
    pathname === "/auth/passkey/register-verify"
  ) {
    return await passkeyRegisterVerify(request, env);
  }
  
  if (
    request.method === "POST" &&
    pathname === "/auth/passkey/login-options"
  ) {
    return await passkeyLoginOptions(request, env);
  }
  
  if (
    request.method === "POST" &&
    pathname === "/auth/passkey/login-verify"
  ) {
    return await passkeyLoginVerify(request, env);
  }
  
  return Response.json(
  {
    success: false,
    message: "Auth route not found."
  }, { status: 404 });
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
        message: "Username, email, phone and password are required."
      },
      {
        status: 400
      });
    }
    
    if (
      !["admin", "player"].includes(
        role
      )
    ) {
      return Response.json(
      {
        success: false,
        message: "Invalid role."
      },
      {
        status: 400
      });
    }
    
    if (
      password.length < 6
    ) {
      return Response.json(
      {
        success: false,
        message: "Password must be at least 6 characters."
      },
      {
        status: 400
      });
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
          message: "Username already exists."
        },
        {
          status: 409
        });
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
          message: "Email already exists."
        },
        {
          status: 409
        });
      }
      
      return Response.json(
      {
        success: false,
        message: "Unable to create account. Please try again."
      },
      {
        status: 500
      });
    }
    
    return Response.json(
    {
      success: true,
      message: "Account created successfully.",
      user: {
        id,
        username,
        email,
        phone,
        role,
        created_at: createdAt
      }
    },
    {
      status: 201
    });
    
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );
    
    return Response.json(
    {
      success: false,
      message: "Registration failed. Please try again."
    },
    {
      status: 500
    });
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
      return Response.json({
        success: false,
        title: "Account Not Found",
        message: "No account exists with these login details."
      }, { status: 404 });
    }
    const validPassword = await verifyPassword(
      password,
      user.password_hash
    );
    if (!validPassword) {
      return Response.json({
        success: false,
        title: "Invalid Password",
        message: "The Password is incorrect, Please check and try again."
      }, { status: 401 });
    }
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
    return Response.json({
      success: false,
      message: error.message || "Login failed."
    }, { status: 500 });
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
      }, { status: 400 });
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
    }, { status: 500 });
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
      return Response.json(
      {
        success: false,
        message: "Invalid session."
      }, { status: 401 });
    }
    
    if (!Number(session.active)) {
      return Response.json(
      {
        success: false,
        message: "Session inactive."
      }, { status: 401 });
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
      }, { status: 401 });
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
    }, { status: 500 });
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


async function resetPassword(request, env) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    if (!email || !phone || !password) {
      return Response.json({
        success: false,
        message: "Email, phone number and new password are required."
      }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({
        success: false,
        message: "Password must be at least 6 characters."
      }, { status: 400 });
    }
    const user = await env.DB
      .prepare(`
        SELECT id
        FROM users
        WHERE LOWER(email) = ?
          AND phone = ?
        LIMIT 1
      `)
      .bind(email, phone)
      .first();
    if (!user) {
      return Response.json({
        success: false,
        message: "The email address and phone number do not match an account."
      }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    await env.DB
      .prepare(`
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
      `)
      .bind(passwordHash, user.id)
      .run();
    await env.DB
      .prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `)
      .bind(user.id)
      .run();
    return Response.json({
      success: true,
      message: "Password reset successfully. Please log in with your new password."
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return Response.json({
      success: false,
      message: "Unable to reset password. Please try again."
    }, { status: 500 });
  }
}



async function passkeyRegisterOptions(request, env) {
  try {
    const body = await request.json();
    const user = await getPasskeySessionUser(request, env, body.token);

    if (!user) {
      return Response.json({
        success: false,
        message: "Please log in before registering a passkey."
      }, { status: 401 });
    }

    const rpID = env.RP_ID;
    const rpName = env.RP_NAME || "Galatico eSport";

    if (!rpID) {
      return Response.json({
        success: false,
        message: "Passkey configuration is incomplete."
      }, { status: 500 });
    }

    const existing = await env.DB.prepare(`
      SELECT credential_id, transports
      FROM passkey_credentials
      WHERE user_id = ?
    `).bind(user.id).all();

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.username,
      userDisplayName: user.username,
      attestationType: "none",
      excludeCredentials: (existing.results || []).map(item => ({
        id: item.credential_id,
        transports: parseTransports(item.transports)
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required"
      },
      supportedAlgorithmIDs: [-7, -257]
    });

    const now = Date.now();
    const challengeId = uuid();

    await env.DB.prepare(`
      DELETE FROM passkey_challenges
      WHERE user_id = ?
        AND purpose = 'register'
    `).bind(user.id).run();

    await env.DB.prepare(`
      INSERT INTO passkey_challenges (
        id, user_id, challenge, purpose, created_at, expires_at
      )
      VALUES (?, ?, ?, 'register', ?, ?)
    `).bind(
      challengeId,
      user.id,
      options.challenge,
      now,
      now + 5 * 60 * 1000
    ).run();

    return Response.json({
      success: true,
      challengeId,
      options
    });
  } catch (error) {
    console.error("Passkey registration options error:", error);

    return Response.json({
      success: false,
      message: "Unable to start passkey registration."
    }, { status: 500 });
  }
}

async function passkeyRegisterVerify(request, env) {
  try {
    const body = await request.json();
    const user = await getPasskeySessionUser(request, env, body.token);

    if (!user) {
      return Response.json({
        success: false,
        message: "Please log in before registering a passkey."
      }, { status: 401 });
    }

    const challengeId = String(body.challengeId || "");
    const response = body.response;

    if (!challengeId || !response) {
      return Response.json({
        success: false,
        message: "Passkey verification details are missing."
      }, { status: 400 });
    }

    const challengeRecord = await env.DB.prepare(`
      SELECT id, challenge
      FROM passkey_challenges
      WHERE id = ?
        AND user_id = ?
        AND purpose = 'register'
        AND expires_at > ?
      LIMIT 1
    `).bind(
      challengeId,
      user.id,
      Date.now()
    ).first();

    if (!challengeRecord) {
      return Response.json({
        success: false,
        message: "The registration request expired. Please try again."
      }, { status: 400 });
    }

    const rpID = env.RP_ID;
    const expectedOrigin = `https://${rpID}`;

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true
    });

    await env.DB.prepare(`
      DELETE FROM passkey_challenges
      WHERE id = ?
    `).bind(challengeId).run();

    if (!verification.verified || !verification.registrationInfo) {
      return Response.json({
        success: false,
        message: "Passkey verification failed."
      }, { status: 400 });
    }

    const credential = verification.registrationInfo.credential;
    const credentialId = credential.id;
    const publicKey = uint8ArrayToBase64Url(credential.publicKey);
    const counter = credential.counter;
    const transports = JSON.stringify(
      response.response?.transports || []
    );

    await env.DB.prepare(`
      INSERT INTO passkey_credentials (
        id,
        user_id,
        credential_id,
        public_key,
        counter,
        transports,
        device_name,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uuid(),
      user.id,
      credentialId,
      publicKey,
      counter,
      transports,
      String(body.deviceName || "Passkey").slice(0, 100),
      Date.now()
    ).run();

    return Response.json({
      success: true,
      message: "Passkey registered successfully."
    });
  } catch (error) {
    console.error("Passkey registration verification error:", error);

    const message = String(error?.message || "").toLowerCase();

    if (
      message.includes("unique constraint") ||
      message.includes("already exists")
    ) {
      return Response.json({
        success: false,
        message: "This passkey is already registered."
      }, { status: 409 });
    }

    return Response.json({
      success: false,
      message: "Unable to verify the passkey. Please try again."
    }, { status: 400 });
  }
}

async function passkeyLoginOptions(request, env) {
  try {
    const options = await generateAuthenticationOptions({
      rpID: env.RP_ID,
      userVerification: "required"
    });
    
    const challengeId = uuid();
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000;
    
    await env.DB.prepare(`
      INSERT INTO passkey_challenges (
        id,
        user_id,
        challenge,
        purpose,
        created_at,
        expires_at
      )
      VALUES (?, NULL, ?, 'login', ?, ?)
    `).bind(
      challengeId,
      options.challenge,
      now,
      expiresAt
    ).run();
    
    return Response.json({
      success: true,
      challengeId,
      options
    });
  } catch (error) {
    console.error("Passkey login options error:", error);
    
    return Response.json({
      success: false,
      message: "Unable to start biometric login."
    }, {
      status: 500
    });
  }
}
async function passkeyLoginVerify(request, env) {
  try {
    const body = await request.json();
    if (!body.challengeId || !body.response?.id) {
      return Response.json({
        success: false,
        message: "Invalid biometric authentication response."
      }, { status: 400 });
    }
    const now = Date.now();
    const challenge = await env.DB.prepare(`
      SELECT id, challenge
      FROM passkey_challenges
      WHERE id = ?
        AND purpose = 'login'
        AND expires_at > ?
        AND user_id IS NULL
      LIMIT 1
    `).bind(
      body.challengeId,
      now
    ).first();
    if (!challenge) {
      return Response.json({
        success: false,
        message: "Authentication expired. Please try again."
      }, { status: 400 });
    }
    const passkey = await env.DB.prepare(`
      SELECT
        id,
        user_id,
        credential_id,
        public_key,
        counter,
        transports
      FROM passkey_credentials
      WHERE credential_id = ?
      LIMIT 1
    `).bind(
      body.response.id
    ).first();
    if (!passkey) {
      return Response.json({
        success: false,
        message: "Passkey not recognized. Please sign in with your password."
      }, { status: 401 });
    }
    await env.DB.prepare(`
      DELETE FROM passkey_challenges
      WHERE id = ?
    `).bind(
      body.challengeId
    ).run();
    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: `https://${env.RP_ID}`,
      expectedRPID: env.RP_ID,
      credential: {
        id: passkey.credential_id,
        publicKey: base64UrlToUint8Array(passkey.public_key),
        counter: Number(passkey.counter),
        transports: parseTransports(passkey.transports)
      },
      requireUserVerification: true
    });
    if (!verification.verified) {
      return Response.json({
        success: false,
        message: "Biometric authentication failed."
      }, { status: 401 });
    }
    const user = await env.DB.prepare(`
      SELECT *
      FROM users
      WHERE id = ?
      LIMIT 1
    `).bind(
      passkey.user_id
    ).first();
    if (!user) {
      return Response.json({
        success: false,
        message: "Account not found."
      }, { status: 404 });
    }
    const updatedCounter = verification.authenticationInfo.newCounter;
    const currentTime = Date.now();
    await env.DB.prepare(`
      UPDATE passkey_credentials
      SET counter = ?,
          last_used_at = ?
      WHERE id = ?
    `).bind(
      updatedCounter,
      currentTime,
      passkey.id
    ).run();
    const token = uuid();
    const expiresAt = currentTime + 30 * 24 * 60 * 60 * 1000;
    await env.DB.prepare(`
      INSERT INTO sessions (
        token,
        user_id,
        created_at,
        expires_at,
        active
      )
      VALUES (?, ?, ?, ?, 1)
    `).bind(
      token,
      user.id,
      currentTime,
      expiresAt
    ).run();
    const {
      password_hash,
      ...safeUser
    } = user;
    return Response.json({
      success: true,
      token,
      user: safeUser
    });
  } catch (error) {
    console.error("Passkey login verification error:", error);
    return Response.json({
      success: false,
      message: "Biometric login failed. Please try again."
    }, { status: 500 });
  }
}

async function getPasskeySessionUser(request, env, bodyToken) {
  const authorization = request.headers.get("Authorization") || "";
  const headerToken = authorization.replace(/^Bearer\s+/i, "").trim();
  const token = headerToken || String(bodyToken || "").trim();

  if (!token) {
    return null;
  }

  const now = Date.now();

  const session = await env.DB.prepare(`
    SELECT
      u.id,
      u.username,
      u.email,
      u.role
    FROM sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
      AND s.active = 1
      AND s.expires_at > ?
    LIMIT 1
  `).bind(token, now).first();

  return session || null;
}

function parseTransports(value) {
  try {
    const parsed = JSON.parse(value || "[]");

    return Array.isArray(parsed)
      ? parsed.filter(item => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function uint8ArrayToBase64Url(value) {
  const bytes = new Uint8Array(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToUint8Array(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}