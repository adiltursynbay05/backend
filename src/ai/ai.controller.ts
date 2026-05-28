import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { getErrorMessage } from '../common/errors';
import { OpenAiService } from './openai.service';
import type { ChatMessage } from './openai.service';

interface ChatRequestBody {
  history?: ChatMessage[];
  latestMessage?: unknown;
  lang?: unknown;
  position?: unknown;
}

interface EvaluationRequestBody {
  history?: ChatMessage[];
  lang?: unknown;
  position?: unknown;
}

interface TtsRequestBody {
  text?: unknown;
}

@Controller()
@UseGuards(SupabaseAuthGuard)
export class AiController {
  constructor(private readonly openAiService: OpenAiService) {}

  @Post('chat')
  async chat(@Body() body: ChatRequestBody) {
    const { history, latestMessage, lang, position } = body;

    if (!latestMessage || typeof latestMessage !== 'string') {
      throw new BadRequestException({ error: 'latestMessage is required' });
    }

    if (typeof lang !== 'string' || !lang) {
      throw new BadRequestException({ error: 'lang is required' });
    }

    const response = await this.openAiService.getAIResponse(
      Array.isArray(history) ? history : [],
      latestMessage,
      lang,
      typeof position === 'string' ? position : '',
    );

    return { response };
  }

  @Post('evaluate')
  async evaluate(@Body() body: EvaluationRequestBody) {
    const { history, lang, position } = body;

    if (!Array.isArray(history) || history.length === 0) {
      throw new BadRequestException({ error: 'history array is required' });
    }

    return this.openAiService.getInterviewEvaluation(
      history,
      typeof lang === 'string' ? lang : '',
      typeof position === 'string' ? position : '',
    );
  }

  @Post('tts')
  async textToSpeech(
    @Body() body: TtsRequestBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { text } = body;

    if (!text || typeof text !== 'string') {
      throw new BadRequestException({ error: 'text is required' });
    }

    try {
      const audioBuffer = await this.openAiService.generateSpeech(
        text.slice(0, 4096),
      );
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-store');
      return new StreamableFile(audioBuffer);
    } catch (error: unknown) {
      throw new InternalServerErrorException({ error: getErrorMessage(error) });
    }
  }
}
