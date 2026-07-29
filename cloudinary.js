const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  secure: true
});

async function uploadBase64Image(base64, folder, publicId) {
  if (!base64) return null;
  
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    public_id: publicId,
    overwrite: true,
    resource_type: "image"
  });
  
  return result.secure_url;
}

module.exports = {
  cloudinary,
  uploadBase64Image
};

