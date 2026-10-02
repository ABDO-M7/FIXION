'use client';

import { CheckCircle2, FileUp, Pause, Play, Send, Volume2 } from 'lucide-react';
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { uploadsApi, videosApi } from '@/lib/api';

export type VideoCheckpoint = {
  id: string;
  timestampSeconds: number;
  orderIndex: number;
  prompt: string;
  type: 'MCQ' | 'ESSAY';
  options: { id: string; text: string }[];
  requireSolutionUpload: boolean;
  showSolutionAfterAnswer: boolean;
  solutionText?: string | null;
  solutionUrl?: string | null;
  response?: { isCorrect: boolean; attempts: number } | null;
};

export type InteractiveCourseVideo = {
  id: string;
  title: string;
  description?: string | null;
  provider?: 'youtube' | 'vimeo' | 'wistia' | 'bunny' | string;
  providerVideoId?: string | null;
  youtubeVideoId?: string | null;
};

type Experience = { video: InteractiveCourseVideo; checkpoints: VideoCheckpoint[] };

function providerUrl(video: InteractiveCourseVideo) {
  const provider = video.provider || 'youtube';
  const id = video.providerVideoId || video.youtubeVideoId || '';
  if (provider === 'vimeo') return 'https://player.vimeo.com/video/' + id + '?api=1&background=1&controls=0&title=0&byline=0&portrait=0&dnt=1';
  if (provider === 'wistia') return 'https://fast.wistia.net/embed/iframe/' + id + '?controlsVisibleOnLoad=false&playbar=false&smallPlayButton=false&branding=false';
  if (provider === 'bunny') return 'https://player.mediadelivery.net/embed/' + id + '?autoplay=false&controls=false&responsive=true&preload=true';
  const origin = typeof window !== 'undefined' ? '&origin=' + encodeURIComponent(window.location.origin) : '';
  return 'https://www.youtube.com/embed/' + id + '?enablejsapi=1&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&fs=0' + origin;
}

function playerOrigin(provider: string) {
  if (provider === 'vimeo') return 'https://player.vimeo.com';
  if (provider === 'wistia') return 'https://fast.wistia.net';
  if (provider === 'bunny') return 'https://player.mediadelivery.net';
  return 'https://www.youtube-nocookie.com';
}

