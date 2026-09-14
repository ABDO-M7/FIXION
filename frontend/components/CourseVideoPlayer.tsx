'use client';

import { Play, Pause, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type CourseVideo = {
  id: string;
  title: string;
  description?: string | null;
  youtubeVideoId: string;
  createdAt: string;
};

export function CourseVideoPlayer({ video }: { video: CourseVideo }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);

  const command = (func: 'playVideo' | 'pauseVideo') => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  };

  const start = () => {
    setStarted(true);
    setPlaying(true);
  };

  useEffect(() => {
    if (started && playing) command('playVideo');
  }, [started, playing]);

  return (
    <article className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#09090b' }}>
        {started ? (
          <iframe
            ref={iframeRef}
            title={video.title}
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&fs=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: 'absolute', inset: '-7% -6%', width: '112%', height: '114%', border: 0 }}
          />
        ) : (
          <button
            onClick={start}
            aria-label={`Play ${video.title}`}
            style={{ position: 'absolute', inset: 0, border: 0, cursor: 'pointer', color: '#fff', background: `linear-gradient(135deg, #171717 0%, #292524 100%), url(https://i.ytimg.com/vi/${video.youtubeVideoId}/maxresdefault.jpg) center / cover`, display: 'grid', placeItems: 'center' }}
          >
            <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.45)' }}><Play fill="currentColor" size={26} /></span>
          </button>
        )}
        {started && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
            {/* Covers the provider's title/watermark areas with the app's own chrome. */}
            <div style={{ position: 'absolute', inset: '0 0 auto', height: 74, background: 'linear-gradient(#080d15 0%, #080d15 72%, rgba(8,13,21,.96) 86%, transparent 100%)' }} />
            <div style={{ position: 'absolute', inset: 'auto 0 0', height: 92, background: 'linear-gradient(transparent, #080d15 34%, #080d15 100%)' }} />
            <div style={{ position: 'absolute', left: 18, top: 16, color: 'rgba(255,255,255,.88)', fontSize: 12, fontWeight: 700, letterSpacing: '.03em' }}>FIXION • {video.title}</div>
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="icon-btn"
                onClick={() => { const next = !playing; setPlaying(next); command(next ? 'playVideo' : 'pauseVideo'); }}
                aria-label={playing ? 'Pause video' : 'Play video'}
                style={{ pointerEvents: 'auto', color: '#fff', background: 'rgba(0,0,0,.72)', border: '1px solid rgba(255,255,255,.25)' }}
              >{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
              <Volume2 size={16} style={{ color: '#fff', filter: 'drop-shadow(0 1px 2px #000)' }} />
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,.82)', fontSize: 11, fontWeight: 700, letterSpacing: '.04em' }}>FIXION</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '16px 18px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{video.title}</h3>
        {video.description && <p style={{ margin: '7px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{video.description}</p>}
      </div>
    </article>
  );
}
