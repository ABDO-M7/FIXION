import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: { default: 'EduQ&A — Educational Q&A Platform', template: '%s | EduQ&A' },
  description: 'Connect students with teachers. Submit academic questions and get expert answers.',
  keywords: ['education', 'Q&A', 'students', 'teachers', 'academic help'],
  authors: [{ name: 'EduQ&A' }],
  openGraph: {
    title: 'EduQ&A — Educational Q&A Platform',
    description: 'Submit questions, get expert answers from qualified teachers.',
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
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'toast-style',
            duration: 4000,
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
