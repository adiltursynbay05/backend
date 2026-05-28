import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { getErrorMessage } from '../common/errors';
import { SessionsService } from './sessions.service';
import type { InterviewSessionPayload } from './sessions.service';

@Controller('sessions')
@UseGuards(SupabaseAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() session: InterviewSessionPayload,
  ) {
    if (!session?.id || !session?.date || !session?.position) {
      throw new BadRequestException({ error: 'Invalid session data' });
    }

    try {
      return await this.sessionsService.create(request, session);
    } catch (error: unknown) {
      console.error('Session save error:', error);
      throw new InternalServerErrorException({ error: getErrorMessage(error) });
    }
  }

  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    try {
      return await this.sessionsService.findAll(request);
    } catch (error: unknown) {
      console.error('Session fetch error:', error);
      throw new InternalServerErrorException({ error: getErrorMessage(error) });
    }
  }

  @Delete(':id')
  async deleteOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    if (!id) {
      throw new BadRequestException({ error: 'Session ID is required' });
    }

    try {
      return await this.sessionsService.deleteOne(request, id);
    } catch (error: unknown) {
      console.error('Session delete error:', error);
      throw new InternalServerErrorException({ error: getErrorMessage(error) });
    }
  }

  @Post('delete-multiple')
  async deleteMany(
    @Req() request: AuthenticatedRequest,
    @Body('ids') ids: string[],
  ) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException({ error: 'ids array is required' });
    }

    try {
      return await this.sessionsService.deleteMany(request, ids);
    } catch (error: unknown) {
      console.error('Session delete-multiple error:', error);
      throw new InternalServerErrorException({ error: getErrorMessage(error) });
    }
  }
}
