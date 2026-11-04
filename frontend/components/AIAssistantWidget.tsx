'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, X, Send, Bot, User, GraduationCap, AlertTriangle, Trash2, Image as ImageIcon,
  Maximize2, Minimize2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { aiApi } from '@/lib/api';
import FormattedChatMessage from './FormattedChatMessage';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

interface AIAssistantWidgetProps {
  initialGreeting?: string;
  defaultOpen?: boolean;
}

export default function AIAssistantWidget({
  initialGreeting,
  defaultOpen = false,
}: AIAssistantWidgetProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingImageName, setPendingImageName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const studentName = user?.name ? user.name.split(' ')[0] : 'يا بطل';
  const greeting =
    initialGreeting ||
    `مرحباً ${studentName}! أنا المساعد الذكي  اسألني في أي درس أو مسألة وسأشرحها لك فوراً.`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: greeting,
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpeechBubble(true);
    }, 1500);

    const hideTimer = setTimeout(() => {
      if (!isOpen) setShowSpeechBubble(false);
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [isOpen]);

  // Hide completely during active student quiz attempts so proctoring is undisturbed
  if (!user || (pathname && pathname.includes('/student/') && pathname.includes('/quiz/'))) {
    return null;
  }

  const processImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setPendingImage(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setPendingImage(src);
        }
        setPendingImageName(file.name || 'صورة مرفقة');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    const imageToSend = pendingImage;
    if ((!trimmed && !imageToSend) || sending) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: trimmed || (imageToSend ? 'اشرح هذه المسألة أو الصورة المرفقة' : ''),
      imageUrl: imageToSend || undefined,
    };

    const updatedMessages: ChatMessage[] = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!textToSend) setInput('');
    setPendingImage(null);
    setPendingImageName(null);
    setSending(true);

    try {
      const res = await aiApi.chat(updatedMessages, pathname || undefined);
      const reply =
        res.data?.reply ||
        'عذراً، لم أتمكن من توليد الرد حالياً. حاول مرة أخرى.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      const isStudent = user?.role === 'student';
      const rawMsg = err?.response?.data?.message;
      const msg =
        rawMsg && !rawMsg.includes('API') && !rawMsg.includes('لوحة التحكم')
          ? rawMsg
          : isStudent
          ? 'المساعد الذكي غير متاح حالياً، يرجى المحاولة لاحقاً.'
          : 'تعذر الاتصال بالمساعد الذكي حالياً. يرجى التأكد من تفعيل مفتاح الـ API من لوحة التحكم.';
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 22,
        right: 22,
        zIndex: 9990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {/* Speech Bubble Prompt (when collapsed) */}
      {!isOpen && showSpeechBubble && (
        <div
          style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99, 102, 241, 0.45)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
            borderRadius: '16px 16px 4px 16px',
            padding: '10px 14px',
            maxWidth: 260,
            marginBottom: 10,
            fontSize: 12,
            lineHeight: 1.5,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
          onClick={() => setIsOpen(true)}
        >
          <img
            src="/brand/fixion-mascot-avatar.png"
            alt="Fixion AI"
            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(99,102,241,0.5)' }}
          />
          <span>اسأل مساعدك الذكي Fixion في أي درس أو مسألة!</span>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setShowSpeechBubble(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
              marginLeft: 'auto',
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Expanded AI Chatbot Window */}
      {isOpen && (
        <div
          style={
            isFullScreen
              ? {
                  pointerEvents: 'auto',
                  position: 'fixed',
                  inset: '16px',
                  zIndex: 9999,
                  width: 'auto',
                  maxWidth: 'none',
                  height: 'auto',
                  maxHeight: 'none',
                  background: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(99, 102, 241, 0.55)',
                  borderRadius: 20,
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'all 0.22s ease',
                }
              : {
                  pointerEvents: 'auto',
                  width: 380,
                  maxWidth: 'calc(100vw - 32px)',
                  height: 520,
                  maxHeight: 'calc(100vh - 120px)',
                  background: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(99, 102, 241, 0.45)',
                  borderRadius: 20,
                  boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.75)',
                  marginBottom: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'all 0.22s ease',
                }
          }
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(16,185,129,0.12))',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src="/brand/fixion-mascot-avatar.png"
                alt="Fixion Mascot"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  objectFit: 'cover',
                  border: '2px solid rgba(99,102,241,0.55)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                }}
              />
              <div>
                <strong style={{ fontSize: 13.5, color: '#f8fafc', display: 'block' }}>
                  المعلم الذكي (Fixion AI Companion)
                </strong>
                <span style={{ fontSize: 10.5, color: '#34d399' }}>
                  متصل وجاهز للشرح وحل الأسئلة
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                className="icon-btn"
                title={isFullScreen ? 'تصغير النافذة' : 'تكبير الشاشة (Full Screen)'}
                onClick={() => setIsFullScreen(prev => !prev)}
                style={{ color: '#94a3b8', width: 28, height: 28 }}
              >
                {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                className="icon-btn"
                title="مسح المحادثة"
                onClick={() =>
                  setMessages([{ role: 'assistant', content: greeting }])
                }
                style={{ color: '#94a3b8', width: 28, height: 28 }}
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setIsOpen(false);
                  setIsFullScreen(false);
                }}
                style={{ color: '#94a3b8', width: 28, height: 28 }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  {isUser ? (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: 'rgba(99,102,241,0.25)',
                        color: '#a5b4fc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <User size={13} />
                    </div>
                  ) : (
                    <img
                      src="/brand/fixion-mascot-avatar.png"
                      alt="Fixion AI"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        flexShrink: 0,
                        objectFit: 'cover',
                        border: '1px solid rgba(99,102,241,0.45)',
                      }}
                    />
                  )}
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '9px 12px',
                      borderRadius: isUser
                        ? '14px 4px 14px 14px'
                        : '4px 14px 14px 14px',
                      background: isUser
                        ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                        : 'rgba(30, 41, 59, 0.9)',
                      border: isUser
                        ? 'none'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#f8fafc',
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.imageUrl && (
                      <div
                        style={{
                          marginBottom: 6,
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.2)',
                          maxWidth: 220,
                        }}
                      >
                        <img
                          src={m.imageUrl}
                          alt="صورة السؤال"
                          style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                      </div>
                    )}
                    {isUser ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                    ) : (
                      <FormattedChatMessage content={m.content} />
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'rgba(16,185,129,0.2)',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bot size={14} />
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: 'rgba(30, 41, 59, 0.9)',
                    color: '#94a3b8',
                    fontSize: 12,
                  }}
                >
                  جاري التفكير وتحليل السؤال...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Shortcuts Footer for Students */}
          {user.role === 'student' && (
            <div
              style={{
                padding: '6px 12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: 6,
                background: 'rgba(15,23,42,0.7)',
              }}
            >
              <Link
                href="/student/mistakes"
                onClick={() => setIsOpen(false)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 8,
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#fbbf24',
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <AlertTriangle size={12} /> بنك أخطائي وتحليل الـ AI
              </Link>
              <Link
                href="/student/courses"
                onClick={() => setIsOpen(false)}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 8,
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#a5b4fc',
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <GraduationCap size={12} /> كورساتي
              </Link>
            </div>
          )}

          {/* Pending Image Preview */}
          {pendingImage && (
            <div
              style={{
                padding: '6px 12px',
                background: 'rgba(30, 41, 59, 0.95)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={pendingImage}
                  alt="Preview"
                  style={{
                    width: 34,
                    height: 34,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid rgba(99,102,241,0.5)',
                  }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {pendingImageName || 'تم إرفاق صورة'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingImage(null);
                  setPendingImageName(null);
                }}
                className="icon-btn"
                style={{ width: 22, height: 22, color: '#f87171' }}
                title="إلغاء الصورة"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Hidden File Input for Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />

          {/* Input Box */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: '#090d16',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="icon-btn"
              title="إرفاق صورة مسألة أو سؤال"
              style={{
                color: pendingImage ? '#38bdf8' : '#94a3b8',
                width: 34,
                height: 34,
                flexShrink: 0,
              }}
            >
              <ImageIcon size={17} />
            </button>
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="اكتب سؤالك أو الصق/ارفع صورة مسألة..."
              style={{
                flex: 1,
                background: '#131d33',
                border: '1px solid #233454',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 12.5,
                color: '#f8fafc',
                resize: 'none',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={sending || (!input.trim() && !pendingImage)}
              className="btn btn-primary btn-sm"
              style={{
                height: 36,
                width: 36,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                flexShrink: 0,
              }}
            >
              <Send size={15} />
            </button>
          </div>

          {/* AI Accuracy Disclaimer */}
          <div
            style={{
              padding: '6px 14px 7px',
              background: '#070b12',
              textAlign: 'center',
              fontSize: 10.5,
              color: '#94a3b8',
              lineHeight: 1.4,
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            تنبيه: إجابات المساعد الذكي للاسترشاد والمساعدة وليست دقيقة بنسبة 100% دائماً؛ يرجى التأكد ومراجعة المعلومات والقوانين مع معلمك.
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        style={{
          pointerEvents: 'auto',
          width: 62,
          height: 62,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          border: '2px solid rgba(99, 102, 241, 0.7)',
          boxShadow: '0 10px 28px rgba(99, 102, 241, 0.55)',
          color: '#fff',
          cursor: 'pointer',
          display: (isOpen && isFullScreen) ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: 0,
          overflow: 'visible',
          transition: 'transform 0.2s ease',
        }}
        title="فتح الشات بوت الذكي (Fixion AI Companion)"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <img
            src="/brand/fixion-mascot-avatar.png"
            alt="Fixion AI Companion"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        )}
        <span
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #0f172a',
          }}
        />
      </button>
    </div>
  );
}
