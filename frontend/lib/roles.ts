export const STAFF_ROLES = ['teacher', 'team_member', 'assistant'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role?: string | null) {
  return role === 'teacher' || role === 'team_member' || role === 'assistant';
}

export function dashboardPath(role?: string | null) {
  if (role === 'admin') return '/admin';
  if (isStaffRole(role)) return '/teacher';
  return '/student';
}
