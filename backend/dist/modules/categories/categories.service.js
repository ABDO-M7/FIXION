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
exports.CategoriesService = exports.CreateCategoryDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("./entities/category.entity");
class CreateCategoryDto {
    subject;
    bookName;
    chapter;
    lesson;
    questionNumber;
}
exports.CreateCategoryDto = CreateCategoryDto;
let CategoriesService = class CategoriesService {
    categoriesRepo;
    constructor(categoriesRepo) {
        this.categoriesRepo = categoriesRepo;
    }
    async create(dto) {
        return this.categoriesRepo.save(this.categoriesRepo.create(dto));
    }
    async findAll(subject) {
        const qb = this.categoriesRepo.createQueryBuilder('c').orderBy('c.subject').addOrderBy('c.bookName');
        if (subject)
            qb.where('c.subject ILIKE :subject', { subject: `%${subject}%` });
        return qb.getMany();
    }
    async update(id, dto) {
        await this.categoriesRepo.update(id, dto);
        return this.categoriesRepo.findOne({ where: { id } });
    }
    async remove(id) {
        await this.categoriesRepo.delete(id);
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map