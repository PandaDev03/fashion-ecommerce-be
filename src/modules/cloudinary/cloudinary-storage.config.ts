import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

export const cloudinaryStorageBrandLogo = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'fashion-ecommerce/brand-logos',
      allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 500, height: 500, crop: 'limit' }],
      public_id: `logo-${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

export const cloudinaryStorageImage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'fashion-ecommerce/images',
      allowedFormats: ['jpg', 'png', 'jpeg', 'webp', 'svg'],
      transformation: [{ width: 500, height: 500, crop: 'limit' }],
      public_id: `product-${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

export const cloudinaryStorageAvatar = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'fashion-ecommerce/avatars',
      allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 500, height: 500, crop: 'limit' }],
      public_id: `avatar-${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});
