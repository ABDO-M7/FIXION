'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, X, Send, Bot, User, GraduationCap, AlertTriangle, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { aiApi } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantWidgetProps {
  initialGreeting?: string;
  defaultOpen?: boolean;
}

const QUICK_PROMPTS = [
  'اشرح لي فكرة علمية أو مسألة خطوة بخطوة',
  'كيف أراجع أخطائي قبل الامتحان بفعالية؟',
  'لخّص لي أهم القوانين والمفاهيم',
];

export default function AIAssistantWidget({
  initialGreeting,
  defaultOpen = false,
}: AIAssistantWidgetProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

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

  const sendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || sending) return;

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];
    setMessages(updatedMessages);
    if (!textToSend) setInput('');
    setSending(true);

    try {
      const res = await aiApi.chat(updatedMessages, pathname || undefined);
      const reply =
        res.data?.reply ||
        'عذراً، لم أتمكن من توليد الرد حالياً. حاول مرة أخرى.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'تعذر الاتصال بالمساعد الذكي حالياً. يرجى التأكد من تفعيل مفتاح الـ API من لوحة التحكم.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
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
          style={{
            pointerEvents: 'auto',
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            height: 500,
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
          }}
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
                  ● متصل وجاهز للشرح وحل الأسئلة
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                onClick={() => setIsOpen(false)}
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
                      maxWidth: '80%',
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
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.content}
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
                  جاري التفكير وكتابة الشرح...
                </div>
              </div>
            )}

            {/* Quick Starter Prompts when only initial greeting exists */}
            {messages.length === 1 && !sending && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                  جرّب أن تسألني:
                </span>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(qp)}
                    style={{
                      textAlign: 'right',
                      padding: '7px 10px',
                      borderRadius: 10,
                      background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.28)',
                      color: '#c7d2fe',
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    ✨ {qp}
                  </button>
                ))}
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
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا... (اضغط Enter للإرسال)"
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
              disabled={sending || !input.trim()}
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
          display: 'flex',
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
