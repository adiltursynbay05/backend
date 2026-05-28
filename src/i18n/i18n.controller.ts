import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { OpenAiService } from '../ai/openai.service';

interface TranslateUiRequestBody {
  source?: unknown;
  targetLang?: unknown;
  targetLanguageName?: unknown;
}

@Controller()
export class I18nController {
  constructor(private readonly openAiService: OpenAiService) {}

  @Post('translate-ui')
  async translateUi(@Body() body: TranslateUiRequestBody) {
    const { source, targetLang, targetLanguageName } = body;

    if (typeof source !== 'object' || source === null || Array.isArray(source)) {
      throw new BadRequestException({ error: 'source object is required' });
    }

    if (Object.keys(source).length > 180) {
      throw new BadRequestException({ error: 'source object is too large' });
    }

    if (typeof targetLang !== 'string' || !targetLang.trim()) {
      throw new BadRequestException({ error: 'targetLang is required' });
    }

    if (typeof targetLanguageName !== 'string' || !targetLanguageName.trim()) {
      throw new BadRequestException({ error: 'targetLanguageName is required' });
    }

    const translations = await this.openAiService.translateUiCopy(
      source as Record<string, unknown>,
      targetLang.trim().toLowerCase(),
      targetLanguageName.trim(),
    );

    return { translations };
  }
}
