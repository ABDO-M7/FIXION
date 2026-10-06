import {
  BadRequestException,
  Controller, Get, Patch, Post, Delete, Param, Body, UseGuards, Query
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from './entities/user.entity';

const CREATABLE_STAFF_ROLES = [UserRole.TEACHER, UserRole.TEAM_MEMBER, UserRole.ASSISTANT];

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return user;
  }

  @Patch('me')
  updateMe(@CurrentUser('id') id: string, @Body() body: any) {
    const { role, isActive, isVerified, subjects, assignedTeacherId, ...safe } = body;
    return this.usersService.update(id, safe);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: UserRole,
  ) {
    return this.usersService.findAll(+page, +limit, role);
  }

  @Post('teachers')
  @Roles(UserRole.ADMIN)
  createTeacher(@Body() body: { name?: string }) {
    return this.createStaff({ ...body, role: UserRole.TEACHER });
  }

  @Post('staff')
  @Roles(UserRole.ADMIN)
  async createStaff(@Body() body: {
    name?: string;
    role?: UserRole;
    subjects?: string[];
    assignedTeacherId?: string;
  }) {
    const name = body.name?.trim();
    const role = body.role || UserRole.TEACHER;

    if (!name) throw new BadRequestException('Name is required');
    if (!CREATABLE_STAFF_ROLES.includes(role)) {
      throw new BadRequestException('Invalid staff role');
    }

    let assignedTeacherId: string | null = null;
    let subjects: string[] = Array.isArray(body.subjects) ? body.subjects : [];

    if (role === UserRole.TEAM_MEMBER) {
      if (!subjects.length) throw new BadRequestException('Team member must be assigned to a subject');
      assignedTeacherId = null;
    }

    if (role === UserRole.ASSISTANT) {
      if (!body.assignedTeacherId) throw new BadRequestException('Assistant must be assigned to a teacher');
      const teacher = await this.usersService.findById(body.assignedTeacherId);
      if (!teacher || teacher.role !== UserRole.TEACHER) {
        throw new BadRequestException('Assigned teacher was not found');
      }
      assignedTeacherId = teacher.id;
      subjects = [];
    }

    if (role === UserRole.TEACHER) {
      assignedTeacherId = null;
      subjects = [];
    }

    const staff = await this.usersService.create({
      name,
      role,
      subjects,
      assignedTeacherId,
      isActive: true,
    });

    const { passwordHash: _passwordHash, ...safeStaff } = staff;
    return safeStaff;
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.usersService.update(id, { isActive });
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  updateRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.usersService.update(id, { role });
  }

  @Patch(':id/subjects')
  @Roles(UserRole.ADMIN)
  async updateSubjects(@Param('id') id: string, @Body('subjects') subjects: string[]) {
    const user = await this.usersService.findById(id);
    if (!user) throw new BadRequestException('User not found');
    if (user.role !== UserRole.TEAM_MEMBER) {
      throw new BadRequestException('Only team members can be assigned subjects');
    }
    if (!Array.isArray(subjects) || subjects.length === 0) {
      throw new BadRequestException('Choose at least one subject');
    }
    return this.usersService.update(id, { subjects });
  }

  @Patch(':id/assigned-teacher')
  @Roles(UserRole.ADMIN)
  async updateAssignedTeacher(@Param('id') id: string, @Body('assignedTeacherId') assignedTeacherId: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new BadRequestException('User not found');
    if (user.role !== UserRole.ASSISTANT) {
      throw new BadRequestException('Only assistants can be assigned to a teacher');
    }
    const teacher = await this.usersService.findById(assignedTeacherId);
    if (!teacher || teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('Assigned teacher was not found');
    }
    return this.usersService.update(id, { assignedTeacherId: teacher.id });
  }

  @Patch(':id/permissions')
  @Roles(UserRole.ADMIN)
  async updatePermissions(@Param('id') id: string, @Body('permissions') permissions: Record<string, boolean>) {
    const user = await this.usersService.findById(id);
    if (!user) throw new BadRequestException('User not found');
    if (user.role !== UserRole.TEACHER) {
      throw new BadRequestException('Student services can only be managed for teachers');
    }
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
      throw new BadRequestException('Permissions must be an object');
    }
    const safePermissions = Object.fromEntries(Object.entries(permissions).map(([key, value]) => [key, value === true]));
    return this.usersService.update(id, { permissions: safePermissions });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
