import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiApiKey } from './entities/ai-api-key.entity';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiApiKey]),
    forwardRef(() => AssignmentsModule),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

