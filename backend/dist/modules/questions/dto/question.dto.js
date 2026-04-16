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
exports.SearchQuestionsDto = exports.AssignCategoryDto = exports.UpdateQuestionStatusDto = exports.CreateQuestionDto = void 0;
const class_validator_1 = require("class-validator");
const question_entity_1 = require("../entities/question.entity");
class CreateQuestionDto {
    content;
    attachments;
}
exports.CreateQuestionDto = CreateQuestionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateQuestionDto.prototype, "attachments", void 0);
class UpdateQuestionStatusDto {
    status;
}
exports.UpdateQuestionStatusDto = UpdateQuestionStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(question_entity_1.QuestionStatus),
    __metadata("design:type", String)
], UpdateQuestionStatusDto.prototype, "status", void 0);
class AssignCategoryDto {
    categoryId;
}
exports.AssignCategoryDto = AssignCategoryDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AssignCategoryDto.prototype, "categoryId", void 0);
class SearchQuestionsDto {
    search;
    status;
    subject;
    page;
    limit;
}
exports.SearchQuestionsDto = SearchQuestionsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchQuestionsDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(question_entity_1.QuestionStatus),
    __metadata("design:type", String)
], SearchQuestionsDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchQuestionsDto.prototype, "subject", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchQuestionsDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SearchQuestionsDto.prototype, "limit", void 0);
//# sourceMappingURL=question.dto.js.map