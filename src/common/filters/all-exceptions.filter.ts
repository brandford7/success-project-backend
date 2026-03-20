import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ThrottlerException } from '@nestjs/throttler';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: any; // ✅ For development-only additional info
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    // ✅ Handle HTTP Exceptions (BadRequestException, NotFoundException, etc.)
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || exception.name;
      }
    }
    // ✅ Handle Rate Limit Exceptions
    else if (exception instanceof ThrottlerException) {
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Too many requests. Please try again later.';
      error = 'Too Many Requests';
    }
    // ✅ Handle TypeORM Query Errors
    else if (exception instanceof QueryFailedError) {
      statusCode = HttpStatus.BAD_REQUEST;
      const dbError = exception as any;

      // PostgreSQL unique constraint violation
      if (dbError.code === '23505') {
        message = 'A record with this value already exists';
        error = 'Duplicate Entry';
      }
      // PostgreSQL foreign key violation
      else if (dbError.code === '23503') {
        message = 'Cannot delete record due to related data';
        error = 'Foreign Key Violation';
      }
      // PostgreSQL not null violation
      else if (dbError.code === '23502') {
        message = 'Required field is missing';
        error = 'Not Null Violation';
      }
      // Generic database error
      else {
        message = 'Database operation failed';
        error = 'Database Error';
      }

      // Log the actual database error for debugging
      this.logger.error('Database error:', dbError.message);
    }
    // ✅ Handle Unknown Errors
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // ✅ Build error response
    const errorResponse: ErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    // ✅ Add minimal debug info in development (NO stack traces)
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.details = {
        name: exception.name,
        // ✅ Only first line of stack (exception type and location)
        // No full file paths exposed
        ...(exception.stack && {
          origin: exception.stack.split('\n')[0]?.trim(),
        }),
      };
    }

    // ✅ Log error with full details (stays on server)
    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${statusCode} - Message: ${
        typeof message === 'string' ? message : JSON.stringify(message)
      }`,
    );

    // ✅ Log full stack trace to server logs only (not sent to client)
    if (exception instanceof Error && exception.stack) {
      this.logger.debug(exception.stack);
    }

    // ✅ Send clean response (no stack traces)
    response.status(statusCode).json(errorResponse);
  }
}
