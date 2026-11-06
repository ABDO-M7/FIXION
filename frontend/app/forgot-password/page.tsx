'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageCircle, Phone, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function ForgotPasswordPage() {
  const { isRtl } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const Arrow = isRtl ? ArrowRight : ArrowLeft;
  const supportPhone = '01062332155';
  const whatsappUrl = `https://wa.me/201062332155?text=${encodeURIComponent(
    identifier.trim()
      ? `مرحباً، نسيت كلمة المرور لحسابي في منصة فيكسيون (Fixion). بيانات الحساب: ${identifier.trim()}`
      : 'مرحباً، نسيت كلمة المرور لحسابي في منصة فيكسيون (Fixion) وأحتاج مساعدة في استعادتها.'
  )}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080d18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#f8fafc',
        fontFamily: 'inherit',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 18,
          padding: '36px 28px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Image
            src="/brand/icon.png"
            alt="Fixion"
            width={54}
            height={54}
            style={{ borderRadius: 14 }}
          />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: '#f8fafc' }}>
          استعادة كلمة المرور
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>
          لاستعادة حسابك وضمان أمان بياناتك، يرجى كتابة بريدك الإلكتروني أو رقم هاتفك المسجل ثم التواصل مع الدعم الفني.
        </p>

        <form
          onSubmit={e => {
            e.preventDefault();
            setSubmitted(true);
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: isRtl ? 'right' : 'left' }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              البريد الإلكتروني أو رقم الهاتف
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="مثال: student@example.com أو 010xxxxxxxx"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(2, 6, 23, 0.6)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 18px',
              borderRadius: 10,
              background: '#25d6d1',
              color: '#06101b',
              border: 'none',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              marginTop: 6,
            }}
          >
            <MessageCircle size={17} />
            <span>تواصل عبر واتساب لاستعادة الحساب</span>
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            padding: '14px',
            borderRadius: 10,
            background: 'rgba(37, 214, 209, 0.05)',
            border: '1px solid rgba(37, 214, 209, 0.12)',
            fontSize: 12,
            color: '#aab4c5',
            lineHeight: 1.6,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#25d6d1', fontWeight: 700, marginBottom: 4 }}>
            <Phone size={13} />
            <span>رقم الدعم الفني المباشر</span>
          </div>
          <span dir="ltr" style={{ fontWeight: 700, color: '#fff' }}>{supportPhone}</span>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: '#7dd3fc',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <Arrow size={14} />
            <span>العودة لصفحة تسجيل الدخول</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

