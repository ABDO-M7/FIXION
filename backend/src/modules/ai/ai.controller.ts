import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Header,
} from '@nestjs/common';
import { AiService, ChatMessageDto } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AssignmentsService } from '../assignments/assignments.service';
import { AiProviderType } from './entities/ai-api-key.entity';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  // ── ADMIN: List all AI API keys & remaining quotas ────────────────────────
  @Get('admin/keys')
  @Header('Cache-Control', 'no-store')
  @Roles(UserRole.ADMIN)
  listKeys() {
    return this.aiService.listKeysWithQuota();
  }

  // ── ADMIN: Add a new AI API key (supports single or batch newline keys) ───
  @Post('admin/keys')
  @Roles(UserRole.ADMIN)
  addKey(
    @Body()
    dto: {
      label?: string;
      provider?: AiProviderType;
      apiKey: string;
      model?: string;
      dailyRequestLimit?: number;
      dailyTokenLimit?: number;
    },
  ) {
    return this.aiService.addKey(dto);
  }

  // ── ADMIN: Update key settings or toggle active ───────────────────────────
  @Patch('admin/keys/:id')
  @Roles(UserRole.ADMIN)
  updateKey(@Param('id') id: string, @Body() dto: any) {
    return this.aiService.updateKey(id, dto);
  }

  // ── ADMIN: Reset daily quota counter for a key ────────────────────────────
  @Post('admin/keys/:id/reset-quota')
  @Roles(UserRole.ADMIN)
  resetKeyQuota(@Param('id') id: string) {
    return this.aiService.resetKeyQuota(id);
  }

  // ── ADMIN: Test connection for a specific key ─────────────────────────────
  @Post('admin/keys/:id/test')
  @Roles(UserRole.ADMIN)
  testKey(@Param('id') id: string) {
    return this.aiService.testKey(id);
  }

  // ── ADMIN: Delete an API key ──────────────────────────────────────────────
  @Delete('admin/keys/:id')
  @Roles(UserRole.ADMIN)
  deleteKey(@Param('id') id: string) {
    return this.aiService.deleteKey(id);
  }

  // ── ALL LOGGED-IN USERS: AI Tutor Chatbot ─────────────────────────────────
  @Post('chat')
  chat(
    @CurrentUser() user: any,
    @Body('messages') messages: ChatMessageDto[],
    @Body('courseContext') courseContext?: string,
  ) {
    return this.aiService.chatWithTutor(user, messages, courseContext);
  }

  // ── STUDENT: AI Mistakes Analyzer ("ضعيف في دروس ايه ومحتاج يذاكر ايه") ───
  @Post('student/analyze-mistakes')
  @Roles(UserRole.STUDENT)
  async analyzeMistakes(
    @CurrentUser() student: any,
    @Body('courseName') courseName?: string,
  ) {
    let mistakes = await this.assignmentsService.getStudentMistakes(student.id);
    if (courseName && courseName !== 'ALL') {
      mistakes = mistakes.filter(m => m.courseName === courseName);
    }
    return this.aiService.analyzeStudentMistakes(student?.name || 'الطالب', mistakes);
  }
}

