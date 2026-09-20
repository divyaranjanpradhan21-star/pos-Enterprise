import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  instance: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected internal error occurred.';
    let code = 'INTERNAL_ERROR';
    let errors: Record<string, string[]> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        detail = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        detail = (obj['message'] as string) || exception.message;
        title = (obj['error'] as string) || exception.name;
        code = (obj['code'] as string) || this.mapStatusToCode(status);
        if (Array.isArray(obj['message'])) {
          errors = { validation: obj['message'] as string[] };
          detail = 'One or more validation constraints failed.';
        }
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      if (exception.message.includes('VERSION_CONFLICT')) {
        status = HttpStatus.CONFLICT;
        title = 'Version Conflict';
        code = 'VERSION_CONFLICT';
      }
    }

    const problem: ProblemDetails = {
      type: `https://api.pos-enterprise.com/errors/${code.toLowerCase().replace(/_/g, '-')}`,
      title,
      status,
      detail,
      code,
      instance: request.url,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    };

    response.status(status).contentType('application/problem+json').json(problem);
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'VERSION_CONFLICT';
      default:
        return 'SERVER_ERROR';
    }
  }
}
