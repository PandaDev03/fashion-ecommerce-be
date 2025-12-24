import {
  Controller,
  Post,
  Request,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import {
  cloudinaryStorageAvatar,
  cloudinaryStorageBrandLogo,
  cloudinaryStorageImage,
} from './cloudinary-storage.config';

@Controller('cloudinary')
export class CloudinaryController {
  constructor() {}

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

  @Post('/upload/avatar')
  @UseInterceptors(
    FileInterceptor('file', { storage: cloudinaryStorageAvatar }),
  )
  async uploadAvatar(
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file)
        return res
          .status(200)
          .json({ message: 'Vui lòng chọn file để tải lên!', statusCode: 200 });

      return res.status(200).json({
        message: 'Tải avatar thành công!',
        statusCode: 200,
        data: {
          url: file.path,
          originFileName: file.originalname,
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: error?.message ?? error, statusCode: 500 });
    }
  }

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
}
