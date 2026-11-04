import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiApiKey, AiProviderType } from './entities/ai-api-key.entity';
import { StudentMistakeItem } from '../assignments/assignments.service';

export interface ChatMessageDto {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface EssayGradeResult {
  score: number;
  maxPoints: number;
  feedback: string;
  gradedByAi: boolean;
  provider?: string;
}

export interface MistakeAnalysisReport {
  summary: string;
  weakTopics: Array<{
    courseName: string;
    chapterName: string;
    lessonName: string;
    mistakeCount: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    diagnosis: string;
    whatToStudy: string;
  }>;
  conceptReviews: Array<{
    questionText: string;
    courseName: string;
    studentWrongAnswer: string;
    correctAnswer: string;
    explanation: string;
  }>;
  actionPlan: string[];
  generatedByAi: boolean;
}

const DEFAULT_PROVIDER_MODELS: Record<AiProviderType, string> = {
  groq: 'openai/gpt-oss-120b',
  gemini: 'gemini-2.0-flash',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
};

const DEFAULT_PROVIDER_LIMITS: Record<
  AiProviderType,
  { dailyRequestLimit: number; dailyTokenLimit: number }
> = {
  groq: { dailyRequestLimit: 14400, dailyTokenLimit: 500000 },
  gemini: { dailyRequestLimit: 1500, dailyTokenLimit: 1000000 },
  openrouter: { dailyRequestLimit: 200, dailyTokenLimit: 200000 },
};

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(AiApiKey)
    private readonly keysRepo: Repository<AiApiKey>,
  ) {}

  async onModuleInit() {
    try {
      await this.keysRepo.query(`
        CREATE TABLE IF NOT EXISTS "ai_api_keys" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "label" varchar(120) NOT NULL,
          "provider" varchar(32) NOT NULL DEFAULT 'groq',
          "apiKey" text NOT NULL,
          "model" varchar(120) NOT NULL DEFAULT 'llama-3.3-70b-versatile',
          "dailyRequestLimit" integer NOT NULL DEFAULT 14400,
          "dailyTokenLimit" integer NOT NULL DEFAULT 500000,
          "requestsUsedToday" integer NOT NULL DEFAULT 0,
          "tokensUsedToday" integer NOT NULL DEFAULT 0,
          "totalRequests" integer NOT NULL DEFAULT 0,
          "totalTokens" integer NOT NULL DEFAULT 0,
          "rateLimitRemainingRequests" integer,
          "rateLimitRemainingTokens" integer,
          "quotaResetDate" varchar(16),
          "isActive" boolean NOT NULL DEFAULT true,
          "cooldownUntil" TIMESTAMPTZ,
          "lastUsedAt" TIMESTAMPTZ,
          "lastError" text,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_ai_api_keys_id" PRIMARY KEY ("id")
        );
      `);

      // Auto-seed from environment variables if table is empty
      const count = await this.keysRepo.count();
      if (count === 0) {
        const envGroq = process.env.GROQ_API_KEY?.trim();
        const envGemini = process.env.GEMINI_API_KEY?.trim();
        if (envGroq) {
          await this.addKey({
            label: 'Groq Default (Env)',
            provider: 'groq',
            apiKey: envGroq,
          });
        }
        if (envGemini) {
          await this.addKey({
            label: 'Gemini Default (Env)',
            provider: 'gemini',
            apiKey: envGemini,
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`AI table init skipped or deferred: ${err?.message || err}`);
    }
  }

  private todayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private maskApiKey(key: string): string {
    if (!key) return '—';
    const trimmed = key.trim();
    if (trimmed.length <= 10) return '••••' + trimmed.slice(-3);
    return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
  }

  private async ensureDailyQuotaFresh(key: AiApiKey): Promise<AiApiKey> {
    const today = this.todayDateString();
    if (key.quotaResetDate !== today) {
      key.quotaResetDate = today;
      key.requestsUsedToday = 0;
      key.tokensUsedToday = 0;
      key.rateLimitRemainingRequests = null;
      key.rateLimitRemainingTokens = null;
      key.lastError = null;
      if (this.keysRepo.save) {
        await this.keysRepo.save(key).catch(() => {});
      }
    }
    return key;
  }

  private computeKeyMetrics(key: AiApiKey) {
    const dailyReqLimit = Math.max(1, key.dailyRequestLimit || 14400);
    const dailyTokLimit = Math.max(1, key.dailyTokenLimit || 500000);
    const reqUsed = Math.max(0, key.requestsUsedToday || 0);
    const tokUsed = Math.max(0, key.tokensUsedToday || 0);

    // If provider sent live remaining requests header and it's smaller/more accurate, use it; otherwise derive from daily limit
    const remainingRequests =
      key.rateLimitRemainingRequests !== null && key.rateLimitRemainingRequests !== undefined
        ? Math.max(0, Math.min(dailyReqLimit - reqUsed, key.rateLimitRemainingRequests))
        : Math.max(0, dailyReqLimit - reqUsed);

    const remainingTokens = Math.max(0, dailyTokLimit - tokUsed);

    const requestsRemainingPercent = Math.min(
      100,
      Math.max(0, Math.round((remainingRequests / dailyReqLimit) * 100)),
    );
    const tokensRemainingPercent = Math.min(
      100,
      Math.max(0, Math.round((remainingTokens / dailyTokLimit) * 100)),
    );

    const now = Date.now();
    const inCooldown = Boolean(
      key.cooldownUntil && new Date(key.cooldownUntil).getTime() > now,
    );
    const isExhausted = remainingRequests <= 0 || remainingTokens <= 0;

    let status: 'ACTIVE' | 'COOLDOWN' | 'EXHAUSTED' | 'DISABLED' = 'ACTIVE';
    if (!key.isActive) status = 'DISABLED';
    else if (isExhausted) status = 'EXHAUSTED';
    else if (inCooldown) status = 'COOLDOWN';

    return {
      id: key.id,
      label: key.label,
      provider: key.provider,
      maskedKey: this.maskApiKey(key.apiKey),
      model: key.model,
      isActive: key.isActive,
      status,
      dailyRequestLimit: dailyReqLimit,
      requestsUsedToday: reqUsed,
      remainingRequests,
      requestsRemainingPercent,
      dailyTokenLimit: dailyTokLimit,
      tokensUsedToday: tokUsed,
      remainingTokens,
      tokensRemainingPercent,
      totalRequests: key.totalRequests || 0,
      totalTokens: key.totalTokens || 0,
      lastUsedAt: key.lastUsedAt,
      lastError: key.lastError,
      cooldownUntil: key.cooldownUntil,
      createdAt: key.createdAt,
    };
  }

  // ── ADMIN: List all API keys + Quota summary ──────────────────────────────
  async listKeysWithQuota() {
    const rawKeys = await this.keysRepo.find({ order: { createdAt: 'ASC' } });
    const keys = await Promise.all(rawKeys.map(k => this.ensureDailyQuotaFresh(k)));
    const formatted = keys.map(k => this.computeKeyMetrics(k));

    const activeFormatted = formatted.filter(k => k.isActive);
    const totalDailyRequestsLimit = activeFormatted.reduce((s, k) => s + k.dailyRequestLimit, 0);
    const totalRequestsUsedToday = activeFormatted.reduce((s, k) => s + k.requestsUsedToday, 0);
    const totalRemainingRequests = activeFormatted.reduce((s, k) => s + k.remainingRequests, 0);

    const totalDailyTokensLimit = activeFormatted.reduce((s, k) => s + k.dailyTokenLimit, 0);
    const totalTokensUsedToday = activeFormatted.reduce((s, k) => s + k.tokensUsedToday, 0);
    const totalRemainingTokens = activeFormatted.reduce((s, k) => s + k.remainingTokens, 0);

    return {
      summary: {
        totalKeys: formatted.length,
        activeKeys: activeFormatted.filter(k => k.status === 'ACTIVE').length,
        totalDailyRequestsLimit,
        totalRequestsUsedToday,
        totalRemainingRequests,
        overallRequestsRemainingPercent:
          totalDailyRequestsLimit > 0
            ? Math.round((totalRemainingRequests / totalDailyRequestsLimit) * 100)
            : 0,
        totalDailyTokensLimit,
        totalTokensUsedToday,
        totalRemainingTokens,
        overallTokensRemainingPercent:
          totalDailyTokensLimit > 0
            ? Math.round((totalRemainingTokens / totalDailyTokensLimit) * 100)
            : 0,
      },
      keys: formatted,
    };
  }

  // ── ADMIN: Add one or multiple API keys ───────────────────────────────────
  async addKey(dto: {
    label?: string;
    provider?: AiProviderType;
    apiKey: string;
    model?: string;
    dailyRequestLimit?: number;
    dailyTokenLimit?: number;
  }) {
    const rawKeyInput = dto.apiKey?.trim();
    if (!rawKeyInput) {
      throw new BadRequestException('يرجى إدخال مفتاح الـ API (API Key)');
    }

    const provider: AiProviderType =
      dto.provider && ['groq', 'gemini', 'openrouter'].includes(dto.provider)
        ? dto.provider
        : rawKeyInput.startsWith('gsk_')
          ? 'groq'
          : rawKeyInput.startsWith('AIza')
            ? 'gemini'
            : 'groq';

    const defaults = DEFAULT_PROVIDER_LIMITS[provider];
    const model = dto.model?.trim() || DEFAULT_PROVIDER_MODELS[provider];

    // Support pasting multiple API keys separated by lines or commas
    const keyLines = rawKeyInput
      .split(/[\r\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const created: any[] = [];
    for (let i = 0; i < keyLines.length; i++) {
      const singleKey = keyLines[i];
      const detectedProvider: AiProviderType = singleKey.startsWith('gsk_')
        ? 'groq'
        : singleKey.startsWith('AIza')
          ? 'gemini'
          : provider;

      const labelBase =
        dto.label?.trim() ||
        `${detectedProvider.toUpperCase()} Key`;
      const finalLabel = keyLines.length > 1 ? `${labelBase} #${i + 1}` : labelBase;

      const entity = this.keysRepo.create({
        label: finalLabel,
        provider: detectedProvider,
        apiKey: singleKey,
        model: dto.model?.trim() || DEFAULT_PROVIDER_MODELS[detectedProvider],
        dailyRequestLimit:
          Number(dto.dailyRequestLimit) > 0
            ? Number(dto.dailyRequestLimit)
            : DEFAULT_PROVIDER_LIMITS[detectedProvider].dailyRequestLimit,
        dailyTokenLimit:
          Number(dto.dailyTokenLimit) > 0
            ? Number(dto.dailyTokenLimit)
            : DEFAULT_PROVIDER_LIMITS[detectedProvider].dailyTokenLimit,
        requestsUsedToday: 0,
        tokensUsedToday: 0,
        quotaResetDate: this.todayDateString(),
        isActive: true,
      });
      const saved = await this.keysRepo.save(entity);
      created.push(this.computeKeyMetrics(saved));
    }

    return created.length === 1 ? created[0] : created;
  }

  async updateKey(
    id: string,
    dto: Partial<{
      label: string;
      provider: AiProviderType;
      apiKey: string;
      model: string;
      dailyRequestLimit: number;
      dailyTokenLimit: number;
      isActive: boolean;
    }>,
  ) {
    const key = await this.keysRepo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('API Key not found');

    if (dto.label !== undefined) key.label = dto.label.trim();
    if (dto.provider !== undefined) key.provider = dto.provider;
    if (dto.apiKey !== undefined && dto.apiKey.trim()) key.apiKey = dto.apiKey.trim();
    if (dto.model !== undefined && dto.model.trim()) key.model = dto.model.trim();
    if (dto.dailyRequestLimit !== undefined) key.dailyRequestLimit = Math.max(1, Number(dto.dailyRequestLimit));
    if (dto.dailyTokenLimit !== undefined) key.dailyTokenLimit = Math.max(1, Number(dto.dailyTokenLimit));
    if (dto.isActive !== undefined) key.isActive = Boolean(dto.isActive);

    const saved = await this.keysRepo.save(key);
    return this.computeKeyMetrics(saved);
  }

  async resetKeyQuota(id: string) {
    const key = await this.keysRepo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('API Key not found');
    key.requestsUsedToday = 0;
    key.tokensUsedToday = 0;
    key.rateLimitRemainingRequests = null;
    key.rateLimitRemainingTokens = null;
    key.cooldownUntil = null;
    key.lastError = null;
    key.quotaResetDate = this.todayDateString();
    const saved = await this.keysRepo.save(key);
    return this.computeKeyMetrics(saved);
  }

  async deleteKey(id: string) {
    const key = await this.keysRepo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('API Key not found');
    await this.keysRepo.delete(id);
    return { message: 'Deleted' };
  }

  async testKey(id: string) {
    const key = await this.keysRepo.findOne({ where: { id } });
    if (!key) throw new NotFoundException('API Key not found');
    await this.ensureDailyQuotaFresh(key);

    try {
      const reply = await this.executeWithSpecificKey(key, [
        { role: 'system', content: 'أجب بكلمة واحدة فقط باللغة العربية.' },
        { role: 'user', content: 'قل: متصل' },
      ], 30);
      return {
        success: true,
        reply: reply.text,
        key: this.computeKeyMetrics(key),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'فشل الاتصال بالمفتاح',
        key: this.computeKeyMetrics(key),
      };
    }
  }

  // ── Core Multi-Key Execution Engine with Failover ─────────────────────────
  private async executeWithSpecificKey(
    key: AiApiKey,
    messages: ChatMessageDto[],
    maxTokens = 1024,
    temperature = 0.3,
  ): Promise<{ text: string; provider: string; model: string }> {
    const provider = key.provider || 'groq';
    const model = key.model || DEFAULT_PROVIDER_MODELS[provider];
    let text = '';
    let tokensUsed = 0;
    let remainingReqsHeader: number | null = null;
    let remainingToksHeader: number | null = null;

    try {
      if (provider === 'gemini') {
        const systemMsg = messages.find(m => m.role === 'system')?.content || '';
        const contents = messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key.apiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg }] } } : {}),
            contents: contents.length ? contents : [{ role: 'user', parts: [{ text: 'مرحباً' }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          const error: any = new Error(`Gemini HTTP ${response.status}: ${errBody.slice(0, 200)}`);
          error.status = response.status;
          throw error;
        }

        const data: any = await response.json();
        text =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
        tokensUsed = Number(data?.usageMetadata?.totalTokenCount) || Math.ceil(text.length / 3) + 60;
      } else {
        // Groq or OpenRouter (OpenAI-compatible chat completions)
        const baseUrl =
          provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.groq.com/openai/v1/chat/completions';

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
        });

        const reqRemHeader = response.headers.get('x-ratelimit-remaining-requests');
        const tokRemHeader = response.headers.get('x-ratelimit-remaining-tokens');
        if (reqRemHeader !== null && !Number.isNaN(Number(reqRemHeader))) {
          remainingReqsHeader = Number(reqRemHeader);
        }
        if (tokRemHeader !== null && !Number.isNaN(Number(tokRemHeader))) {
          remainingToksHeader = Number(tokRemHeader);
        }

        if (!response.ok) {
          const errBody = await response.text();
          // If Groq fails because a model is decommissioned or not found, try active alternatives
          if (provider === 'groq' && (response.status === 404 || response.status === 400)) {
            const groqFallbacks = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'llama-3.3-70b-versatile'].filter(m => m !== model);
            for (const fbModel of groqFallbacks) {
              try {
                const fbResp = await fetch(baseUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${key.apiKey}`,
                  },
                  body: JSON.stringify({
                    model: fbModel,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                  }),
                });
                if (fbResp.ok) {
                  const fbData: any = await fbResp.json();
                  const fbText = fbData?.choices?.[0]?.message?.content || '';
                  const fbTokens = Number(fbData?.usage?.total_tokens) || Math.ceil(fbText.length / 3) + 60;
                  key.model = fbModel;
                  if (this.keysRepo.save) await this.keysRepo.save(key).catch(() => {});
                  return { text: fbText.trim(), provider, model: fbModel };
                }
              } catch {
                // continue to next fallback
              }
            }
          }
          const error: any = new Error(`${provider.toUpperCase()} HTTP ${response.status}: ${errBody.slice(0, 200)}`);
          error.status = response.status;
          throw error;
        }

        const data: any = await response.json();
        text = data?.choices?.[0]?.message?.content || '';
        tokensUsed = Number(data?.usage?.total_tokens) || Math.ceil(text.length / 3) + 60;
      }

      // Update key usage stats
      key.requestsUsedToday = (key.requestsUsedToday || 0) + 1;
      key.tokensUsedToday = (key.tokensUsedToday || 0) + tokensUsed;
      key.totalRequests = (key.totalRequests || 0) + 1;
      key.totalTokens = (key.totalTokens || 0) + tokensUsed;
      if (remainingReqsHeader !== null) key.rateLimitRemainingRequests = remainingReqsHeader;
      if (remainingToksHeader !== null) key.rateLimitRemainingTokens = remainingToksHeader;
      key.lastUsedAt = new Date();
      key.lastError = null;
      key.cooldownUntil = null;
      if (this.keysRepo.save) {
        await this.keysRepo.save(key).catch(() => {});
      }

      return { text: text.trim(), provider, model };
    } catch (err: any) {
      key.lastError = err?.message || 'Unknown error';
      if (err?.status === 429) {
        // Put key in 60s cooldown so next requests automatically failover to other keys
        key.cooldownUntil = new Date(Date.now() + 60_000);
      }
      if (this.keysRepo.save) {
        await this.keysRepo.save(key).catch(() => {});
      }
      throw err;
    }
  }

  async completeChat(
    messages: ChatMessageDto[],
    maxTokens = 1024,
    temperature = 0.3,
  ): Promise<{ text: string; provider: string; model: string } | null> {
    const allKeys = await this.keysRepo.find({ where: { isActive: true } });
    const freshKeys = await Promise.all(allKeys.map(k => this.ensureDailyQuotaFresh(k)));

    const now = Date.now();
    // Filter keys that have quota and are not in cooldown, then sort by least used today (load balancing)
    const availableKeys = freshKeys
      .filter(k => {
        const metrics = this.computeKeyMetrics(k);
        if (metrics.status === 'EXHAUSTED' || metrics.status === 'DISABLED') return false;
        if (k.cooldownUntil && new Date(k.cooldownUntil).getTime() > now) return false;
        return true;
      })
      .sort((a, b) => {
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return aTime - bTime;
      });

    for (const key of availableKeys) {
      try {
        return await this.executeWithSpecificKey(key, messages, maxTokens, temperature);
      } catch (err: any) {
        this.logger.warn(
          `Key "${key.label}" (${key.provider}) failed, failing over to next key: ${err?.message}`,
        );
      }
    }

    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  1. AI CHATBOT FOR STUDENTS & TEACHERS
  // ══════════════════════════════════════════════════════════════════════════
  async chatWithTutor(
    user: { id?: string; name?: string; role?: string; level?: string },
    messages: ChatMessageDto[],
    courseContext?: string,
  ) {
    const cleanMessages = (Array.isArray(messages) ? messages : [])
      .filter(m => m && typeof m.content === 'string' && m.content.trim())
      .slice(-12)
      .map(m => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content.trim().slice(0, 3000),
      }));

    if (cleanMessages.length === 0) {
      throw new BadRequestException('يرجى كتابة رسالتك أولاً');
    }

    const systemPrompt = [
      'أنت المساعد التعليمي الذكي لمنصة Fixion التعليمية.',
      `تتحدث مع الطالب/المستخدم: ${user?.name || 'الطالب'}${user?.level ? ` (المستوى الدراسي: ${user.level})` : ''}.`,
      courseContext ? `السياق الدراسي الحالي: ${courseContext}` : '',
      'اشرح المفاهيم العلمية والرياضية بأسلوب مبسط وواضح ومنظم باللغة العربية (مع دعم المصطلحات الإنجليزية والمعادلات عند الحاجة).',
      'شجّع الطالب على الفهم خطوة بخطوة، واستخدم نقاطاً واضحة وأمثلة عملية قصيرة.',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.completeChat(
      [{ role: 'system', content: systemPrompt }, ...cleanMessages],
      1024,
      0.4,
    );

    if (!result) {
      const isStudent = user?.role === 'student';
      return {
        reply: isStudent
          ? 'المساعد الذكي غير متاح حالياً، يرجى المحاولة لاحقاً.'
          : 'عذراً، لم يتم تفعيل مفاتيح الذكاء الاصطناعي (API Keys) حالياً أو انتهت الكوتا اليومية لجميع المفاتيح. يرجى إضافة مفتاح API جديد من لوحة التحكم.',
        provider: 'fallback',
        model: 'offline',
      };
    }

    return {
      reply: result.text,
      provider: result.provider,
      model: result.model,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  2. AI AUTO-GRADING FOR ESSAY (TEXT) QUIZ QUESTIONS
  // ══════════════════════════════════════════════════════════════════════════
  async gradeEssayQuestion(params: {
    questionText: string;
    modelAnswer?: string | null;
    studentAnswer?: string | null;
    maxPoints: number;
  }): Promise<EssayGradeResult> {
    const maxPoints = Math.max(1, Number(params.maxPoints) || 1);
    const studentAns = (params.studentAnswer || '').trim();
    const modelAns = (params.modelAnswer || '').trim();

    if (!studentAns) {
      return {
        score: 0,
        maxPoints,
        feedback: 'لم يقم الطالب بكتابة إجابة على هذا السؤال.',
        gradedByAi: true,
      };
    }

    const systemPrompt = [
      'أنت مصحح امتحانات أكاديمي دقيق وعادل في منصة تعليمية.',
      'مهمتك تقييم إجابة الطالب المقالية مقارنةً بالسؤال والإجابة النموذجية المعتمدة (إن وجدت).',
      'اعتمد على الفهم والمعنى العلمي الصحيح وليس التطابق الحرفي للكلمات، وامنح درجات جزئية عادلة إذا كانت الإجابة صحيحة جزئياً.',
      'يجب أن تُرجع النتيجة بصيغة JSON فقط بدون أي نص إضافي بهذا الشكل:',
      `{"score": <رقم بين 0 و ${maxPoints}>, "feedback": "<تعليق مختصر ومفيد للطالب باللغة العربية يوضح سبب الدرجة>"}`,
    ].join('\n');

    const userPrompt = [
      `نص السؤال: ${params.questionText}`,
      modelAns ? `الإجابة النموذجية / معايير التصحيح: ${modelAns}` : 'ملاحظة: قيّم الإجابة بناءً على صحتها العلمية والأكاديمية.',
      `الدرجة القصوى للسؤال: ${maxPoints}`,
      `إجابة الطالب: ${studentAns}`,
    ].join('\n\n');

    const aiRes = await this.completeChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      400,
      0.1,
    );

    if (aiRes?.text) {
      try {
        const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const rawScore = Number(parsed.score);
          if (Number.isFinite(rawScore)) {
            const clampedScore = Math.min(maxPoints, Math.max(0, Math.round(rawScore * 10) / 10));
            return {
              score: clampedScore,
              maxPoints,
              feedback:
                typeof parsed.feedback === 'string' && parsed.feedback.trim()
                  ? parsed.feedback.trim()
                  : clampedScore >= maxPoints
                    ? 'إجابة ممتازة ومكتملة علمياً.'
                    : 'تم تقييم الإجابة بواسطة الذكاء الاصطناعي.',
              gradedByAi: true,
              provider: aiRes.provider,
            };
          }
        }
      } catch {}
    }

    // Smart local semantic/keyword fallback if no API key is configured yet
    if (modelAns) {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2);
      const modelWords = normalize(modelAns);
      const studentWords = new Set(normalize(studentAns));
      if (modelWords.length > 0) {
        const matched = modelWords.filter(w => studentWords.has(w)).length;
        const ratio = matched / modelWords.length;
        const score = Math.round(ratio * maxPoints);
        return {
          score,
          maxPoints,
          feedback:
            ratio >= 0.75
              ? 'إجابة صحيحة ومطابقة للمفهوم المطلوب.'
              : ratio >= 0.4
                ? `إجابة صحيحة جزئياً. الإجابة النموذجية هي: ${modelAns}`
                : `الإجابة غير مكتملة. الإجابة النموذجية هي: ${modelAns}`,
          gradedByAi: true,
          provider: 'local-heuristic',
        };
      }
    }

    return {
      score: 0,
      maxPoints,
      feedback: 'بانتظار مراجعة المدرس أو تفعيل مفتاح الـ AI.',
      gradedByAi: false,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  3. AI STUDENT MISTAKES ANALYZER ("ضعيف في دروس ايه ومحتاج يذاكر ايه")
  // ══════════════════════════════════════════════════════════════════════════
  async analyzeStudentMistakes(
    studentName: string,
    mistakes: StudentMistakeItem[],
  ): Promise<MistakeAnalysisReport> {
    if (!mistakes || mistakes.length === 0) {
      return {
        summary: 'لا توجد لديك أي أخطاء مسجلة حتى الآن! مستواك ممتاز، استمر في حل الكويزات والحصص.',
        weakTopics: [],
        conceptReviews: [],
        actionPlan: ['استمر في مشاهدة الحصص بانتظام وحل الكويزات أولاً بأول.'],
        generatedByAi: true,
      };
    }

    // Group mistakes by course + chapter + lesson to identify weak lessons accurately
    const topicGroups = new Map<
      string,
      {
        courseName: string;
        chapterName: string;
        lessonName: string;
        items: StudentMistakeItem[];
      }
    >();

    for (const m of mistakes) {
      const courseName = m.courseName || 'مادة عامة';
      const chapterName = m.chapterName || 'الفصل العام';
      const lessonName = m.lessonName || m.sourceTitle || 'درس عام';
      const key = `${courseName}:::${chapterName}:::${lessonName}`;
      const existing = topicGroups.get(key) || {
        courseName,
        chapterName,
        lessonName,
        items: [],
      };
      existing.items.push(m);
      topicGroups.set(key, existing);
    }

    const sortedTopics = [...topicGroups.values()].sort(
      (a, b) => b.items.length - a.items.length,
    );

    // Take top 15 most important mistakes to send to LLM
    const topMistakesSample = mistakes.slice(0, 15).map((m, i) => ({
      index: i + 1,
      course: m.courseName,
      chapter: m.chapterName || 'غير محدد',
      lesson: m.lessonName || m.sourceTitle,
      question: m.questionText,
      studentWrongAnswer: m.isUnanswered
        ? 'ترك السؤال بدون إجابة'
        : m.studentAnswerText || m.studentAnswer || 'خاطئة',
      correctAnswer: m.correctAnswerText || m.correctAnswer,
    }));

    const systemPrompt = [
      'أنت مستشار تعليمي ذكي ومحلل أداء أكاديمي في منصة Fixion.',
      `قم بتحليل أخطاء الطالب (${studentName || 'الطالب'}) في الامتحانات والكويزات، وحدد له بدقة:`,
      '1. في أي الدروس والفصول هو ضعيف ولماذا؟',
      '2. ما المفاهيم والقوانين التي يخلط بينها ويحتاج لمراجعتها؟',
      '3. خطة مذاكرة عملية ومحددة خطوة بخطوة.',
      'أرجع الإجابة بصيغة JSON صحيحة فقط بدون أي نص خارج الـ JSON بالتنسيق التالي:',
      '{',
      '  "summary": "ملخص تشخيصي شامل ودافئ للطالب يوضح مستواه وأهم نقاط ضعفه",',
      '  "weakTopics": [',
      '    {',
      '      "courseName": "اسم المادة",',
      '      "chapterName": "اسم الفصل",',
      '      "lessonName": "اسم الدرس",',
      '      "mistakeCount": 3,',
      '      "severity": "HIGH" | "MEDIUM" | "LOW",',
      '      "diagnosis": "سبب ضعف الطالب في هذا الدرس بالتحديد",',
      '      "whatToStudy": "ماذا يذاكر ويركز عليه في هذا الدرس"',
      '    }',
      '  ],',
      '  "conceptReviews": [',
      '    {',
      '      "questionText": "نص السؤال",',
      '      "courseName": "اسم المادة",',
      '      "studentWrongAnswer": "إجابة الطالب الخاطئة",',
      '      "correctAnswer": "الإجابة الصحيحة",',
      '      "explanation": "شرح علمي مبسط لماذا الإجابة الصحيحة هي الصواب وكيف يتجنب هذا الخطأ"',
      '    }',
      '  ],',
      '  "actionPlan": ["خطوة عملية 1", "خطوة عملية 2", "خطوة عملية 3"]',
      '}',
    ].join('\n');

    const userPrompt = JSON.stringify(
      {
        totalMistakes: mistakes.length,
        groupedByLesson: sortedTopics.map(t => ({
          courseName: t.courseName,
          chapterName: t.chapterName,
          lessonName: t.lessonName,
          mistakeCount: t.items.length,
        })),
        topMistakesSample,
      },
      null,
      2,
    );

    const aiRes = await this.completeChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      1600,
      0.25,
    );

    if (aiRes?.text) {
      try {
        const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && typeof parsed.summary === 'string') {
            return {
              summary: parsed.summary,
              weakTopics: Array.isArray(parsed.weakTopics) ? parsed.weakTopics : [],
              conceptReviews: Array.isArray(parsed.conceptReviews) ? parsed.conceptReviews : [],
              actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
              generatedByAi: true,
            };
          }
        }
      } catch (e: any) {
        this.logger.warn(`Failed to parse AI mistake analysis JSON: ${e?.message}`);
      }
    }

    // Structured analytical fallback if no external API key is active yet
    return {
      summary: `تم تحليل ${mistakes.length} خطأ مسجل لك عبر ${sortedTopics.length} درس/فصل. أكثر الدروس التي تحتاج منك مراجعة مركّزة هي: ${sortedTopics
        .slice(0, 3)
        .map(t => `${t.lessonName} (${t.courseName})`)
        .join('، ')}.`,
      weakTopics: sortedTopics.slice(0, 6).map(t => ({
        courseName: t.courseName,
        chapterName: t.chapterName,
        lessonName: t.lessonName,
        mistakeCount: t.items.length,
        severity: t.items.length >= 3 ? 'HIGH' : t.items.length === 2 ? 'MEDIUM' : 'LOW',
        diagnosis: `لديك ${t.items.length} أخطاء في أسئلة "${t.lessonName}" (${t.chapterName}).`,
        whatToStudy: `أعد مشاهدة شرح حصة "${t.lessonName}" وركّز على القوانين والملاحظات الأساسية ثم أعد حل الأسئلة في وضع التدريب.`,
      })),
      conceptReviews: mistakes.slice(0, 6).map(m => ({
        questionText: m.questionText,
        courseName: m.courseName,
        studentWrongAnswer: m.isUnanswered
          ? 'لم تتم الإجابة'
          : m.studentAnswerText || m.studentAnswer || '—',
        correctAnswer: m.correctAnswerText || m.correctAnswer,
        explanation:
          m.explanation ||
          `راجع مفهوم هذا السؤال في درس "${m.lessonName || m.sourceTitle}" وتأكد من التفرقة بين "${m.studentAnswerText || 'اختيارك'}" والإجابة الصحيحة "${m.correctAnswerText}".`,
      })),
      actionPlan: [
        `ابدأ بمراجعة الدرس الأكثر أخطاءً: "${sortedTopics[0]?.lessonName}" في مادة "${sortedTopics[0]?.courseName}".`,
        'استخدم وضع "درّب نفسك عشوائياً على أخطائك" في أعلى الصفحة لحل الأسئلة التي أخطأت فيها بدون النظر للإجابة.',
        'لا تترك أي سؤال بدون إجابة في الكويزات القادمة، ودوّن القوانين التي أخطأت فيها في ملخصك الخاص.',
      ],
      generatedByAi: false,
    };
  }
}
