import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import {
  databaseConfig,
  jwtConfig,
  r2Config,
  googleConfig,
  resendConfig,
  appConfig,
} from './config/configuration';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { AnswersModule } from './modules/answers/answers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './health/health.module';

import { User } from './modules/users/entities/user.entity';
import { Question } from './modules/questions/entities/question.entity';
import { Answer } from './modules/answers/entities/answer.entity';
import { Category } from './modules/categories/entities/category.entity';
import { Subscription } from './modules/subscriptions/entities/subscription.entity';
import { SubscriptionCode } from './modules/subscriptions/entities/subscription-code.entity';
import { Notification } from './modules/notifications/entities/notification.entity';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, r2Config, googleConfig, resendConfig, appConfig],
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        ssl: config.get('database.ssl'),
        entities: [User, Question, Answer, Category, Subscription, SubscriptionCode, Notification],
        synchronize: config.get('app.nodeEnv') !== 'production', // Use migrations in prod
        logging: config.get('app.nodeEnv') === 'development',
        extra: {
          max: 10, // connection pool
        },
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 100 },
      { name: 'auth', ttl: 60000, limit: 10 },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    QuestionsModule,
    AnswersModule,
    CategoriesModule,
    SubscriptionsModule,
    NotificationsModule,
    UploadsModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
