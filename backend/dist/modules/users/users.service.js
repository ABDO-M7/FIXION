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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
let UsersService = class UsersService {
    usersRepo;
    constructor(usersRepo) {
        this.usersRepo = usersRepo;
    }
    async create(data) {
        const user = this.usersRepo.create(data);
        return this.usersRepo.save(user);
    }
    async findById(id) {
        return this.usersRepo.findOne({ where: { id } });
    }
    async findByEmail(email) {
        return this.usersRepo.findOne({ where: { email } });
    }
    async findByEmailWithPassword(email) {
        return this.usersRepo
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.email = :email', { email })
            .getOne();
    }
    async findByOAuth(provider, oauthId) {
        return this.usersRepo.findOne({ where: { oauthProvider: provider, oauthId } });
    }
    async findByVerificationToken(token) {
        return this.usersRepo.findOne({ where: { emailVerificationToken: token } });
    }
    async markVerified(id) {
        await this.usersRepo.update(id, {
            isVerified: true,
            emailVerificationToken: null,
        });
    }
    async saveRefreshTokenHash(id, hash) {
        await this.usersRepo.update(id, { refreshTokenHash: hash });
    }
    async getRefreshTokenHash(id) {
        const user = await this.usersRepo
            .createQueryBuilder('user')
            .addSelect('user.refreshTokenHash')
            .where('user.id = :id', { id })
            .getOne();
        return user?.refreshTokenHash ?? null;
    }
    async clearRefreshToken(id) {
        await this.usersRepo.update(id, { refreshTokenHash: null });
    }
    async updateOAuth(id, provider, oauthId) {
        await this.usersRepo.update(id, { oauthProvider: provider, oauthId });
        return this.findById(id);
    }
    async findAll(page = 1, limit = 20, role) {
        const qb = this.usersRepo.createQueryBuilder('user');
        if (role)
            qb.where('user.role = :role', { role });
        qb.skip((page - 1) * limit).take(limit).orderBy('user.createdAt', 'DESC');
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async update(id, data) {
        await this.usersRepo.update(id, data);
        return this.findById(id);
    }
    async remove(id) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.usersRepo.remove(user);
    }
    async getStats() {
        const total = await this.usersRepo.count();
        const students = await this.usersRepo.count({ where: { role: user_entity_1.UserRole.STUDENT } });
        const teachers = await this.usersRepo.count({ where: { role: user_entity_1.UserRole.TEACHER } });
        return { total, students, teachers };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map