"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnswersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const answers_service_1 = require("./answers.service");
const answers_controller_1 = require("./answers.controller");
const answer_entity_1 = require("./entities/answer.entity");
const questions_module_1 = require("../questions/questions.module");
const notifications_module_1 = require("../notifications/notifications.module");
let AnswersModule = class AnswersModule {
};
exports.AnswersModule = AnswersModule;
exports.AnswersModule = AnswersModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([answer_entity_1.Answer]), questions_module_1.QuestionsModule, notifications_module_1.NotificationsModule],
        controllers: [answers_controller_1.AnswersController],
        providers: [answers_service_1.AnswersService],
        exports: [answers_service_1.AnswersService],
    })
], AnswersModule);
//# sourceMappingURL=answers.module.js.map