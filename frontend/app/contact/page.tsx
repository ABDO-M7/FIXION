import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Globe2, Mail, MessageCircle, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us | تواصل معنا',
  description: 'تواصل مع فريق منصة FIXION التعليمية عبر الهاتف أو البريد الإلكتروني أو صفحتنا الرسمية على فيسبوك.',
};

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61594354154461';

export default function ContactPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-topbar">
          <Link href="/" className="landing-brand">
            <img src="/brand/icon.png" alt="FIXION" className="landing-brand-mark" />
            <span>FIXION</span>
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/privacy" className="landing-secondary-button">Privacy / الخصوصية</Link>
            <Link href="/" className="landing-nav-cta">
              <ArrowLeft size={15} /> Back to Home
            </Link>
          </div>
        </header>

        <article className="legal-card" dir="rtl">
          <div className="landing-eyebrow" style={{ marginBottom: 12 }}>
            <MessageCircle size={15} /> FIXION / CONTACT US
          </div>
          <h1>تواصل معنا</h1>
          <span className="legal-updated">فريق دعم منصة FIXION جاهز لمساعدتك</span>

          <div className="legal-section">
            <p>
              لأي استفسارات خاصة بالحسابات، الكورسات، أو أكواد الاشتراك، يمكنك التواصل معنا مباشرة عبر القنوات الرسمية التالية:
            </p>
            <div style={{ display: 'grid', gap: 14, marginTop: 22 }}>
              <a
                href="tel:01132804264"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 14,
                  border: '1px solid rgba(168, 208, 229, 0.16)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: '#f2f8fc',
                  textDecoration: 'none',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                  <Phone size={18} style={{ color: '#25d6d1' }} />
                  رقم الهاتف / واتساب
                </span>
                <span dir="ltr" style={{ color: '#62d9dd', fontWeight: 700 }}>01132804264</span>
              </a>

              <a
                href="mailto:fixion.eg@gmail.com"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 14,
                  border: '1px solid rgba(168, 208, 229, 0.16)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: '#f2f8fc',
                  textDecoration: 'none',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                  <Mail size={18} style={{ color: '#25d6d1' }} />
                  البريد الإلكتروني (Gmail)
                </span>
                <span dir="ltr" style={{ color: '#62d9dd', fontWeight: 700 }}>fixion.eg@gmail.com</span>
              </a>

              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 14,
                  border: '1px solid rgba(168, 208, 229, 0.16)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: '#f2f8fc',
                  textDecoration: 'none',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                  <Globe2 size={18} style={{ color: '#25d6d1' }} />
                  صفحتنا الرسمية على فيسبوك
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#62d9dd', fontWeight: 700 }}>
                  زيارة الصفحة <ArrowUpRight size={16} />
                </span>
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

