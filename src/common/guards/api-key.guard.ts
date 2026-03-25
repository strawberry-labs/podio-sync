import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ApiAccess, REQUIRED_ACCESS_KEY } from '../decorators/api-access.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    const fullAccessKey = this.configService.get<string>('SHARED_SECRET');
    const readOnlyKey = this.configService.get<string>('API_KEY_READ_ONLY');

    if (!fullAccessKey) {
      this.logger.error('SHARED_SECRET not configured in environment');
      throw new UnauthorizedException('Server configuration error');
    }

    if (!apiKey) {
      this.logger.warn(`Missing API key from ${request.ip}`);
      throw new UnauthorizedException('API key is required');
    }

    // Determine caller's access tier
    let callerAccess: ApiAccess;
    if (apiKey === fullAccessKey) {
      callerAccess = ApiAccess.FULL_ACCESS;
    } else if (readOnlyKey && apiKey === readOnlyKey) {
      callerAccess = ApiAccess.READ_ONLY;
    } else {
      this.logger.warn(`Invalid API key attempt from ${request.ip}`);
      throw new UnauthorizedException('Invalid API key');
    }

    // Check endpoint's required access level (defaults to FULL_ACCESS)
    const requiredAccess = this.reflector.getAllAndOverride<ApiAccess>(
      REQUIRED_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? ApiAccess.FULL_ACCESS;

    if (requiredAccess === ApiAccess.FULL_ACCESS && callerAccess === ApiAccess.READ_ONLY) {
      this.logger.warn(`Read-only key attempted write operation: ${request.method} ${request.path}`);
      throw new ForbiddenException('Read-only API key cannot access this endpoint');
    }

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    // Check X-API-Key header (preferred)
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return Array.isArray(headerKey) ? headerKey[0] : headerKey;
    }

    // Fallback: Check Authorization header with "ApiKey" scheme
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    // Fallback: Check query parameter (not recommended for production)
    return request.query['api_key'] as string | undefined;
  }
}
