import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export const RESPONSE_MESSAGE_KEY = 'response_message';

interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  message: string;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface PaginatedPayload<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const response = context.switchToHttp().getResponse();

    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      'Operacao realizada com sucesso';

    return next.handle().pipe(
      map((data) => {
        if (this.isPaginatedPayload(data)) {
          const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

          return {
            success: true,
            statusCode: response?.statusCode ?? HttpStatus.OK,
            data: data.items as unknown as T,
            message,
            meta: {
              page: data.page,
              pageSize: data.pageSize,
              total: data.total,
              totalPages,
            },
          };
        }

        return {
          success: true,
          statusCode: response?.statusCode ?? HttpStatus.OK,
          data,
          message,
        };
      }),
    );
  }

  private isPaginatedPayload(
    value: unknown,
  ): value is PaginatedPayload<unknown> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as Partial<PaginatedPayload<unknown>>;

    return (
      Array.isArray(candidate.items) &&
      typeof candidate.page === 'number' &&
      typeof candidate.pageSize === 'number' &&
      typeof candidate.total === 'number'
    );
  }
}
