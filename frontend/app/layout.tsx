import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: { default: 'FIXION | Learning has no limits', template: '%s | FIXION' },
  description: 'A complete learning platform for students and teachers: courses, video lessons, quizzes, assignments, support, and progress.',
  keywords: ['education', 'courses', 'video lessons', 'quizzes', 'students', 'teachers'],
  authors: [{ name: 'FIXION' }],
  openGraph: {
    title: 'FIXION | Learning has no limits',
    description: 'Courses, video lessons, assessments, teacher support, and progress in one place.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{ className: 'toast-style', duration: 4000, success: { iconTheme: { primary: '#25d6d1', secondary: '#06101b' } }, error: { iconTheme: { primary: '#ef6a6a', secondary: '#fff' } } }} />
      </body>
    </html>
  );
}
