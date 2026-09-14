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
    "=".repeat(
      (4 - (value.length % 4)) % 4
    );

  const binary = atob(base64);
  const bytes =
    new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}

function concatBytes(...arrays) {
  const length =
    arrays.reduce(
      (total, array) =>
        total + array.length,
      0
    );

  const result =
    new Uint8Array(length);

  let offset = 0;

  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
}

async function importPublicKey(
  key
) {
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

async function importPrivateKey(
  key
) {
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

function pemToArrayBuffer(pem) {
  const base64 =
    pem
      .replace(
        /-----BEGIN PRIVATE KEY-----/,
        ""
      )
      .replace(
        /-----END PRIVATE KEY-----/,
        ""
      )
      .replace(/\s/g, "");

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes.buffer;
}

async function createVapidJwt(
  env,
  audience
) {
  const header = {
    typ: "JWT",
    alg: "ES256"
  };

  const now =
    Math.floor(
      Date.now() / 1000
    );

  const claims = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT
  };

  const encodedHeader =
    base64UrlEncode(
      JSON.stringify(header)
    );

  const encodedClaims =
    base64UrlEncode(
      JSON.stringify(claims)
    );

  const unsignedToken =
    `${encodedHeader}.${encodedClaims}`;

  const privateKey =
    await importPrivateKey(
      pemToArrayBuffer(
        env.VAPID_PRIVATE_KEY
      )
    );

  const signature =
    await crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: "SHA-256"
      },
      privateKey,
      new TextEncoder().encode(
        unsignedToken
      )
    );

  return `${unsignedToken}.${base64UrlEncode(
    new Uint8Array(signature)
  )}`;
}

async function deriveKeys(
  subscription,
  serverKeys
) {
  const clientPublicKey =
    await importPublicKey(
      base64UrlDecode(
        subscription.keys.p256dh
      )
    );

  const sharedSecret =
    await crypto.subtle.deriveBits(
      {
        name: "ECDH",
        public: clientPublicKey
      },
      serverKeys.privateKey,
      256
    );

  const authSecret =
    base64UrlDecode(
      subscription.keys.auth
    );

  const serverPublicKey =
    new Uint8Array(
      await crypto.subtle.exportKey(
        "raw",
        serverKeys.publicKey
      )
    );

  const clientPublicKeyBytes =
    base64UrlDecode(
      subscription.keys.p256dh
    );

  const authInfo =
    new TextEncoder().encode(
      "WebPush: info\0"
    );

  const ikmInfo =
    concatBytes(
      authInfo,
      clientPublicKeyBytes,
      serverPublicKey
    );

  const authKey =
    await crypto.subtle.importKey(
      "raw",
      authSecret,
      "HKDF",
      false,
      ["deriveBits"]
    );

  const prk =
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt:
          new Uint8Array(16),
        info:
          new TextEncoder().encode(
            "auth"
          )
      },
      authKey,
      256
    );

  return {
    sharedSecret:
      new Uint8Array(
        sharedSecret
      ),
    authSecret,
    clientPublicKeyBytes,
    serverPublicKey,
    ikmInfo,
    prk:
      new Uint8Array(prk)
  };
}

async function hkdf(
  ikm,
  salt,
  info,
  length
) {
  const key =
    await crypto.subtle.importKey(
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
    base64UrlDecode(
      subscription.keys.p256dh
    );

  const auth =
    base64UrlDecode(
      subscription.keys.auth
    );

  const clientKey =
    await crypto.subtle.importKey(
      "raw",
      clientPublicKey,
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      false,
      []
    );

  const sharedSecret =
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "ECDH",
          public: clientKey
        },
        serverKeys.privateKey,
        256
      )
    );

  const authKey =
    await crypto.subtle.importKey(
      "raw",
      auth,
      "HKDF",
      false,
      ["deriveBits"]
    );

  const prk =
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: auth,
          info:
            new TextEncoder().encode(
              "WebPush: info\0"
            )
        },
        authKey,
        256
      )
    );

  const keyInfo =
    new TextEncoder().encode(
      "WebPush: info\0"
    );

  const serverPublicKey =
    new Uint8Array(
      await crypto.subtle.exportKey(
        "raw",
        serverKeys.publicKey
      )
    );

  const authInfo =
    concatBytes(
      keyInfo,
      clientPublicKey,
      serverPublicKey
    );

  const ikm =
    await hkdf(
      sharedSecret,
      auth,
      authInfo,
      32
    );

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const cekInfo =
    new TextEncoder().encode(
      "Content-Encoding: aes128gcm\0"
    );

  const nonceInfo =
    new TextEncoder().encode(
      "Content-Encoding: nonce\0"
    );

  const cek =
    await hkdf(
      ikm,
      salt,
      cekInfo,
      16
    );

  const nonce =
    await hkdf(
      ikm,
      salt,
      nonceInfo,
      12
    );

  const plaintext =
    new TextEncoder().encode(
      payload
    );

  const padded =
    concatBytes(
      plaintext,
      new Uint8Array([2])
    );

  const aesKey =
    await crypto.subtle.importKey(
      "raw",
      cek,
      {
        name: "AES-GCM"
      },
      false,
      ["encrypt"]
    );

  const encrypted =
    new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: nonce
        },
        aesKey,
        padded
      )
    );

  const recordSize =
    new Uint8Array([
      0,
      0,
      16,
      0
    ]);

  const body =
    concatBytes(
      salt,
      recordSize,
      serverPublicKey,
      encrypted
    );

  return {
    body,
    salt
  };
}

export async function sendWebPush(
  env,
  subscription,
  payload
) {
  const serverKeys =
    await crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      ["deriveBits"]
    );

  const endpointUrl =
    new URL(
      subscription.endpoint
    );

  const audience =
    `${endpointUrl.protocol}//${endpointUrl.host}`;

  const jwt =
    await createVapidJwt(
      env,
      audience
    );

  const encrypted =
    await encryptPayload(
      subscription,
      payload,
      serverKeys
    );

  const response =
    await fetch(
      subscription.endpoint,
      {
        method: "POST",
        headers: {
          TTL: "60",
          "Content-Type":
            "application/octet-stream",
          "Content-Encoding":
            "aes128gcm",
          Authorization:
            `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`
        },
        body:
          encrypted.body
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    const error =
      new Error(
        `Push service returned ${response.status}: ${text}`
      );

    error.statusCode =
      response.status;

    throw error;
  }

  return true;
}

