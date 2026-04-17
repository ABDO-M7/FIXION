import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: { default: 'Fixion — Educational Q&A Platform', template: '%s | Fixion' },
  description: 'AI-powered question answering platform with real teacher support',
  keywords: ['education', 'Q&A', 'learning', 'AI tutor', 'students'],
  authors: [{ name: 'Fixion' }],
  openGraph: {
    title: 'Fixion — Educational Q&A Platform',
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
