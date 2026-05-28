import {
  Controller,
  Get,
  InternalServerErrorException,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { getErrorMessage } from '../common/errors';
import { SessionsService } from '../sessions/sessions.service';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(SupabaseAuthGuard)
export class StatisticsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly statisticsService: StatisticsService,
  ) {}

  @Get()
  async getStatistics(@Req() request: AuthenticatedRequest) {
    try {
      const sessions = await this.sessionsService.findAll(request);
      return this.statisticsService.getAdvancedStats(sessions);
    } catch (error: unknown) {
      console.error('Statistics fetch error:', error);
      throw new InternalServerErrorException({ error: getErrorMessage(error) });
    }
  }
}
