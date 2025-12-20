import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

import { createPaginatedResponse } from 'src/common/utils/function';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { DeleteProductVariantDto } from './dto/delete-product-variant.dto';
import { GetProductBySlugDto } from './dto/get-product-by-slug.dto';
import { GetProductOptionDto } from './dto/get-product-option.dto';
import { GetProductDto } from './dto/get-product.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Res() res: Response, @Query() getProductDto: GetProductDto) {
    try {
      const { page, pageSize } = getProductDto;
      const result = await this.productService.findAll(getProductDto);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin sản phẩm thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin sản phẩm thành công',
        ...createPaginatedResponse(
          { page, pageSize },
          result.total,
          result.products,
        ),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin sản phẩm thất bại ${error?.message ?? error}`,
      });
    }
  }

  @Get('/slug')
  @UseGuards(AuthGuard('jwt'))
  async findBySlug(
    @Res() res: Response,
    @Query() getProductBySlugDto: GetProductBySlugDto,
  ) {
    try {
      const result = await this.productService.findBySlug(getProductBySlugDto);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin sản phẩm thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin sản phẩm thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin sản phẩm thất bại ${error?.message ?? error}`,
      });
    }
  }

  @Get('/product-option')
  @UseGuards(AuthGuard('jwt'))
  async getProductOptions(
    @Res() res: Response,
    @Query() getProductOptionDto: GetProductOptionDto,
  ) {
    try {
      const result = await this.productService.getProductOptions(
        getProductOptionDto.productId,
      );

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin thuộc tính thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin thuộc tính thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin thuộc tính thất bại ${error?.message ?? error}`,
      });
    }
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createProduct(
    @Res() res: Response,
    @Request() request: any,
    @Body() createProductVariantDto: CreateProductVariantDto,
  ) {
    try {
      const result = await this.productService.createVariant({
        createdBy: request.user.userId,
        variables: createProductVariantDto,
      });

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Thêm mới sản phẩm thất bại' });

      return res.status(200).json({
        statusCode: 200,
        message: 'Thêm mới sản phẩm thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Thêm mới sản phẩm thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Post('/product-variant')
  @UseGuards(AuthGuard('jwt'))
  async createProductVariant(
    @Res() res: Response,
    @Request() request: any,
    @Body() createProductVariantDto: CreateProductVariantDto,
  ) {
    try {
      const result = await this.productService.createVariant({
        createdBy: request.user.userId,
        variables: createProductVariantDto,
      });

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Thêm mới biến thể thất bại' });

      return res.status(200).json({
        statusCode: 200,
        message: 'Thêm mới biến thể thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Thêm mới biến thể thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Put()
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Res() res: Response,
    @Request() request: any,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    try {
      const result = await this.productService.update({
        updatedBy: request.user.userId,
        variables: updateProductDto,
      });

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Cập nhật sản phẩm thất bại' });

      return res.status(200).json({
        statusCode: 200,
        message: 'Cập nhật sản phẩm thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Cập nhật sản phẩm thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Put('/product-variant')
  @UseGuards(AuthGuard('jwt'))
  async updateProductVariant(
    @Res() res: Response,
    @Request() request: any,
    @Body() updateProductVariantDto: UpdateProductVariantDto,
  ) {
    try {
      const result = await this.productService.updateVariant({
        updatedBy: request.user.userId,
        variables: updateProductVariantDto,
      });

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Cập nhật biến thể thất bại' });

      return res.status(200).json({
        statusCode: 200,
        message: 'Cập nhật biến thể thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Cập nhật biến thể thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Delete('/product-variant')
  @UseGuards(AuthGuard('jwt'))
  async deleteVariants(
    @Res() res: Response,
    @Body() deleteProductVariantDto: DeleteProductVariantDto,
  ) {
    try {
      const result = await this.productService.deleteVariants(
        deleteProductVariantDto?.variantIds,
      );

      if (!result)
        return res
          .status(401)
          .json({ statusCode: 401, message: 'Xóa biến thể thất bại' });

      return res.status(200).json({
        statusCode: 200,
        message: 'Xóa biến thể thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Xóa biến thể thất bại: ${error?.message ?? error}`,
      });
    }
  }
}
