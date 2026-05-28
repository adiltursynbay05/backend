import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthenticatedRequest } from './authenticated-request';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'Missing or invalid Authorization header',
      });
    }

    try {
      const supabase = this.supabaseService.createClient(authHeader);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        throw new UnauthorizedException({
          error: 'Unauthorized: invalid or expired token',
        });
      }

      const authRequest = request as AuthenticatedRequest;
      authRequest.user = user;
      authRequest.supabase = supabase;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException({
        error: 'Auth verification failed',
      });
    }
  }
}
