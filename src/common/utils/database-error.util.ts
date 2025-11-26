import {
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DATABASE_ERRORS } from '../constant/database-errors.constant';

export function handleDatabaseError(error: any, context: string): never {
  // PostgreSQL errors
  if (error.code) {
    switch (error.code) {
      case DATABASE_ERRORS.UNIQUE_VIOLATION:
        throw new ConflictException('Resource already exists');
      case DATABASE_ERRORS.FOREIGN_KEY_VIOLATION:
        throw new BadRequestException('Invalid reference');
      case DATABASE_ERRORS.NOT_NULL_VIOLATION:
        throw new BadRequestException('Required field is missing');
      case DATABASE_ERRORS.CHECK_VIOLATION:
        throw new BadRequestException('Invalid data');
    }
  }

  // Re-throw NestJS exceptions
  if (
    error instanceof ConflictException ||
    error instanceof BadRequestException
  ) {
    throw error;
  }

  // Default error
  throw new InternalServerErrorException(context);
}
