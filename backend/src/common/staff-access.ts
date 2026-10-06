import { Repository } from 'typeorm';
import { User, UserRole } from '../modules/users/entities/user.entity';

export const STAFF_ROLES = [UserRole.TEAM_MEMBER, UserRole.TEACHER, UserRole.ASSISTANT] as const;
export const STAFF_AND_ADMIN = [...STAFF_ROLES, UserRole.ADMIN];

export type StaffScope =
  | { type: 'admin' }
  | { type: 'subjects'; subjects: string[] }
  | { type: 'teacher'; teacherId: string; teacherName: string };

export function isStaffRole(role: UserRole | string | undefined | null) {
  return role === UserRole.TEAM_MEMBER || role === UserRole.TEACHER || role === UserRole.ASSISTANT;
}

export async function resolveStaffScope(usersRepo: Repository<User>, user: User): Promise<StaffScope> {
  if (user.role === UserRole.ADMIN) return { type: 'admin' };

  if (user.role === UserRole.TEAM_MEMBER) {
    return { type: 'subjects', subjects: Array.isArray(user.subjects) ? user.subjects : [] };
  }

  if (user.role === UserRole.ASSISTANT) {
    if (!user.assignedTeacherId) return { type: 'teacher', teacherId: '', teacherName: '' };
    const teacher = await usersRepo.findOne({ where: { id: user.assignedTeacherId } });
    if (!teacher) return { type: 'teacher', teacherId: '', teacherName: '' };
    return { type: 'teacher', teacherId: teacher.id, teacherName: teacher.name };
  }

  return { type: 'teacher', teacherId: user.id, teacherName: user.name };
}

export function workOwnerId(scope: StaffScope, actor: User) {
  if (scope.type === 'teacher' && scope.teacherId) return scope.teacherId;
  return actor.id;
}

export function canManageOwnedWork(scope: StaffScope, actor: User, ownerId: string) {
  if (scope.type === 'admin') return true;
  if (ownerId === actor.id) return true;
  return scope.type === 'teacher' && !!scope.teacherId && ownerId === scope.teacherId;
}
