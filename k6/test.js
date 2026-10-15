import http from 'k6/http';
import { check, sleep } from 'k6';

const apiUrl = (__ENV.API_URL || 'https://fixion.onrender.com/api/v1').replace(/\/$/, '');
const siteUrl = __ENV.SITE_URL || 'https://fixion.vercel.app';
const courseName = __ENV.K6_COURSE;
const groupName = __ENV.K6_GROUP;

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (!courseName || !groupName) {
    throw new Error('Set K6_COURSE and K6_GROUP before running this test.');
  }

  let accessToken = (__ENV.K6_TOKEN || '').trim().replace(/^Bearer\s+/i, '');
  if (!accessToken) {
    if (!__ENV.K6_EMAIL || !__ENV.K6_PASSWORD) {
      throw new Error('Set K6_TOKEN, or set both K6_EMAIL and K6_PASSWORD, before running this test.');
    }

    const response = http.post(
      `${apiUrl}/auth/login`,
      JSON.stringify({ email: __ENV.K6_EMAIL, password: __ENV.K6_PASSWORD }),
      { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login-setup' } },
    );
    const loginSucceeded = check(response, {
      'test student login succeeds': (result) => result.status === 200 && Boolean(result.json('accessToken')),
    });

    if (!loginSucceeded) {
      throw new Error(`Test account login failed (HTTP ${response.status}); stopping before load stages.`);
    }

    accessToken = response.json('accessToken');
  }

  const headers = { Authorization: `Bearer ${accessToken}` };
  const enrollmentsResponse = http.get(`${apiUrl}/enrollments/my`, {
    headers,
    tags: { endpoint: 'enrollments-setup' },
  });
  if (enrollmentsResponse.status !== 200) {
    throw new Error(`Test token validation failed (HTTP ${enrollmentsResponse.status}); stopping before load stages.`);
  }

  const enrollments = enrollmentsResponse.json();
  const hasEnrollment = Array.isArray(enrollments) && enrollments.some(
    (enrollment) => enrollment.courseName === courseName && enrollment.groupName === groupName,
  );

  if (!hasEnrollment) {
    throw new Error(`Test account has no active enrollment for "${courseName}" / "${groupName}".`);
  }

  return { headers };
}

export default function ({ headers }) {
  const encodedCourse = encodeURIComponent(courseName);
  const encodedGroup = encodeURIComponent(groupName);

  const homepage = http.get(siteUrl, { tags: { endpoint: 'frontend-homepage' } });
  check(homepage, { 'frontend homepage returns 200': (response) => response.status === 200 });

  const videos = http.get(
    `${apiUrl}/videos/student/${encodedCourse}/${encodedGroup}`,
    { headers, tags: { endpoint: 'student-videos' } },
  );
  check(videos, { 'student videos return 200': (response) => response.status === 200 });

  const assignments = http.get(
    `${apiUrl}/assignments/student/courses/${encodedCourse}/groups/${encodedGroup}`,
    { headers, tags: { endpoint: 'student-assignments' } },
  );
  check(assignments, { 'student assignments return 200': (response) => response.status === 200 });

  const enrollments = http.get(`${apiUrl}/enrollments/my`, {
    headers,
    tags: { endpoint: 'student-enrollments' },
  });
  check(enrollments, { 'student enrollments return 200': (response) => response.status === 200 });

  sleep(1);
}
