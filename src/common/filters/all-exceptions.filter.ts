import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'internal_error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (status === HttpStatus.BAD_REQUEST) {
        message = this.extractValidationMessage(res) || 'validation_error';
      } else if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
        message = this.extractValidationMessage(res) || 'unprocessable_entity';
      } else if (status === HttpStatus.REQUEST_TIMEOUT) {
        message = 'request_timed_out';
      } else {
        message = this.extractValidationMessage(res) || 'internal_error';
      }
    }

    if (status >= 500) {
      this.logger.error(
        `Exception caught: status=${status} message=${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`status=${status} ${message}`);
    }

    response.status(status).json({ error: message });
  }

  private extractValidationMessage(res: unknown): string | null {
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>;
      if (typeof obj.message === 'string') return obj.message;
      if (Array.isArray(obj.message)) return (obj.message as string[]).join('; ');
    }
    return null;
  }
}
