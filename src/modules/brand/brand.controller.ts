import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

import { createPaginatedResponse } from 'src/common/utils/function';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { DeleteBrandDto } from './dto/delete-brand.dto';
import { DeleteManyBrandDto } from './dto/delete-many-brand.dto';
import { GetBrandDto } from './dto/get-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';

@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Roles(UserRole.ADMIN)
  // @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll(@Res() res: Response, @Query() getBrandDto: GetBrandDto) {
    try {
      const { page, pageSize } = getBrandDto;
      const result = await this.brandService.findAll(getBrandDto);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin thương hiệu thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin thương hiệu thành công',
        ...createPaginatedResponse(
          { page, pageSize },
          result.total,
          result.brands,
        ),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin thương hiệu thất bại ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @Get('/options')
  async findOptions(@Res() res: Response) {
    try {
      const result = await this.brandService.findOptions();

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin thương hiệu không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin thương hiệu thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin thất bại: ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @Post()
  async createBrand(
    @Res() res: Response,
    @Req() request: any,
    @Body() createBrandDto: CreateBrandDto,
  ) {
    try {
      const result = await this.brandService.create({
        createdBy: request.user.userId,
        variables: createBrandDto,
      });

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Tạo thương hiệu thất bại' });

      return res
        .status(200)
        .json({ statusCode: 200, message: 'Tạo thương hiệu thành công' });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Tạo thương hiệu thất bại ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @Put()
  async updateBrand(
    @Res() res: Response,
    @Request() req: any,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    try {
      const result = await this.brandService.update({
        updatedBy: req.user.userId,
        variables: updateBrandDto,
      });

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Cập nhật thông tin thất bại' });

      return res
        .status(200)
        .json({ statusCode: 200, message: 'Cập nhật thương hiệu thành công' });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Cập nhật thương hiệu thất bại ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @Delete('/many')
  async deleteMany(
    @Res() res: Response,
    @Body() deleteManyBrandDto: DeleteManyBrandDto,
  ) {
    try {
      const affectedCount =
        await this.brandService.deleteMany(deleteManyBrandDto);

      let message = '';
      const totalIds = deleteManyBrandDto.ids.length;

      if (affectedCount === totalIds)
        message = `Xóa thành công ${affectedCount} thương hiệu.`;
      else
        message = `Xóa thành công ${affectedCount} trên tổng số ${totalIds} thương hiệu yêu cầu. Một số ID không tồn tại.`;

      return res.status(200).json({ statusCode: 200, message });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Xóa thương hiệu thất bại: ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteBrand(
    @Res() res: Response,
    @Param() deleteBrandDto: DeleteBrandDto,
  ) {
    try {
      const result = await this.brandService.delete(deleteBrandDto);

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Xóa thương hiệu thất bại' });

      return res
        .status(200)
        .json({ statusCode: 200, message: 'Xóa thương hiệu thành công' });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Xóa thương hiệu thất bại: ${error?.message ?? error}`,
      });
    }
  }
}
