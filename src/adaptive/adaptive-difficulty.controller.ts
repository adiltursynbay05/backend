import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { getErrorMessage } from '../common/errors';
import { AdaptiveDifficultyService } from './adaptive-difficulty.service';

@Controller('adaptive/difficulty')
@UseGuards(SupabaseAuthGuard)
export class AdaptiveDifficultyController {
  constructor(
    private readonly adaptiveDifficultyService: AdaptiveDifficultyService,
  ) {}

  @Get()
  async getDifficulty(@Req() request: AuthenticatedRequest) {
    try {
      return await this.adaptiveDifficultyService.getDifficulty(request);
    } catch (error: unknown) {
      console.error('Get difficulty error:', error);
      throw new InternalServerErrorException({ error: getErrorMessage(error) });
    }
  }

  @Post()
  async updateDifficulty(
    @Req() request: AuthenticatedRequest,
    @Body('score') score: number,
  ) {
    if (typeof score !== 'number') {
      throw new BadRequestException({
        error: 'score is required and must be a number',
      });
    }

    try {
      return await this.adaptiveDifficultyService.updateDifficulty(
        request,
        score,
      );
    } catch (error: unknown) {
      console.error('Update difficulty error:', error);
      throw new InternalServerErrorException({ error: getErrorMessage(error) });
    }
  }
}
