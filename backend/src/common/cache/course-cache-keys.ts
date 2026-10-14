import { createHash } from 'crypto';

function courseGroupHash(courseName: string, groupName: string): string {
  return createHash('sha256').update(JSON.stringify([courseName, groupName])).digest('hex');
}

export function courseContentVersionKey(courseName: string, groupName: string): string {
  return `fixion:v1:course:${courseGroupHash(courseName, groupName)}:content-version`;
}

export function studentCourseVersionKey(courseName: string, groupName: string, studentId: string): string {
  return `fixion:v1:course:${courseGroupHash(courseName, groupName)}:student:${studentId}:version`;
}

export function studentCourseCacheKey(
  kind: 'videos' | 'assignments',
  courseName: string,
  groupName: string,
  studentId: string,
): string {
  return `fixion:v1:${kind}:${courseGroupHash(courseName, groupName)}:student:${studentId}`;
}
