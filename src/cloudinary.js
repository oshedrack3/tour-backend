const MAX_IMAGE_SIZE = 500 * 1024;

function sanitizePublicId(id) {
  return String(id)
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
    data.endsWith("=") ? 1 :
    0;
  
  return Math.floor(
    (data.length * 3) / 4
  ) - padding;
}

function validateEnvironment(env) {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary configuration is incomplete."
    );
  }
}

function generateSignature(
  publicId,
  timestamp,
  apiSecret
) {
  return crypto.subtle
    .digest(
      "SHA-1",
      new TextEncoder().encode(
        `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
      )
    )
    .then(buffer =>
      Array.from(
        new Uint8Array(buffer)
      )
      .map(byte =>
        byte
        .toString(16)
        .padStart(2, "0")
      )
      .join("")
    );
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
  
  validateEnvironment(env);
  
  if (
    typeof base64 !== "string" ||
    !base64.startsWith("data:image/")
  ) {
    throw new Error(
      "Invalid image data."
    );
  }
  
  const size =
    getBase64Size(base64);
  
  if (size > MAX_IMAGE_SIZE) {
    throw new Error(
      "Image size must not exceed 500KB."
    );
  }
  
  const safePublicId =
    sanitizePublicId(
      `${folder}/${publicId}`
    );
  
  if (!safePublicId) {
    throw new Error(
      "Invalid image identifier."
    );
  }
  
  const timestamp =
    Math.floor(Date.now() / 1000);
  
  const signature =
    await generateSignature(
      safePublicId,
      timestamp,
      env.CLOUDINARY_API_SECRET
    );
  
  const formData =
    new FormData();
  
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
  
  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );
  
  let result;
  
  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      "Invalid response from Cloudinary."
    );
  }
  
  if (!response.ok) {
    throw new Error(
      result.error?.message ||
      "Cloudinary upload failed."
    );
  }
  
  if (
    !result.secure_url ||
    !result.public_id
  ) {
    throw new Error(
      "Cloudinary returned an invalid upload response."
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
    return null;
  }
  
  validateEnvironment(env);
  
  const timestamp =
    Math.floor(Date.now() / 1000);
  
  const signature =
    await generateSignature(
      publicId,
      timestamp,
      env.CLOUDINARY_API_SECRET
    );
  
  const formData =
    new FormData();
  
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
  
  const response =
    await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: "POST",
        body: formData
      }
    );
  
  let result;
  
  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      "Invalid response from Cloudinary."
    );
  }
  
  if (!response.ok) {
    throw new Error(
      result.error?.message ||
      "Cloudinary deletion failed."
    );
  }
  
  return result;
}
