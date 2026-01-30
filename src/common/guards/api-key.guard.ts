import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);
    const sharedSecret = this.configService.get<string>('SHARED_SECRET');

    if (!sharedSecret) {
      this.logger.error('SHARED_SECRET not configured in environment');
      throw new UnauthorizedException('Server configuration error');
    }

    if (!apiKey) {
      this.logger.warn(`Missing API key from ${request.ip}`);
      throw new UnauthorizedException('API key is required');
    }

    if (apiKey !== sharedSecret) {
      this.logger.warn(`Invalid API key attempt from ${request.ip}`);
      throw new UnauthorizedException('Invalid API key');
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
