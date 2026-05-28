import { Injectable } from '@nestjs/common';
import { getErrorMessage } from '../common/errors';

export type ChatMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface InterviewEvaluation {
  totalScore: number;
  techSkills: number;
  communication: number;
  confidence: number;
  structure: number;
  feedback: string;
}

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

@Injectable()
export class OpenAiService {
  async getAIResponse(
    history: ChatMessage[],
    latestMessage: string,
    lang: string,
    position: string,
  ): Promise<string> {
    try {
      const systemPrompt = `System Prompt: Acelt Dynamic Interviewer
        Role:
        You are an adaptive technical interviewer for the Acelt project. Your task is to conduct a deep, free-flowing interview consisting of 7 to 15 questions, smoothly transitioning from one topic to another based on the candidate's answers.

        Context:
        Candidate is applying for: "${position}".
        Language: Respond ONLY in ${lang}.

        1. INTERVIEW FLOW:
        - Duration: Keep the dialogue within 7–15 questions.
        - Adaptability: Do not follow a rigid list. If the user gives a surface-level answer -> ask a "under the hood" follow-up. If the user is an expert -> skip basics, move on.
        - Coherence: Make logical transitions (e.g., "Speaking of concurrency, let's discuss how Spring handles it...").

        2. TERMINATION LOGIC:
        Initiate the session finale ONLY in three cases:
        - Target Reached: You have asked at least 7 questions and have a full candidate profile (max 15).
        - Direct Request: The user asks to stop or wrap up.
        - Impossible to Continue: The user systematically fails to answer (more than 3-4 skips in a row), making further interviewing pointless.

        3. THE EXIT SEQUENCE:
        As soon as a termination condition is met:
        - Stop Questioning: No more new questions.
        - Close Dialogue: Give a short, FINAL and DECISIVE closing message — thank the candidate, say the interview is now over. Do NOT offer to continue, do NOT say "feel free to ask more questions", do NOT suggest they can resume. The session ends HERE, permanently.
        - Signal the System: At the very end of your message, add a technical string for the backend: [FINISH_SESSION: {"count": X}], where X is the final number of questions asked.

        4. CONSTRAINTS & TONE:
        - NO INTRODUCTION: Do NOT introduce yourself, do NOT say your name, do NOT greet the candidate. Start the interview immediately with the first technical question. Zero pleasantries.
        - Be STRICT but professional. If the candidate makes a mistake, politely but clearly point it out and ask them to correct it or explain why they think that way.
        - NO SURFACE LEVEL: Do not accept vague answers. Dig deep. Ask "Why?", "How does it work under the hood?", "What are the trade-offs?".
        - No Hints: Do not explain correct answers immediately. Let the candidate struggle a bit.
        - Real-world Focus: Ask about production scenarios, scaling issues, debugging difficult problems, not just textbook theory.
        - Tone: Senior Engineer to Junior/Mid: demanding, technical, expecting precision.`;

      const messages: OpenAiMessage[] = [
        { role: 'system', content: systemPrompt },
        ...this.toOpenAiMessages(history),
        { role: 'user', content: latestMessage },
      ];

      const data = await this.chatCompletions({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
      });

      return (
        data.choices?.[0]?.message?.content ??
        `[API ERROR]: ${data.error?.message || 'Не удалось получить ответ от ИИ'}`
      );
    } catch (error: unknown) {
      return `[СЕТЕВАЯ ОШИБКА]: ${getErrorMessage(error)}`;
    }
  }