export default function InteractiveCourseVideoPlayer({ video, preview = false }: { video: InteractiveCourseVideo; preview?: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wistiaElementRef = useRef<HTMLElement>(null);
  const providerPlayerRef = useRef<any>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loadingExperience, setLoadingExperience] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [pending, setPending] = useState<VideoCheckpoint | null>(null);
  const [answer, setAnswer] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [solution, setSolution] = useState<{ text?: string | null; url?: string | null } | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const provider = video.provider || 'youtube';
  const checkpoints = experience?.checkpoints || [];
  const solvedIds = useMemo(() => new Set(checkpoints.filter(item => item.response?.isCorrect).map(item => item.id)), [checkpoints]);

  const sendPlayerCommand = useCallback((command: string) => {
    if (provider === 'youtube' && providerPlayerRef.current) {
      if (command === 'playVideo') providerPlayerRef.current.playVideo?.();
      if (command === 'pauseVideo') providerPlayerRef.current.pauseVideo?.();
      return;
    }
    if (provider === 'wistia' && providerPlayerRef.current) {
      if (command === 'playVideo') providerPlayerRef.current.play?.();
      if (command === 'pauseVideo') providerPlayerRef.current.pause?.();
      return;
    }
    if (provider === 'bunny' && providerPlayerRef.current) {
      if (command === 'playVideo') providerPlayerRef.current.play?.();
      if (command === 'pauseVideo') providerPlayerRef.current.pause?.();
      return;
    }
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    if (provider === 'vimeo') {
      target.postMessage({ method: command === 'playVideo' ? 'play' : command === 'pauseVideo' ? 'pause' : 'getCurrentTime' }, playerOrigin(provider));
    } else {
      target.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), playerOrigin(provider));
    }
  }, [provider]);

  const loadExperience = async () => {
    setLoadingExperience(true);
    try {
      const response = await videosApi.studentExperience(video.id);
      setExperience(response.data);
    } catch {
      toast.error('Could not load video questions');
    } finally {
      setLoadingExperience(false);
    }
  };

  const start = async () => {
    setStarted(true);
    setPlaying(true);
    if (!preview) await loadExperience();
  };

  useEffect(() => {
    if (!started || !playing) return;
    const timer = window.setTimeout(() => {
      if (provider === 'youtube') {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
          event: 'command',
          func: 'addEventListener',
          args: ['onStateChange', 'infoDelivery'],
        }), playerOrigin(provider));
      }
      sendPlayerCommand('playVideo');
    }, 250);
    return () => window.clearTimeout(timer);
  }, [playing, provider, sendPlayerCommand, started]);

  const pauseForCheckpoint = useCallback((checkpoint: VideoCheckpoint) => {
    sendPlayerCommand('pauseVideo');
    setPlaying(false);
    setPending(checkpoint);
    setAnswer('');
    setAttachments([]);
    setFeedback('');
    setSolution(null);
  }, [sendPlayerCommand]);

  const checkForCheckpoint = useCallback((time: number) => {
    if (!experience || pending) return;
    const checkpoint = checkpoints.find(item => !solvedIds.has(item.id) && time >= item.timestampSeconds - 0.35);
    if (checkpoint) pauseForCheckpoint(checkpoint);
  }, [checkpoints, experience, pauseForCheckpoint, pending, solvedIds]);

  const checkpointHandlerRef = useRef(checkForCheckpoint);
  useEffect(() => {
    checkpointHandlerRef.current = checkForCheckpoint;
  }, [checkForCheckpoint]);

  // The YouTube postMessage protocol does not reliably emit current-time
  // events in every browser until its listener handshake has completed.
  // Attach the official player object as a reliable time source instead.
  useEffect(() => {
    if (!started || provider !== 'youtube' || !video.providerVideoId) return;
    let cancelled = false;
    let timer: number | undefined;

    const attach = () => {
      if (cancelled || providerPlayerRef.current || !iframeRef.current) return;
      const YT = (window as any).YT;
      if (!YT?.Player) return;
      let player: any;
      player = new YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            if (!cancelled) {
              providerPlayerRef.current = player;
              setPlayerError(null);
              player.playVideo?.();
            }
          },
          onError: (event: any) => {
            if (!cancelled) setPlayerError(String(event?.data || 'youtube-player-error'));
          },
          onStateChange: (event: any) => {
            if (cancelled) return;
            setPlaying(event?.data === 1);
            const time = Number(player?.getCurrentTime?.());
            if (Number.isFinite(time)) {
              setCurrentTime(time);
              checkpointHandlerRef.current(time);
            }
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      attach();
    } else {
      if (!document.getElementById('fixion-youtube-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'fixion-youtube-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }
      timer = window.setInterval(() => {
        if ((window as any).YT?.Player) {
          window.clearInterval(timer);
          attach();
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      providerPlayerRef.current = null;
    };
  }, [provider, started, video.providerVideoId]);

  useEffect(() => {
    if (!started) return;
    const handleMessage = (event: MessageEvent) => {
      let data: any = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }
      const time = Number(data?.info?.currentTime ?? data?.infoDelivery?.currentTime ?? data?.value);
      const externalTime = Number(data?.currentTime ?? data?.time ?? data?.seconds ?? data?.eventData?.currentTime);
      const resolvedTime = Number.isFinite(time) ? time : externalTime;
      if (Number.isFinite(resolvedTime)) {
        setCurrentTime(resolvedTime);
        checkForCheckpoint(resolvedTime);
      }
    };
    window.addEventListener('message', handleMessage);
    const timer = window.setInterval(() => {
      if (!playing) return;
      if (provider === 'vimeo') sendPlayerCommand('getCurrentTime');
      else if (provider === 'youtube') {
        const time = Number(providerPlayerRef.current?.getCurrentTime?.());
        if (Number.isFinite(time)) {
          setCurrentTime(time);
          checkForCheckpoint(time);
        } else {
          sendPlayerCommand('getCurrentTime');
        }
      } else if (provider === 'wistia') {
        const time = Number(providerPlayerRef.current?.currentTime ?? providerPlayerRef.current?.time?.());
        if (Number.isFinite(time)) {
          setCurrentTime(time);
          checkForCheckpoint(time);
        }
      }
    }, 450);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.clearInterval(timer);
    };
  }, [checkForCheckpoint, playing, provider, sendPlayerCommand, started]);

  useEffect(() => {
    if (!started || !video.providerVideoId) return;
    const scriptId = 'fixion-bunny-playerjs';
    if (provider !== 'bunny') return;

    const attach = () => {
      if (provider === 'bunny') {
        const playerjs = (window as any).playerjs;
        if (!playerjs || !iframeRef.current) return;
        const player = new playerjs.Player(iframeRef.current);
        providerPlayerRef.current = player;
        player.on('timeupdate', (payload: any) => {
          let data = payload;
          if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return; } }
          const time = Number(data?.seconds ?? data?.currentTime);
          if (Number.isFinite(time)) { setCurrentTime(time); checkForCheckpoint(time); }
        });
        player.on('play', () => setPlaying(true));
        player.on('pause', () => setPlaying(false));
      }
    };

    const existing = document.getElementById(scriptId);
    if (existing) { attach(); return; }
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = 'https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js';
    script.onload = attach;
    document.body.appendChild(script);
  }, [checkForCheckpoint, provider, started, video.providerVideoId]);

  useEffect(() => {
    if (!started || provider !== 'wistia' || !video.providerVideoId) return;
    const element = wistiaElementRef.current as any;
    if (!element) return;
    let cancelled = false;
    const onTimeUpdate = () => {
      const time = Number(element.currentTime);
      if (Number.isFinite(time)) {
        setCurrentTime(time);
        checkpointHandlerRef.current(time);
      }
    };
    const onSecondChange = (event: any) => {
      const time = Number(event?.detail?.second ?? element.currentTime);
      if (Number.isFinite(time)) {
        setCurrentTime(time);
        checkpointHandlerRef.current(time);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onReady = () => {
      if (cancelled) return;
      providerPlayerRef.current = element;
      setPlayerError(null);
      element.play?.();
    };
    element.addEventListener('api-ready', onReady);
    element.addEventListener('time-update', onTimeUpdate);
    element.addEventListener('second-change', onSecondChange);
    element.addEventListener('play', onPlay);
    element.addEventListener('pause', onPause);

    const embedScriptId = 'fixion-wistia-embed-' + video.providerVideoId;
    const playerScriptId = 'fixion-wistia-player';
    const addScript = (id: string, src: string, type?: string) => {
      if (document.getElementById(id)) return;
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      if (type) script.type = type;
      document.head.appendChild(script);
    };
    addScript(embedScriptId, 'https://fast.wistia.com/embed/' + video.providerVideoId + '.js', 'module');
    addScript(playerScriptId, 'https://fast.wistia.com/player.js');
    if ((element as any).readyState === 'interactive' || (element as any).readyState === 'complete') onReady();
    const readyTimer = window.setInterval(() => {
      if (typeof element.play === 'function' && typeof element.currentTime === 'number') {
        onReady();
        window.clearInterval(readyTimer);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(readyTimer);
      element.removeEventListener('api-ready', onReady);
      element.removeEventListener('time-update', onTimeUpdate);
      element.removeEventListener('second-change', onSecondChange);
      element.removeEventListener('play', onPlay);
      element.removeEventListener('pause', onPause);
      if (providerPlayerRef.current === element) providerPlayerRef.current = null;
    };
  }, [provider, started, video.providerVideoId]);

  const uploadAnswer = async (file: File) => {
    try {
      const response = await uploadsApi.upload(file);
      setAttachments(items => [...items, response.data.url]);
    } catch {
      toast.error('Could not upload your solution');
    }
  };

  const submitAnswer = async () => {
    if (!pending) return;
    if (pending.type === 'MCQ' && !answer) {
      setFeedback('Choose an answer first.');
      return;
    }
    if (pending.type === 'ESSAY' && !answer.trim() && attachments.length === 0) {
      setFeedback('Write an answer before continuing.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await videosApi.answerCheckpoint(video.id, pending.id, { answerText: answer, attachments });
      if (!response.data.correct) {
        setFeedback(response.data.message || 'Please try again.');
        return;
      }
      setSolution(response.data.solution || null);
      setExperience(previous => previous ? {
        ...previous,
        checkpoints: previous.checkpoints.map(item => item.id === pending.id
          ? { ...item, response: { isCorrect: true, attempts: (item.response?.attempts || 0) + 1 } }
          : item),
      } : previous);
      setPending(null);
      setFeedback('');
      setPlaying(true);
      sendPlayerCommand('playVideo');
    } catch (error: any) {
      setFeedback(error?.response?.data?.message || 'Could not submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#09090b', overflow: 'hidden', isolation: 'isolate' }}>
        {started ? provider === 'wistia' ? (
          <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
            {createElement('wistia-player', { ref: wistiaElementRef, 'media-id': video.providerVideoId, style: { display: 'block', width: '100%', height: '100%' } })}
          </div>
        ) : (
          <iframe ref={iframeRef} title={video.title} src={providerUrl(video)} allow="autoplay; encrypted-media; picture-in-picture" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, zIndex: 0 }} />
        ) : (
          <button
            onClick={start}
            aria-label={'Play ' + video.title}
            style={{ position: 'absolute', inset: 0, border: 0, cursor: 'pointer', color: '#fff', background: '#171717', display: 'grid', placeItems: 'center' }}
          >
            <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.45)' }}><Play fill="currentColor" size={26} /></span>
          </button>
        )}
        {started && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: pending ? 'auto' : 'none', zIndex: 2 }}>
            <div style={{ position: 'absolute', inset: '0 0 auto', height: 40, background: 'linear-gradient(#080d15 0%, rgba(8,13,21,.72) 68%, transparent 100%)' }} />
            <div style={{ position: 'absolute', left: 18, top: 16, color: 'rgba(255,255,255,.88)', fontSize: 12, fontWeight: 700 }}>FIXION · {video.title}</div>
            {!pending && provider !== 'wistia' && (
              <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
                <button className="icon-btn" onClick={() => { const next = !playing; setPlaying(next); sendPlayerCommand(next ? 'playVideo' : 'pauseVideo'); }} aria-label={playing ? 'Pause video' : 'Play video'} style={{ color: '#fff', background: 'rgba(0,0,0,.72)', border: '1px solid rgba(255,255,255,.25)' }}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
                <Volume2 size={16} style={{ color: '#fff' }} />
                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,.82)', fontSize: 11, fontWeight: 700 }}>FIXION</span>
              </div>
            )}
          </div>
        )}
        {pending && (
          <div role="dialog" aria-modal="true" aria-labelledby={'checkpoint-' + pending.id} style={{ position: 'absolute', inset: 12, zIndex: 4, display: 'grid', placeItems: 'center', background: 'rgba(7,12,20,.96)', border: '1px solid rgba(103,232,249,.28)', borderRadius: 14, padding: 18, overflowY: 'auto' }}>
            <div style={{ width: '100%', maxWidth: 560 }}>
              <div style={{ color: '#67e8f9', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Checkpoint question</div>
              <h3 id={'checkpoint-' + pending.id} style={{ color: '#fff', fontSize: 18, lineHeight: 1.45, margin: '0 0 16px' }}>{pending.prompt}</h3>
              {pending.type === 'MCQ' ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {pending.options.map(option => (
                    <button key={option.id} onClick={() => setAnswer(option.id)} aria-pressed={answer === option.id} style={{ textAlign: 'left', minHeight: 44, padding: '10px 12px', borderRadius: 9, border: '1px solid ' + (answer === option.id ? '#67e8f9' : 'rgba(255,255,255,.15)'), background: answer === option.id ? 'rgba(103,232,249,.12)' : 'rgba(255,255,255,.04)', color: '#fff', cursor: 'pointer' }}><strong style={{ color: '#67e8f9', marginRight: 8 }}>{option.id}</strong>{option.text}</button>
                  ))}
                </div>
              ) : (
                <>
                  <textarea value={answer} onChange={event => setAnswer(event.target.value)} className="form-input" rows={4} placeholder="Write your answer..." style={{ background: 'rgba(255,255,255,.06)', color: '#fff', borderColor: 'rgba(255,255,255,.16)' }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.75)', fontSize: 12, marginTop: 10, cursor: 'pointer' }}>
                    <FileUp size={15} /> {pending.requireSolutionUpload ? 'Upload your solution (required)' : 'Attach your solution (optional)'}
                    <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={event => event.target.files?.[0] && uploadAnswer(event.target.files[0])} style={{ display: 'none' }} />
                  </label>
                  {attachments.length > 0 && <div style={{ color: '#86efac', fontSize: 12, marginTop: 7 }}>{attachments.length} file attached</div>}
                </>
              )}
              {feedback && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 12 }}>{feedback}</div>}
              <button onClick={submitAnswer} disabled={submitting || loadingExperience} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16, minHeight: 44 }}>
                {submitting ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><Send size={15} /> Submit and continue</>}
              </button>
              <div style={{ color: 'rgba(255,255,255,.52)', fontSize: 11, textAlign: 'center', marginTop: 9 }}>Answer this question to unlock the video.</div>
            </div>
          </div>
        )}
        {playerError && !pending && (
          <div role="alert" style={{ position: 'absolute', inset: 12, zIndex: 4, display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center', background: 'rgba(7,12,20,.96)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 14, color: '#fff' }}>
            <div>
              <strong style={{ display: 'block', color: '#fca5a5', marginBottom: 8 }}>YouTube blocked this embedded playback</strong>
              <span style={{ display: 'block', color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 1.5 }}>This video requires YouTube verification or does not allow embedded playback. The sign-in button inside the YouTube frame cannot authenticate your FIXION account.</span>
              <a href={'https://www.youtube.com/watch?v=' + (video.providerVideoId || video.youtubeVideoId || '')} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', marginTop: 14 }}>Open on YouTube</a>
            </div>
          </div>
        )}
        {loadingExperience && started && !pending && <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'grid', placeItems: 'center', background: 'rgba(7,12,20,.66)', color: '#fff' }}><span className="spinner" /></div>}
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{video.title}</h3>
          {checkpoints.length > 0 && <span className="badge badge-pending">{solvedIds.size}/{checkpoints.length} checkpoints</span>}
        </div>
        {video.description && <p style={{ margin: '7px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{video.description}</p>}
        {solution && (solution.text || solution.url) && <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', color: 'var(--text-secondary)', fontSize: 13 }}><div style={{ color: '#86efac', fontWeight: 700, marginBottom: 4 }}><CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Solution</div>{solution.text && <div>{solution.text}</div>}{solution.url && <a href={solution.url} target="_blank" rel="noreferrer" style={{ color: '#67e8f9', display: 'inline-block', marginTop: 5 }}>Open solution file</a>}</div>}
        {started && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8 }}>Playback position: {Math.floor(currentTime)}s</div>}
      </div>
    </article>
  );
}
