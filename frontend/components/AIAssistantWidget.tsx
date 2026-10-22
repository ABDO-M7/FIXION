'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles, X, HelpCircle, GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store';

const BlueBuddyModel = dynamic(() => import('./BlueBuddyModel'), { ssr: false });

interface AIAssistantWidgetProps {
  initialGreeting?: string;
  defaultOpen?: boolean;
}

export default function AIAssistantWidget({
  initialGreeting,
  defaultOpen = false,
}: AIAssistantWidgetProps) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);

  // Periodic speech bubble prompt
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpeechBubble(true);
    }, 1500);

    const hideTimer = setTimeout(() => {
      if (!isOpen) setShowSpeechBubble(false);
    }, 12000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [isOpen]);

  const studentName = user?.name ? user.name.split(' ')[0] : 'يا بطل';
  const greeting = initialGreeting || `مرحباً ${studentName}! أنا مرشدك الذكي 🤖 جاهز لمساعدتك في أي وقت.`;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {/* Speech Bubble / Mini Prompt (when collapsed) */}
      {!isOpen && showSpeechBubble && (
        <div
          style={{
            pointerEvents: 'auto',
            background: 'rgba(11, 30, 59, 0.94)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 209, 255, 0.4)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 209, 255, 0.3)',
            borderRadius: '16px 16px 4px 16px',
            padding: '10px 14px',
            maxWidth: 240,
            marginBottom: 8,
            fontSize: 12,
            lineHeight: 1.5,
            color: '#f8fafc',
            position: 'relative',
            animation: 'fadeInUp 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
          onClick={() => {
            setIsOpen(true);
          }}
        >
          <Sparkles size={16} style={{ color: '#00D1FF', flexShrink: 0 }} />
          <span>{greeting}</span>
          <button
            type="button"
            onClick={(e) => {
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

      {/* Expanded Assistant Card */}
      {isOpen && (
        <div
          style={{
            pointerEvents: 'auto',
            width: 320,
            background: 'rgba(11, 30, 59, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 209, 255, 0.35)',
            borderRadius: 20,
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 209, 255, 0.25)',
            padding: 16,
            marginBottom: 12,
            animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00D1FF, #FF4ED8)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Sparkles size={14} color="#fff" />
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#f8fafc', display: 'block' }}>Fixion Learning Buddy</strong>
                <span style={{ fontSize: 10, color: '#00D1FF' }}>متصل وتفاعلي 3D 🟢</span>
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={() => setIsOpen(false)}
              style={{ color: '#94a3b8', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* 3D Showcase Window inside Expanded Card */}
          <div
            style={{
              height: 195,
              width: '100%',
              borderRadius: 14,
              background: 'radial-gradient(circle at 50% 60%, rgba(0, 209, 255, 0.16) 0%, rgba(11, 30, 59, 0.6) 70%)',
              border: '1px solid rgba(0, 209, 255, 0.18)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <BlueBuddyModel
              compact
              interactive={true}
              enableTracking={true}
              enableFloating={true}
              loadingLabel="جاري تحميل المجسم"
              errorLabel="تعذر تحميل المجسم ثلاثي الأبعاد."
              accessibleLabel="رفيق FIXION ثلاثي الأبعاد"
            />
            <span
              style={{
                position: 'absolute',
                bottom: 8,
                left: 10,
                fontSize: 10,
                color: 'rgba(255,255,255,0.6)',
                pointerEvents: 'none',
              }}
            >
              اضغط للقفز والترحيب! 🚀
            </span>
          </div>

          {/* Quick Guidance Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
              اختصارات سريعة للمنصة:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <Link
                href="/student/courses"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  color: '#f8fafc',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
              >
                <GraduationCap size={15} style={{ color: '#00D1FF' }} />
                <span>كورساتي</span>
              </Link>

              <Link
                href="/student/questions"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  color: '#f8fafc',
                  textDecoration: 'none',
                }}
              >
                <HelpCircle size={15} style={{ color: '#FF4ED8' }} />
                <span>بنك الأسئلة</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating 3D Robot Trigger Avatar (in Corner) */}
      <div
        style={{
          pointerEvents: 'auto',
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 40%, rgba(0, 209, 255, 0.35) 0%, rgba(11, 30, 59, 0.96) 75%)',
          border: '2px solid rgba(0, 209, 255, 0.55)',
          boxShadow: '0 8px 30px rgba(0, 209, 255, 0.45), 0 0 18px rgba(255, 78, 216, 0.35)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s',
        }}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 209, 255, 0.65), 0 0 25px rgba(255, 78, 216, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 209, 255, 0.45), 0 0 18px rgba(255, 78, 216, 0.35)';
        }}
        title="Fixion Learning Buddy — اضغط للفتح!"
      >
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '50%' }}>
          <BlueBuddyModel
            compact
            focus="head"
            interactive={false}
            loadingLabel="جاري التحميل"
            errorLabel="تعذر التحميل"
            accessibleLabel="رفيق FIXION ثلاثي الأبعاد"
          />
        </div>

        {/* Online Indicator Badge */}
        <span
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #0f172a',
            boxShadow: '0 0 8px #10b981',
          }}
        />
      </div>
    </div>
  );
}
