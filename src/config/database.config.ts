import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const useNeon = configService.get('USE_NEON') === 'true';

  return {
    type: 'postgres',
    host: useNeon
      ? configService.get('DB_HOST')
      : configService.get('DB_HOST_LOCAL'),
    port: configService.get('DB_PORT'),
    username: useNeon
      ? configService.get('DB_USERNAME')
      : configService.get('DB_USERNAME_LOCAL'),
    password: useNeon
      ? configService.get('DB_PASSWORD')
      : configService.get('DB_PASSWORD_LOCAL'),
    database: configService.get('DB_DATABASE'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    autoLoadEntities: true,
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('NODE_ENV') === 'development',
    ...(useNeon && {
      ssl: { rejectUnauthorized: false },
      extra: { ssl: { rejectUnauthorized: false } },
    }),
  };
};
