import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, Globe2, Mail, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | شروط الاستخدام',
  description: 'FIXION Terms of Service — rules for student accounts, subscription codes, course access, and acceptable use.',
};

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61594354154461';

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-topbar">
          <Link href="/" className="landing-brand">
            <img src="/brand/icon.png" alt="FIXION" className="landing-brand-mark" />
            <span>FIXION</span>
          </Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/contact" className="landing-secondary-button">Contact / تواصل معنا</Link>
            <Link href="/privacy" className="landing-secondary-button">Privacy / الخصوصية</Link>
            <Link href="/" className="landing-nav-cta">
              <ArrowLeft size={15} /> Back to Home
            </Link>
          </div>
        </header>

        <article className="legal-card" dir="rtl">
          <div className="landing-eyebrow" style={{ marginBottom: 12 }}>
            <FileText size={15} /> FIXION / TERMS OF SERVICE
          </div>
          <h1>شروط الاستخدام وسياسة الاشتراكات</h1>
          <span className="legal-updated">آخر تحديث: نوفمبر 2026</span>

          <div className="legal-section">
            <h2>1. الحسابات ومسؤولية المستخدم</h2>
            <p>
              يلتزم كل طالب أو عضو فريق بإدخال بيانات صحيحة عند إنشاء الحساب والحفاظ على سرية بيانات الدخول الخاصة به. الحساب شخصي ولا يجوز مشاركته مع أطراف أخرى.
            </p>
          </div>

          <div className="legal-section">
            <h2>2. أكواد الاشتراك والوصول للمحتوى</h2>
            <ul>
              <li>تتيح أكواد الحصة الواحدة أو الشابتر الوصول إلى المحتوى المحدد بالكود طوال فترة صلاحية الكود.</li>
              <li>تتيح الأكواد الشهرية/الزمنية (Timed Codes) الوصول الكامل لجميع محتويات المجموعة والكورس لدى المدرس طوال فترة سريان الاشتراك.</li>
              <li>كل كود اشتراك مخصص للاستخدام مرة واحدة فقط بواسطة حساب طالب واحد.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. الملكية الفكرية</h2>
            <p>
              جميع الفيديوهات، الملازم، الاختبارات، والمواد التعليمية المنشورة على FIXION محمية بحقوق الملكية الفكرية للمنصة والمدرسين، ويُحظر إعادة نشرها أو تسجيلها خارج المنصة.
            </p>
          </div>

          <div className="legal-section">
            <h2>4. التواصل الرسمي</h2>
            <ul>
              <li><Phone size={14} style={{ display: 'inline', marginInlineEnd: 6 }} /> الهاتف: <a href="tel:01132804264" dir="ltr" style={{ color: '#1d4ed8' }}>01132804264</a></li>
              <li><Mail size={14} style={{ display: 'inline', marginInlineEnd: 6 }} /> البريد الإلكتروني: <a href="mailto:fixion.eg@gmail.com" style={{ color: '#1d4ed8' }}>fixion.eg@gmail.com</a></li>
              <li><Globe2 size={14} style={{ display: 'inline', marginInlineEnd: 6 }} /> فيسبوك: <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>صفحة FIXION الرسمية</a></li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  );
}
