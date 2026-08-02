const { v2: cloudinary } = require("cloudinary");

console.log("CLOUDINARY_URL =", process.env.CLOUDINARY_URL);
cloudinary.config({
  secure: true
});

function sanitizePublicId(id) {
  return id
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_\/]/g, "") 
    .slice(0, 200);
}

async function uploadBase64Image(base64, folder, publicId) {
  if (!base64) return null;
  
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