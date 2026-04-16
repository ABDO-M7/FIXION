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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/guards/auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const user_entity_1 = require("../users/entities/user.entity");
const users_service_1 = require("../users/users.service");
const questions_service_1 = require("../questions/questions.service");
const answers_service_1 = require("../answers/answers.service");
const subscriptions_service_1 = require("../subscriptions/subscriptions.service");
let AdminController = class AdminController {
    usersService;
    questionsService;
    answersService;
    subscriptionsService;
    constructor(usersService, questionsService, answersService, subscriptionsService) {
        this.usersService = usersService;
        this.questionsService = questionsService;
        this.answersService = answersService;
        this.subscriptionsService = subscriptionsService;
    }
    async overview() {
        const [users, questions, answers, subscriptions] = await Promise.all([
            this.usersService.getStats(),
            this.questionsService.getStats(),
            this.answersService.getStats(),
            this.subscriptionsService.getStats(),
        ]);
        return {
            users,
            questions,
            answers,
            subscriptions,
            generatedAt: new Date().toISOString(),
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "overview", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin/analytics'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        questions_service_1.QuestionsService,
        answers_service_1.AnswersService,
        subscriptions_service_1.SubscriptionsService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map