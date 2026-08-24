import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, IsUUID, IsNotEmpty } from 'class-validator';
import { QuestionStatus } from '../entities/question.entity';

export class CreateQuestionDto {
  @IsString()
  content: string;

  @IsString()
  @IsNotEmpty()
  courseName: string;

  @IsOptional()
  @IsString()
  bookName?: string;

  @IsOptional()
  @IsString()
  chapter?: string;

  @IsOptional()
  @IsString()
  lesson?: string;

  @IsOptional()
  @IsString()
  questionNumber?: string;

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
