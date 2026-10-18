'use client';

import React, { useState, useEffect } from 'react';
import RobotMascot3D from './RobotMascot3D';
import {
  MessageSquare, Sparkles, X, ChevronUp, BookOpen,
  HelpCircle, Calendar, GraduationCap, ArrowRight, Heart
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store';

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
  const [hasInteracted, setHasInteracted] = useState(false);
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
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.25)',
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
            setHasInteracted(true);
          }}
        >
          <Sparkles size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
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
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 20,
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.2)',
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
                  background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Sparkles size={14} color="#fff" />
              </div>
              <div>
                <strong style={{ fontSize: 13, color: '#f8fafc', display: 'block' }}>FIXION AI Guide</strong>
                <span style={{ fontSize: 10, color: '#38bdf8' }}>متصل ومتفاعل 3D 🟢</span>
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
              height: 180,
              width: '100%',
              borderRadius: 14,
              background: 'radial-gradient(circle at 50% 60%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.4) 70%)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <RobotMascot3D
              width="100%"
              height="100%"
              scale={0.92}
              interactive={true}
              enableTracking={true}
              enableFloating={true}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 8,
                left: 10,
                fontSize: 10,
                color: 'rgba(255,255,255,0.45)',
                pointerEvents: 'none',
              }}
            >
              اضغط على الروبوت للتحية 👋
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
                <GraduationCap size={15} style={{ color: '#6366f1' }} />
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
                <HelpCircle size={15} style={{ color: '#38bdf8' }} />
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
          background: 'radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.3) 0%, rgba(15, 23, 42, 0.95) 75%)',
          border: '2px solid rgba(99, 102, 241, 0.45)',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4), 0 0 15px rgba(56, 189, 248, 0.3)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s',
        }}
        onClick={() => {
          setIsOpen(!isOpen);
          setHasInteracted(true);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(99, 102, 241, 0.6), 0 0 25px rgba(56, 189, 248, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.4), 0 0 15px rgba(56, 189, 248, 0.3)';
        }}
        title="مرشدك الذكي ثلاثي الأبعاد"
      >
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '50%' }}>
          <RobotMascot3D
            width="100%"
            height="100%"
            scale={0.58}
            interactive={false}
            enableTracking={true}
            enableFloating={true}
            showShadow={false}
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
