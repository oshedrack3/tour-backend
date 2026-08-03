const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  secure: true
});

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
  return Buffer.byteLength(data, "base64");
}

async function uploadBase64Image(base64, folder, publicId) {
  if (!base64) return null;
  
  const size = getBase64Size(base64);
  
  if (size > MAX_IMAGE_SIZE) {
    throw new Error("Image size must not exceed 500KB.");
  }
  
  const safePublicId = sanitizePublicId(`${folder}/${publicId}`);
  
  const result = await cloudinary.uploader.upload(base64, {
    public_id: safePublicId,
    overwrite: true,
    resource_type: "image"
  });
  
  return result.secure_url;
}

module.exports = {
  cloudinary,
  uploadBase64Image
};