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
exports.AnswersController = void 0;
const common_1 = require("@nestjs/common");
const answers_service_1 = require("./answers.service");
const auth_guard_1 = require("../auth/guards/auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
let AnswersController = class AnswersController {
    answersService;
    constructor(answersService) {
        this.answersService = answersService;
    }
    create(questionId, dto, user) {
        return this.answersService.create(questionId, dto, user);
    }
    findByQuestion(questionId) {
        return this.answersService.findByQuestion(questionId);
    }
    update(id, dto, user) {
        return this.answersService.update(id, dto, user);
    }
    remove(id, user) {
        return this.answersService.remove(id, user);
    }
};
exports.AnswersController = AnswersController;
__decorate([
    (0, common_1.Post)('questions/:questionId/answers'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.TEACHER, user_entity_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('questionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, answers_service_1.CreateAnswerDto, Object]),
    __metadata("design:returntype", void 0)
], AnswersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('questions/:questionId/answers'),
    __param(0, (0, common_1.Param)('questionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AnswersController.prototype, "findByQuestion", null);
__decorate([
    (0, common_1.Patch)('answers/:id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.TEACHER, user_entity_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AnswersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('answers/:id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnswersController.prototype, "remove", null);
exports.AnswersController = AnswersController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [answers_service_1.AnswersService])
], AnswersController);
//# sourceMappingURL=answers.controller.js.map