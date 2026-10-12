'use client';

import * as Sentry from '@sentry/nextjs';
import Image from 'next/image';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#080d18', color: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <main style={{ maxWidth: 440, padding: 32, textAlign: 'center' }}>
          <Image src="/brand/icon.png" alt="FIXION" width={56} height={56} style={{ marginBottom: 20, borderRadius: 14 }} />
          <h1 style={{ margin: '0 0 12px', fontSize: 24 }}>حدث خطأ غير متوقع</h1>
          <p style={{ margin: '0 0 24px', color: '#aab4c5', lineHeight: 1.7 }}>تم تسجيل المشكلة، حاول إعادة تحميل الصفحة.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: '10px 18px', border: 0, borderRadius: 8, background: '#20c4ce', color: '#06101b', fontWeight: 700, cursor: 'pointer' }}
          >
            حاول مرة أخرى
          </button>
        </main>
      </body>
    </html>
  );
}
