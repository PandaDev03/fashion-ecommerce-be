import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

import { createPaginatedResponse } from 'src/common/utils/function';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { DeleteCategoryDto } from './dto/delete-category.dto';
import { DeleteManyCategoryDto } from './dto/delete-many-category.dto';
import { GetCategoryDto } from './dto/get-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Res() res: Response, @Query() getCategoryDto: GetCategoryDto) {
    try {
      const { page, pageSize } = getCategoryDto;
      const result = await this.categoryService.findAll(getCategoryDto);

      if (!result) throw new UnauthorizedException();

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin danh mục thành công',
        ...createPaginatedResponse(
          { page, pageSize },
          result.total,
          result.categories,
        ),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Get('/parents')
  @UseGuards(AuthGuard('jwt'))
  async findAllParents(@Res() res: Response) {
    try {
      const result = await this.categoryService.findAllParents();

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin danh mục không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin danh mục thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Get('/options')
  @UseGuards(AuthGuard('jwt'))
  async findOptions(@Res() res: Response) {
    try {
      const result = await this.categoryService.findOptions();

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin danh mục không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin danh mục thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Res() res: Response,
    @Request() request: any,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    try {
      const result = await this.categoryService.create({
        createdBy: request.user.userId,
        variables: createCategoryDto,
      });

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Tạo danh mục không thành công',
        });

      return res
        .status(200)
        .json({ statusCode: 200, message: 'Tạo danh mục thành công' });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Tạo mới danh mục thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Put()
  @UseGuards(AuthGuard('jwt'))
  async updateCategory(
    @Res() res: Response,
    @Request() request: any,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    try {
      const result = await this.categoryService.update({
        updatedBy: request.user.userId,
        variables: updateCategoryDto,
      });

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Cập nhật danh mục thất bại' });

      return res
        .status(200)
        .json({ statusCode: 200, message: 'Cập nhật danh mục thành công' });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Cập nhật danh mục thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Delete('/many')
  @UseGuards(AuthGuard('jwt'))
  async deleteMany(
    @Res() res: Response,
    @Body() deleteManyCategoryDto: DeleteManyCategoryDto,
  ) {
    try {
      const affectedCount = await this.categoryService.deleteMany(
        deleteManyCategoryDto,
      );

      let message = '';
      const totalIds = deleteManyCategoryDto.ids.length;

      if (affectedCount === totalIds)
        message = `Xóa thành công ${affectedCount} danh mục.`;
      else
        message = `Xóa thành công ${affectedCount} trên tổng số ${totalIds} danh mục yêu cầu. Một số ID không tồn tại.`;

      return res.status(200).json({ statusCode: 200, message });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Xóa danh mục thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteCategory(
    @Res() res: Response,
    @Param() deleteCategoryDto: DeleteCategoryDto,
  ) {
    try {
      const result = await this.categoryService.delete(deleteCategoryDto.id);

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Xóa danh mục thất bại' });

      return res
        .status(200)
        .json({ statusCode: 200, message: 'Xóa danh mục thành công' });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin thất bại: ${error?.message ?? error}`,
      });
    }
  }
}
