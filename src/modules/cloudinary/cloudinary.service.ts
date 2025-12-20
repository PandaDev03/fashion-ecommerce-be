import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
    folderName?: string,
  ): Promise<CloudinaryResponse> {
    if (!file)
      throw new InternalServerErrorException('File is missing in the request.');

    return new Promise((resolve, reject) => {
      const folder = folderName || 'images';
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `fashion-ecommerce/${folder}`,
          public_id: `brand_logo_${Date.now()}_${file.originalname.replace(/\s/g, '_')}`,
        },
        (error, result) => {
          if (error) return reject(error);

          if (!result)
            return reject(
              new InternalServerErrorException(
                'Cloudinary did not return a result upon successful upload.',
              ),
            );

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        },
      );

      // Readable.from(file.buffer).pipe(uploadStream);
      const readableStream = Readable.from(file.buffer);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'fashion-ecommerce/images',
  ): Promise<Array<{ url: string; publicId: string }>> {
    // const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    // return await Promise.all(uploadPromises);

    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    const results = await Promise.all(uploadPromises);

    return results.map((res) => ({
      url: res.secure_url,
      publicId: res.public_id,
    }));
  }

  async deleteImage(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
    }
  }
}
