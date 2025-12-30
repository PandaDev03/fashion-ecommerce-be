import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { CloudinaryConfig } from './modules/cloudinary/cloudinary.config';

import { RolesGuard } from './common/guards/role.guard';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { BrandModule } from './modules/brand/brand.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoryModule } from './modules/category/category.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { MailModule } from './modules/mail/mail.module';
import { OrderDetailsModule } from './modules/order-details/order-details.module';
import { OrderModule } from './modules/order/order.module';
import { ProductViewHistoryModule } from './modules/product-view-history/product-view-history.module';
import { ProductModule } from './modules/product/product.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    CategoryModule,
    ProductModule,
    BrandModule,
    CloudinaryModule,
    CartModule,
    OrderModule,
    OrderDetailsModule,
    MailModule,
    ProductViewHistoryModule,
    RecommendationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CloudinaryConfig,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
