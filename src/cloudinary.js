const MAX_IMAGE_SIZE = 500 * 1024;

function sanitizePublicId(id) {
  return id
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_\/]/g, "")
    .slice(0, 200);
}

function getBase64Size(base64) {
  const data = base64.split(",")[1] || "";

  const padding =
    data.endsWith("==") ? 2 :
    data.endsWith("=") ? 1 : 0;

  return Math.floor(
    (data.length * 3) / 4
  ) - padding;
}

export async function uploadBase64Image(
  base64,
  folder,
  publicId,
  env
) {
  if (!base64) {
    return null;
  }

  console.log("Cloudinary configuration check:", {
    cloudNameExists: !!env.CLOUDINARY_CLOUD_NAME,
    cloudNameLength:
      env.CLOUDINARY_CLOUD_NAME
        ? env.CLOUDINARY_CLOUD_NAME.length
        : 0,
    cloudNamePreview:
      env.CLOUDINARY_CLOUD_NAME
        ? env.CLOUDINARY_CLOUD_NAME.slice(0, 3) + "***"
        : null,

    apiKeyExists: !!env.CLOUDINARY_API_KEY,
    apiSecretExists: !!env.CLOUDINARY_API_SECRET
  });

  const size = getBase64Size(base64);

  if (size > MAX_IMAGE_SIZE) {
    throw new Error(
      "Image size must not exceed 500KB."
    );
  }

  const safePublicId =
    sanitizePublicId(
      `${folder}/${publicId}`
    );

  const timestamp =
    Math.floor(Date.now() / 1000);

  const signatureString =
    `public_id=${safePublicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;

  const signatureBuffer =
    await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(
        signatureString
      )
    );

  const signature =
    Array.from(
      new Uint8Array(signatureBuffer)
    )
      .map(byte =>
        byte.toString(16).padStart(2, "0")
      )
      .join("");

  const formData = new FormData();

  formData.append(
    "file",
    base64
  );

  formData.append(
    "api_key",
    env.CLOUDINARY_API_KEY
  );

  formData.append(
    "timestamp",
    String(timestamp)
  );

  formData.append(
    "public_id",
    safePublicId
  );

  formData.append(
    "signature",
    signature
  );

  const cloudName =
    env.CLOUDINARY_CLOUD_NAME;

  console.log(
    "Cloudinary upload URL:",
    cloudName
      ? `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
      : "CLOUDINARY_CLOUD_NAME IS MISSING"
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const result =
    await response.json();

  console.log(
    "Cloudinary response:",
    {
      status: response.status,
      ok: response.ok,
      error: result.error?.message || null
    }
  );

  if (!response.ok) {
    throw new Error(
      result.error?.message ||
      "Cloudinary upload failed."
    );
  }

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
}

export async function deleteCloudinaryImage(
  publicId,
  env
) {
  if (!publicId) {
    return;
  }

  console.log("Cloudinary delete configuration check:", {
    cloudNameExists: !!env.CLOUDINARY_CLOUD_NAME,
    cloudNameLength:
      env.CLOUDINARY_CLOUD_NAME
        ? env.CLOUDINARY_CLOUD_NAME.length
        : 0,
    apiKeyExists: !!env.CLOUDINARY_API_KEY,
    apiSecretExists: !!env.CLOUDINARY_API_SECRET
  });

  const timestamp =
    Math.floor(Date.now() / 1000);

  const signatureString =
    `public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;

  const signatureBuffer =
    await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(
        signatureString
      )
    );

  const signature =
    Array.from(
      new Uint8Array(signatureBuffer)
    )
      .map(byte =>
        byte.toString(16).padStart(2, "0")
      )
      .join("");

  const formData = new FormData();

  formData.append(
    "public_id",
    publicId
  );

  formData.append(
    "timestamp",
    String(timestamp)
  );

  formData.append(
    "api_key",
    env.CLOUDINARY_API_KEY
  );

  formData.append(
    "signature",
    signature
  );

  const cloudName =
    env.CLOUDINARY_CLOUD_NAME;

  console.log(
    "Cloudinary delete URL:",
    cloudName
      ? `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`
      : "CLOUDINARY_CLOUD_NAME IS MISSING"
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: "POST",
      body: formData
    }
  );

  const result =
    await response.json();

  console.log(
    "Cloudinary delete response:",
    {
      status: response.status,
      ok: response.ok,
      error: result.error?.message || null
    }
  );

  if (!response.ok) {
    throw new Error(
      result.error?.message ||
      "Cloudinary deletion failed."
    );
  }

  return result;
}
