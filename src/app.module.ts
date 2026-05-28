import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './auth/supabase-auth.guard';
import { SupabaseService } from './supabase/supabase.service';
import { HealthController } from './health/health.controller';
import { AiController } from './ai/ai.controller';
import { OpenAiService } from './ai/openai.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { StatisticsController } from './statistics/statistics.controller';
import { StatisticsService } from './statistics/statistics.service';
import { AdaptiveDifficultyController } from './adaptive/adaptive-difficulty.controller';
import { AdaptiveDifficultyService } from './adaptive/adaptive-difficulty.service';
import { I18nController } from './i18n/i18n.controller';

@Module({
  imports: [],
  controllers: [
    HealthController,
    AiController,
    SessionsController,
    StatisticsController,
    AdaptiveDifficultyController,
    I18nController,
  ],
  providers: [
    SupabaseService,
    SupabaseAuthGuard,
    OpenAiService,
    SessionsService,
    StatisticsService,
    AdaptiveDifficultyService,
  ],
})
export class AppModule {}
