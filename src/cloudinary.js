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
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );
  
  const result =
    await response.json();
  
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
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
    {
      method: "POST",
      body: formData
    }
  );
  
  const result =
    await response.json();
  
  if (!response.ok) {
    throw new Error(
      result.error?.message ||
      "Cloudinary deletion failed."
    );
  }
  
  return result;
}
