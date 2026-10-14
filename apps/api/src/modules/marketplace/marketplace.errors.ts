import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  details?: unknown;
  fieldErrors?: unknown;
}

const reasonStatus: Readonly<Record<string, number>> = {
  VALIDATION_FAILED: 400,
  INVALID_LOCALE: 400,
  INVALID_PAGINATION: 400,
  ADMIN_AUTH_REQUIRED: 401,
  USER_AUTH_REQUIRED: 401,
  PERMISSION_DENIED: 403,
  ENTERPRISE_SCOPE_DENIED: 403,
  PROJECT_SCOPE_DENIED: 403,
  ROLE_ESCALATION_DENIED: 403,
  PROTECTED_FIELD_WRITE_DENIED: 403,
  SELF_MEMBERSHIP_CHANGE_DENIED: 403,
  ENTERPRISE_NOT_FOUND: 404,
  PROJECT_NOT_FOUND: 404,
  MEDIA_NOT_FOUND: 404,
  ACTIVITY_NOT_FOUND: 404,
  COMPLETION_NOT_FOUND: 404,
  ENTERPRISE_SLUG_CONFLICT: 409,
  ENTERPRISE_NOT_ACTIVE: 409,
  PROJECT_SLUG_CONFLICT: 409,
  PROJECT_SLUG_IMMUTABLE: 409,
  PROJECT_STATUS_TRANSITION_INVALID: 409,
  PRIMARY_ENTERPRISE_REQUIRED: 409,
  MEDIA_KIND_CONFLICT: 409,
  ACTIVITY_CODE_CONFLICT: 409,
  ACTIVITY_STATUS_TRANSITION_INVALID: 409,
  COMPLETION_DUPLICATE: 409,
  COMPLETION_STATUS_INVALID: 409,
  ACTIVITY_NOT_AWARDABLE: 409,
  ACTIVITY_NOT_STARTED: 409,
  ACTIVITY_ENDED: 409,
  ACTIVITY_AWARD_LIMIT_REACHED: 409,
  AIRS_ALREADY_AWARDED: 409,
  AIRS_ALREADY_REVERSED: 409,
  AIRS_NOT_AWARDED: 409,
  MEDIA_ORDER_INVALID: 400,
  DEFAULT_TRANSLATION_REQUIRED: 422,
  PROJECT_NOT_PUBLISHABLE: 422,
  CATEGORY_UNSUPPORTED: 422,
  MEDIA_URL_INVALID: 422,
  MEDIA_HOST_NOT_ALLOWED: 422,
  MEDIA_ALT_REQUIRED: 422,
  STATUS_REASON_REQUIRED: 422,
  REVERSAL_REASON_REQUIRED: 422,
  AIRS_AMOUNT_OUT_OF_RANGE: 422,
  USER_NOT_ELIGIBLE: 422,
  MARKETPLACE_UNAVAILABLE: 503,
};

export function statusForReason(reasonCode: string): number {
  return reasonStatus[reasonCode] ?? 400;
}

export class MarketplaceApiError extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly fieldErrors?: unknown
  ) {
    super(message, statusForReason(code));
  }
}

export function marketplaceError(code: string, message = code, details?: unknown): never {
  throw new MarketplaceApiError(code, message, details);
}

@Catch()
export class MarketplaceExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();
    const requestId = String(request.id ?? request.headers['x-request-id'] ?? 'unknown');

    if (exception instanceof MarketplaceApiError) {
      void reply.status(exception.getStatus()).send({
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        requestId,
        ...(exception.details === undefined ? {} : { details: exception.details }),
        ...(exception.fieldErrors === undefined ? {} : { fieldErrors: exception.fieldErrors }),
      } satisfies ApiErrorBody);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const rawMessage =
        typeof response === 'object' && response && 'message' in response
          ? (response as { message?: unknown }).message
          : exception.message;
      const fieldErrors = Array.isArray(rawMessage) ? rawMessage : undefined;
      const code =
        status === 401
          ? 'ADMIN_AUTH_REQUIRED'
          : status === 403
          ? 'PERMISSION_DENIED'
          : 'VALIDATION_FAILED';
      void reply.status(status).send({
        statusCode: status,
        code,
        message: Array.isArray(rawMessage) ? 'Request validation failed.' : String(rawMessage),
        requestId,
        ...(fieldErrors ? { fieldErrors } : {}),
      } satisfies ApiErrorBody);
      return;
    }

    void reply.status(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Unexpected marketplace error.',
      requestId,
    } satisfies ApiErrorBody);
  }
}
