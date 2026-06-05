import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ApiErrorResponse {
  success: false;
  statusCode: number;
  data: null;
  message: string;
  error: string | null;
  path: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let error: string | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const typedResponse = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(typedResponse.message)) {
          message = typedResponse.message.join(', ');
        } else if (typeof typedResponse.message === 'string') {
          message = typedResponse.message;
        }

        if (typeof typedResponse.error === 'string') {
          error = typedResponse.error;
        }
      }
    }

    const payload: ApiErrorResponse = {
      success: false,
      statusCode,
      data: null,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(payload);
  }
}
