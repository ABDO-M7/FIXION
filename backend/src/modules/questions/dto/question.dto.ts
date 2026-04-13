import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { QuestionStatus } from '../entities/question.entity';

export class CreateQuestionDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class UpdateQuestionStatusDto {
  @IsEnum(QuestionStatus)
  status: QuestionStatus;
}

export class AssignCategoryDto {
  @IsUUID()
  categoryId: string;
}

export class SearchQuestionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
