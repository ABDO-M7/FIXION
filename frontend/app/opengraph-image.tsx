import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FIXION — Complete Learning Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #06101b 0%, #0d2742 55%, #07192b 100%)',
          color: '#f2f7fb',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '10px 20px',
              borderRadius: '999px',
              border: '1px solid rgba(37, 214, 209, 0.35)',
              background: 'rgba(37, 214, 209, 0.1)',
              color: '#62d9dd',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            FIXION EDUCATION
          </div>
          <div
            style={{
              fontSize: 18,
              color: '#8fa9b9',
              letterSpacing: '0.12em',
            }}
          >
            COURSES • VIDEOS • QUIZZES • SUPPORT
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '920px' }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: '-0.04em',
              color: '#ffffff',
            }}
          >
            Your complete learning journey, in one place.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.45,
              color: '#9bb5c7',
            }}
          >
            Structured video lessons, interactive checkpoints, quizzes, assignments, and direct teacher support.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(168, 208, 229, 0.18)',
            paddingTop: '24px',
            fontSize: 20,
            color: '#62d9dd',
          }}
        >
          <span>fixion.education</span>
          <span style={{ color: '#9bb5c7' }}>Learn smarter. Track progress. Feel in control.</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

