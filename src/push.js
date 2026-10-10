function base64UrlEncode(data) {
  const bytes =
    data instanceof Uint8Array
      ? data
      : new TextEncoder().encode(data);

  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const base64 =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function concatBytes(...arrays) {
  const length = arrays.reduce(
    (total, array) => total + array.length,
    0
  );

  const result = new Uint8Array(length);
  let offset = 0;

  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

async function importPublicKey(key) {
  return await crypto.subtle.importKey(
    "raw",
    key,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    []
  );
}

async function importPrivateKey(key) {
  return await crypto.subtle.importKey(
    "pkcs8",
    key,
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    false,
    ["sign"]
  );
}

async function createVapidJwt(env, audience) {
  if (
    !env.VAPID_PRIVATE_KEY ||
    !env.VAPID_PUBLIC_KEY ||
    !env.VAPID_SUBJECT
  ) {
    throw new Error("Missing VAPID configuration.");
  }

  const header = {
    typ: "JWT",
    alg: "ES256"
  };

  const now = Math.floor(Date.now() / 1000);

  const claims = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT
  };

  const encodedHeader = base64UrlEncode(
    JSON.stringify(header)
  );

  const encodedClaims = base64UrlEncode(
    JSON.stringify(claims)
  );

  const unsignedToken =
    `${encodedHeader}.${encodedClaims}`;

  const privateKey = await importPrivateKey(
    pemToArrayBuffer(env.VAPID_PRIVATE_KEY)
  );

  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256"
    },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  return `${unsignedToken}.${base64UrlEncode(
    new Uint8Array(signature)
  )}`;
}

async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey(
    "raw",
    ikm,
    "HKDF",
    false,
    ["deriveBits"]
  );

  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt,
        info
      },
      key,
      length * 8
    )
  );
}

async function encryptPayload(
  subscription,
  payload,
  serverKeys
) {
  const clientPublicKey =
    base64UrlDecode(subscription.keys.p256dh);

  const authSecret =
    base64UrlDecode(subscription.keys.auth);

  if (
    clientPublicKey.length !== 65 ||
    authSecret.length === 0
  ) {
    throw new Error(
      "Invalid push subscription encryption keys."
    );
  }

  const clientKey = await importPublicKey(
    clientPublicKey
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "ECDH",
        public: clientKey
      },
      serverKeys.privateKey,
      256
    )
  );

  const serverPublicKey = new Uint8Array(
    await crypto.subtle.exportKey(
      "raw",
      serverKeys.publicKey
    )
  );

  const authInfo = concatBytes(
    new TextEncoder().encode("WebPush: info\0"),
    clientPublicKey,
    serverPublicKey
  );

  const ikm = await hkdf(
    sharedSecret,
    authSecret,
    authInfo,
    32
  );

  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const cek = await hkdf(
    ikm,
    salt,
    new TextEncoder().encode(
      "Content-Encoding: aes128gcm\0"
    ),
    16
  );

  const nonce = await hkdf(
    ikm,
    salt,
    new TextEncoder().encode(
      "Content-Encoding: nonce\0"
    ),
    12
  );

  const plaintext = new TextEncoder().encode(
    payload
  );

  const padded = concatBytes(
    plaintext,
    new Uint8Array([2])
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    {
      name: "AES-GCM"
    },
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: nonce,
        tagLength: 128
      },
      aesKey,
      padded
    )
  );

  const recordSize = new Uint8Array([
    0,
    0,
    16,
    0
  ]);

  const keyIdLength = new Uint8Array([
    serverPublicKey.length
  ]);

  const body = concatBytes(
    salt,
    recordSize,
    keyIdLength,
    serverPublicKey,
    encrypted
  );

  return {
    body
  };
}

export async function sendWebPush(
  env,
  subscription,
  payload
) {
  try {
    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      throw new Error(
        "Invalid push subscription."
      );
    }

    const endpointUrl = new URL(
      subscription.endpoint
    );

    if (
      endpointUrl.protocol !== "https:"
    ) {
      throw new Error(
        "Push endpoint must use HTTPS."
      );
    }

    const serverKeys =
      await crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256"
        },
        true,
        ["deriveBits"]
      );

    const audience =
      `${endpointUrl.protocol}//${endpointUrl.host}`;

    const jwt = await createVapidJwt(
      env,
      audience
    );

    const encrypted = await encryptPayload(
      subscription,
      payload,
      serverKeys
    );

    const response = await fetch(
      subscription.endpoint,
      {
        method: "POST",
        headers: {
          TTL: "86400",
          "Content-Type":
            "application/octet-stream",
          "Content-Encoding":
            "aes128gcm",
          Authorization:
            `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`
        },
        body: encrypted.body
      }
    );

    if (!response.ok) {
      const responseText =
        await response.text();

      const error = new Error(
        `Push service returned ${response.status}: ${responseText}`
      );

      error.statusCode = response.status;

      throw error;
    }

    return true;

  } catch (error) {
    console.error(
      "Web Push delivery error:",
      {
        message: error.message,
        statusCode: error.statusCode
      }
    );

    throw error;
  }
}