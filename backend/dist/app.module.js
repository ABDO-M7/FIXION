"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const configuration_1 = require("./config/configuration");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const questions_module_1 = require("./modules/questions/questions.module");
const answers_module_1 = require("./modules/answers/answers.module");
const categories_module_1 = require("./modules/categories/categories.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const uploads_module_1 = require("./modules/uploads/uploads.module");
const admin_module_1 = require("./modules/admin/admin.module");
const health_module_1 = require("./health/health.module");
const user_entity_1 = require("./modules/users/entities/user.entity");
const question_entity_1 = require("./modules/questions/entities/question.entity");
const answer_entity_1 = require("./modules/answers/entities/answer.entity");
const category_entity_1 = require("./modules/categories/entities/category.entity");
const subscription_entity_1 = require("./modules/subscriptions/entities/subscription.entity");
const subscription_code_entity_1 = require("./modules/subscriptions/entities/subscription-code.entity");
const notification_entity_1 = require("./modules/notifications/entities/notification.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.databaseConfig, configuration_1.jwtConfig, configuration_1.r2Config, configuration_1.googleConfig, configuration_1.resendConfig, configuration_1.appConfig],
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    url: config.get('database.url'),
                    ssl: config.get('database.ssl'),
                    entities: [user_entity_1.User, question_entity_1.Question, answer_entity_1.Answer, category_entity_1.Category, subscription_entity_1.Subscription, subscription_code_entity_1.SubscriptionCode, notification_entity_1.Notification],
                    synchronize: config.get('app.nodeEnv') !== 'production',
                    logging: config.get('app.nodeEnv') === 'development',
                    extra: {
                        max: 10,
                    },
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'default', ttl: 60000, limit: 100 },
                { name: 'auth', ttl: 60000, limit: 10 },
            ]),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            questions_module_1.QuestionsModule,
            answers_module_1.AnswersModule,
            categories_module_1.CategoriesModule,
            subscriptions_module_1.SubscriptionsModule,
            notifications_module_1.NotificationsModule,
            uploads_module_1.UploadsModule,
            admin_module_1.AdminModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map