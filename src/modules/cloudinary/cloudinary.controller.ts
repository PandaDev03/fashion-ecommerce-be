import {
  Controller,
  Post,
  Request,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { cloudinaryStorageBrandLogo, cloudinaryStorageImage } from './cloudinary-storage.config';

@Controller('cloudinary')
export class CloudinaryController {
  constructor() {}

  @Post('/upload/brand-logo')
  @UseInterceptors(
    FilesInterceptor('files', 10, { storage: cloudinaryStorageBrandLogo }),
  )
  async uploadBrandLogo(
    @Res() res: Response,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      if (!files || files.length <= 0)
        return res
          .status(200)
          .json({ message: 'Vui lòng chọn file để tải lên!', statusCode: 200 });

      return res.status(200).json({
        message: 'Tải file thành công!',
        statusCode: 200,
        data: files.map((item) => ({
          url: item.path,
          originFileName: item.originalname,
        })),
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: error?.message ?? error, statusCode: 500 });
    }
  }

  @Post('/upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, { storage: cloudinaryStorageImage }),
  )
  async uploadProductImages(
    @Res() res: Response,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      if (!files || files.length <= 0)
        return res
          .status(200)
          .json({ message: 'Vui lòng chọn file để tải lên!', statusCode: 200 });

      return res.status(200).json({
        message: 'Tải file thành công!',
        statusCode: 200,
        data: files.map((item) => ({
          url: item.path,
          originFileName: item.originalname,
        })),
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: error?.message ?? error, statusCode: 500 });
    }
  }
}
