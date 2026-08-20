import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const { error, message } = this.resolveErrorBody(
      exception,
      isHttpException,
    );
    const isProduction = process.env.NODE_ENV === 'production';

    const isServerError = status >= 500;

    if (isServerError) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} ${status} — ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error: isServerError && isProduction ? 'Internal Server Error' : error,
      message:
        isServerError && isProduction ? 'Internal server error' : message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveErrorBody(
    exception: unknown,
    isHttpException: boolean,
  ): { error: string; message: string | string[] } {
    if (!isHttpException) {
      return {
        error: 'Internal Server Error',
        message:
          exception instanceof Error
            ? exception.message
            : 'Internal server error',
      };
    }

    const httpException = exception as HttpException;
    const exceptionResponse = httpException.getResponse();

    if (typeof exceptionResponse === 'string') {
      return { error: httpException.name, message: exceptionResponse };
    }

    const body = exceptionResponse as Record<string, unknown>;
    const message =
      (body.message as string | string[] | undefined) ?? httpException.message;
    const error =
      (typeof body.error === 'string' ? body.error : undefined) ??
      httpException.name;

    return { error, message };
  }
}
