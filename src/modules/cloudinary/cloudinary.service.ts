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

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
