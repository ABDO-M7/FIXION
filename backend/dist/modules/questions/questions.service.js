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
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const question_entity_1 = require("./entities/question.entity");
const user_entity_1 = require("../users/entities/user.entity");
let QuestionsService = class QuestionsService {
    questionsRepo;
    constructor(questionsRepo) {
        this.questionsRepo = questionsRepo;
    }
    async create(dto, student) {
        const question = this.questionsRepo.create({
            ...dto,
            studentId: student.id,
        });
        return this.questionsRepo.save(question);
    }
    async findMyQuestions(studentId, page = 1, limit = 10) {
        const [data, total] = await this.questionsRepo.findAndCount({
            where: { studentId },
            relations: ['answers', 'category'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findAll(dto) {
        const page = parseInt(dto.page || '1');
        const limit = parseInt(dto.limit || '20');
        const qb = this.questionsRepo
            .createQueryBuilder('q')
            .leftJoinAndSelect('q.student', 'student')
            .leftJoinAndSelect('q.category', 'category')
            .leftJoinAndSelect('q.answers', 'answers')
            .orderBy('q.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (dto.status)
            qb.andWhere('q.status = :status', { status: dto.status });
        if (dto.search) {
            qb.andWhere(`to_tsvector('english', q.content) @@ plainto_tsquery('english', :search)`, { search: dto.search });
        }
        if (dto.subject) {
            qb.andWhere('category.subject ILIKE :subject', { subject: `%${dto.subject}%` });
        }
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findOne(id) {
        const q = await this.questionsRepo.findOne({
            where: { id },
            relations: ['student', 'category', 'answers', 'answers.teacher'],
        });
        if (!q)
            throw new common_1.NotFoundException('Question not found');
        return q;
    }
    async updateStatus(id, status) {
        await this.questionsRepo.update(id, { status });
        return this.findOne(id);
    }
    async assignCategory(id, categoryId) {
        await this.questionsRepo.update(id, { categoryId });
        return this.findOne(id);
    }
    async remove(id, user) {
        const q = await this.findOne(id);
        if (user.role === user_entity_1.UserRole.STUDENT && q.studentId !== user.id) {
            throw new common_1.ForbiddenException('Not allowed');
        }
        await this.questionsRepo.remove(q);
    }
    async getStats() {
        const total = await this.questionsRepo.count();
        const pending = await this.questionsRepo.count({ where: { status: question_entity_1.QuestionStatus.PENDING } });
        const answered = await this.questionsRepo.count({ where: { status: question_entity_1.QuestionStatus.ANSWERED } });
        return { total, pending, answered };
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(question_entity_1.Question)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map