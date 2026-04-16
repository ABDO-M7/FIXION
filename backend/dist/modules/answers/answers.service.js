"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnswersService = exports.CreateAnswerDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const answer_entity_1 = require("./entities/answer.entity");
const questions_service_1 = require("../questions/questions.service");
const notifications_service_1 = require("../notifications/notifications.service");
const user_entity_1 = require("../users/entities/user.entity");
const question_entity_1 = require("../questions/entities/question.entity");
class CreateAnswerDto {
    content;
    attachments;
}
exports.CreateAnswerDto = CreateAnswerDto;
let AnswersService = class AnswersService {
    answersRepo;
    questionsService;
    notificationsService;
    constructor(answersRepo, questionsService, notificationsService) {
        this.answersRepo = answersRepo;
        this.questionsService = questionsService;
        this.notificationsService = notificationsService;
    }
    async create(questionId, dto, teacher) {
        const question = await this.questionsService.findOne(questionId);
        const answer = await this.answersRepo.save(this.answersRepo.create({
            ...dto,
            questionId,
            teacherId: teacher.id,
        }));
        await this.questionsService.updateStatus(questionId, question_entity_1.QuestionStatus.ANSWERED);
        await this.notificationsService.notifyAnswered(question.studentId, question.id, question.content.substring(0, 80));
        return answer;
    }
    async findByQuestion(questionId) {
        return this.answersRepo.find({
            where: { questionId },
            relations: ['teacher'],
            order: { createdAt: 'ASC' },
        });
    }
    async update(id, dto, teacher) {
        const answer = await this.answersRepo.findOne({ where: { id } });
        if (!answer)
            throw new common_1.NotFoundException('Answer not found');
        if (answer.teacherId !== teacher.id && teacher.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Not allowed to edit this answer');
        }
        Object.assign(answer, dto);
        return this.answersRepo.save(answer);
    }
    async remove(id, user) {
        const answer = await this.answersRepo.findOne({ where: { id } });
        if (!answer)
            throw new common_1.NotFoundException('Answer not found');
        if (user.role !== user_entity_1.UserRole.ADMIN && answer.teacherId !== user.id) {
            throw new common_1.ForbiddenException('Not allowed');
        }
        await this.answersRepo.remove(answer);
    }
    async getStats() {
        return { total: await this.answersRepo.count() };
    }
};
exports.AnswersService = AnswersService;
exports.AnswersService = AnswersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(answer_entity_1.Answer)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        questions_service_1.QuestionsService,
        notifications_service_1.NotificationsService])
], AnswersService);
//# sourceMappingURL=answers.service.js.map