  async getInterviewEvaluation(
    history: ChatMessage[],
    lang: string,
    position: string,
  ): Promise<InterviewEvaluation> {
    try {
      const userMessages = history.filter((message) => message.role === 'user');

      if (userMessages.length === 0) {
        return this.emptyEvaluation('Interview was too short.');
      }

      const evaluationPrompt = `Enhanced System Prompt: Senior Evaluator & Auditor (Acelt Engine v3.0)
        Role:
        You are an expert Technical Interview Auditor. Your mission is to perform a cold, evidence-based "post-mortem" of a conversation for the position of "${position}". You act as a "shadow" senior lead who decides if the candidate actually knows their stuff or is just good at talking.

        Language: Analyze in ${lang}.

        📏 Scoring Rubric & Definitions:
        1. Технические навыки (techSkills) [40%]:
           - 90-100: Deep Dive. Candidate explains "why" and "how it works under the hood" (e.g., memory management, complexity, internal protocols).
           - 70-89: Solid. Knows the tools, uses them correctly, but misses niche edge cases.
           - 0-69: Superficial. Uses buzzwords but cannot explain the underlying logic. Set to 0 if no technical questions were answered.

        2. Коммуникация (communication) [20%]:
           - Criteria: Signal-to-noise ratio.
           - Penalty: Deduct 20 points for every "watery" paragraph (fluff) that doesn't add value.
           - Goal: Concise, professional, and jargon-appropriate language.

        3. Уверенность (confidence) [20%]:
           - Criteria: Decisiveness and handling of pressure.
           - Red Flags: Phrases like "I think maybe...", "I'm not sure but...", excessive hedging, or backtracking when challenged.
           - Note: If the candidate says "I don't know" but explains how they would find the answer, this is Positive Confidence.

        4. Структура ответов (structure) [20%]:
           - Criteria: Logical scaffolding.
           - STAR Check: Does the candidate name the Situation, Task, Action, and Result?
           - Flow: Is there a clear beginning, middle, and end? Or is it a "stream of consciousness"?

        ⚠️ Anti-Hallucination & Guardrails:
        - Strict Evidence Rule: You are forbidden from assuming skills. If the interview transcript does not contain a specific discussion about architecture, the structure or techSkills related to it MUST be 0.
        - No "Average" Bias: Do not default to 50/100. If the data is missing, the score is 0.
        - Minimum Viable Data (MVD): If there are fewer than 3 meaningful technical exchanges, you MUST return 0 for all scores and state "Insufficient data for evaluation" in the feedback.
        - Zero-Tolerance for Guessing: If the candidate gives a factually wrong technical answer, techSkills cannot be higher than 40, regardless of how "confident" they sounded.

        📋 Feedback Template (Mandatory):
        Your feedback must follow this structure in ${lang}:
        [Технический уровень]: Конкретные ошибки или пробелы. Что было сказано правильно.
        [Soft Skills & Уверенность]: Анализ подачи и психологической устойчивости.
        [Структура и Логика]: Насколько легко было следить за мыслью.
        [Вердикт]: Конкретный совет: "Нанять", "Еще одно техническое" или "Отказать".

        📤 Output Format:
        Return ONLY a valid JSON object. No prose before or after.
        {
            "totalScore": number,
            "techSkills": number,
            "communication": number,
            "confidence": number,
            "structure": number,
            "feedback": "Detailed evidence-based feedback in ${lang}. Mention specific missing data if scores are 0."
        }`;

      const data = await this.chatCompletions({
        model: 'gpt-4o-mini',
        messages: [
          ...this.toOpenAiMessages(history),
          { role: 'user', content: evaluationPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return this.emptyEvaluation('Technical error or session interrupted.');
      }

      const parsed: unknown = JSON.parse(content);
      return this.normalizeEvaluation(parsed);
    } catch (error) {
      console.error('Evaluation error:', error);
      return this.emptyEvaluation('Error calculating results.');
    }
  }

  async translateUiCopy(
    source: Record<string, unknown>,
    targetLang: string,
    targetLanguageName: string,
  ): Promise<Record<string, unknown>> {
    const cleanEntries = Object.entries(source).filter(([, value]) => {
        return (
          typeof value === 'string' ||
          (Array.isArray(value) && value.every((item) => typeof item === 'string'))
        );
      });
    const chunks = chunkEntries(cleanEntries, 32);

    try {
      const translatedChunks = await Promise.all(
        chunks.map((chunk) =>
          this.translateUiChunk(Object.fromEntries(chunk), targetLang, targetLanguageName),
        ),
      );
      const cleanSource = Object.fromEntries(cleanEntries);
      const parsed = Object.assign({}, ...translatedChunks) as Record<string, unknown>;
      return this.normalizeUiTranslation(cleanSource, parsed, targetLang);
    } catch (error) {
      console.error('UI translation error:', error);
      return { langCode: targetLang };
    }
  }

  async generateSpeech(text: string): Promise<Buffer> {
    const input = text.trim();
    if (!input) {
      throw new Error('Text for OpenAI TTS is empty');
    }

    const model = readEnvValue('OPENAI_TTS_MODEL') || 'tts-1';
    const voice = readEnvValue('OPENAI_TTS_VOICE') || 'alloy';
    const timeoutMs = readPositiveIntegerEnv('OPENAI_TTS_TIMEOUT_MS', 12000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.getOpenAiApiKey()}`,
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input,
          voice,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = this.readOpenAiErrorMessage(errorText);
        console.error('OpenAI TTS Error:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
        });
        throw new Error(
          `OpenAI TTS failed (${response.status}): ${errorMessage}`,
        );
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw new Error(`OpenAI TTS timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private readOpenAiErrorMessage(errorText: string) {
    try {
      const parsed = JSON.parse(errorText) as {
        error?: { message?: unknown; code?: unknown; type?: unknown };
      };
      const message =
        typeof parsed.error?.message === 'string'
          ? parsed.error.message
          : errorText;
      const code =
        typeof parsed.error?.code === 'string' ? ` code=${parsed.error.code}` : '';
      const type =
        typeof parsed.error?.type === 'string' ? ` type=${parsed.error.type}` : '';
      return `${message}${code}${type}`.trim();
    } catch {
      return errorText || 'Unknown OpenAI TTS error';
    }
  }

  private toOpenAiMessages(history: ChatMessage[] = []): OpenAiMessage[] {
    return history.map((message) => ({
      role: message.role === 'model' ? 'assistant' : 'user',
      content: message.parts?.[0]?.text ?? '',
    }));
  }

  private async chatCompletions(
    body: Record<string, unknown>,
  ): Promise<OpenAiChatCompletionResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getOpenAiApiKey()}`,
      },
      body: JSON.stringify(body),
    });

    const data =
      (await response.json()) as unknown as OpenAiChatCompletionResponse;

    if (!response.ok) {
      console.error('OpenAI Result:', data);
    }

    return data;
  }

  private getOpenAiApiKey() {
    const apiKey = readEnvValue('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    return apiKey;
  }

  private normalizeEvaluation(value: unknown): InterviewEvaluation {
    if (typeof value !== 'object' || value === null) {
      return this.emptyEvaluation('Technical error or session interrupted.');
    }

    const record = value as Record<string, unknown>;

    return {
      totalScore: readNumber(record.totalScore),
      techSkills: readNumber(record.techSkills),
      communication: readNumber(record.communication),
      confidence: readNumber(record.confidence),
      structure: readNumber(record.structure),
      feedback:
        typeof record.feedback === 'string'
          ? record.feedback
          : 'Technical error or session interrupted.',
    };
  }

  private emptyEvaluation(feedback: string): InterviewEvaluation {
    return {
      totalScore: 0,
      techSkills: 0,
      communication: 0,
      confidence: 0,
      structure: 0,
      feedback,
    };
  }

  private async translateUiChunk(
    source: Record<string, unknown>,
    targetLang: string,
    targetLanguageName: string,
  ): Promise<Record<string, unknown>> {
    const prompt = `Translate this Acelt UI JSON to ${targetLanguageName} (${targetLang}).

Rules:
- Return ONLY valid JSON.
- Keep exactly the same keys as the input object.
- Translate string values naturally for a modern interview training product.
- Preserve placeholders like {needed}, numbers, punctuation meaning, and product names like Acelt, AI, STAR, FAQ.
- For array values, return an array with the same length and order.
- If the key is "langCode", its value must be "${targetLang}".

Input JSON:
${JSON.stringify(source)}`;

    const data = await this.chatCompletions({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {};
    }

    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      console.error('UI translation chunk parse error:', error);
      return {};
    }
  }

  private normalizeUiTranslation(
    source: Record<string, unknown>,
    translated: Record<string, unknown>,
    targetLang: string,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = { langCode: targetLang };

    for (const [key, sourceValue] of Object.entries(source)) {
      const translatedValue = translated[key];

      if (key === 'langCode') {
        normalized[key] = targetLang;
        continue;
      }

      if (typeof sourceValue === 'string') {
        normalized[key] = typeof translatedValue === 'string' ? translatedValue : sourceValue;
        continue;
      }

      if (Array.isArray(sourceValue)) {
        normalized[key] =
          Array.isArray(translatedValue) &&
          translatedValue.length === sourceValue.length &&
          translatedValue.every((item) => typeof item === 'string')
            ? translatedValue
            : sourceValue;
      }
    }

    return normalized;
  }
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function chunkEntries<T>(entries: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }
  return chunks;
}

function readEnvValue(key: string) {
  return (process.env[key] ?? '').trim().replace(/^['"]|['"]$/g, '');
}

function readPositiveIntegerEnv(key: string, fallback: number) {
  const value = Number.parseInt(readEnvValue(key), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    String((error as { name?: unknown }).name) === 'AbortError'
  );
}
