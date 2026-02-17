import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Direct upload helper
export const uploadToCloudinary = async (file) => {
  try {

    // ✅ Detect base64 PDF
    let uploadData = file;

    if (!file.startsWith("data:")) {
      uploadData = `data:application/pdf;base64,${file}`;
    }

    const result = await cloudinary.uploader.upload(uploadData, {
      folder: 'school-management/invoices',
      resource_type: 'raw', // IMPORTANT for PDF
    });

    return {
      url: result.secure_url,
      public_id: result.public_id
    };

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('File upload failed');
  }
};


// Delete from cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

export default cloudinary;