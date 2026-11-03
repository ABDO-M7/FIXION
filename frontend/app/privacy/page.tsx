import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Globe2, Mail, Phone, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | سياسة الخصوصية',
  description: 'FIXION Privacy Policy — how we collect, protect, and use student and teacher data on the FIXION educational platform.',
};

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61594354154461';

export default function PrivacyPolicyPage() {
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
            <Link href="/terms" className="landing-secondary-button">Terms / الشروط</Link>
            <Link href="/" className="landing-nav-cta">
              <ArrowLeft size={15} /> Back to Home
            </Link>
          </div>
        </header>

        {/* Arabic Section */}
        <article className="legal-card" dir="rtl">
          <div className="landing-eyebrow" style={{ marginBottom: 12 }}>
            <ShieldCheck size={15} /> FIXION / PRIVACY POLICY
          </div>
          <h1>سياسة الخصوصية وحماية البيانات</h1>
          <span className="legal-updated">آخر تحديث: نوفمبر 2026</span>

          <div className="legal-section">
            <h2>1. البيانات التي نجمعها</h2>
            <p>
              تجمع منصة FIXION البيانات الضرورية لتقديم تجربة تعليمية آمنة ومنظمة للطلاب وأعضاء هيئة التدريس، وتشمل:
            </p>
            <ul>
              <li>بيانات الحساب الأساسية: الاسم، البريد الإلكتروني، رقم الهاتف، المرحلة الدراسية، وصورة الملف الشخصي.</li>
              <li>بيانات النشاط التعليمي: الكورسات المشترك بها، نسبة مشاهدة الدروس، إجابات نقاط التوقف التفاعلية، وتسليمات الواجبات والاختبارات.</li>
              <li>ملفات الأسئلة والحلول المرفوعة من قِبل الطالب أو المدرس عبر خدمة التخزين السحابي المؤمنة.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>2. كيف نستخدم بياناتك</h2>
            <ul>
              <li>تمكين الوصول إلى المحاضرات، الفيديوهات، والاختبارات المرتبطة بأكواد الاشتراك الخاصة بك.</li>
              <li>متابعة تقدم الطالب الدراسي وإظهار التقارير والدرجات للطالب والمدرس المسؤول عن المجموعة.</li>
              <li>إرسال الإشعارات الفورية المتعلقة بالردود على الأسئلة، تصحيح الواجبات، أو مواعيد الشرح.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. أمن المعلومات وملفات تعريف الارتباط (Cookies)</h2>
            <p>
              نستخدم رموز مصادقة مشفرة (JWT) وملفات تعريف ارتباط آمنة للحفاظ على جلسة تسجيل الدخول وحماية الحسابات من الاستخدام غير المصرح به. لا نقوم ببيع أو مشاركة بيانات الطلاب أو المدرسين مع أي أطراف إعلانية خارجية.
            </p>
          </div>

          <div className="legal-section">
            <h2>4. حقوق المستخدم والتواصل معنا</h2>
            <p>
              يحق لك في أي وقت طلب تحديث بياناتك الشخصية أو حذف حسابك بالتواصل مع فريق الدعم الفني عبر القنوات الرسمية:
            </p>
            <ul>
              <li><Phone size={14} style={{ display: 'inline', marginInlineEnd: 6 }} /> الهاتف: <a href="tel:01132804264" dir="ltr" style={{ color: '#1d4ed8' }}>01132804264</a></li>
              <li><Mail size={14} style={{ display: 'inline', marginInlineEnd: 6 }} /> البريد الإلكتروني: <a href="mailto:fixion.eg@gmail.com" style={{ color: '#1d4ed8' }}>fixion.eg@gmail.com</a></li>
              <li><Globe2 size={14} style={{ display: 'inline', marginInlineEnd: 6 }} /> فيسبوك: <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>صفحة FIXION الرسمية</a></li>
            </ul>
          </div>
        </article>

        {/* English Section */}
        <article className="legal-card" dir="ltr">
          <div className="landing-eyebrow" style={{ marginBottom: 12 }}>
            <ShieldCheck size={15} /> ENGLISH VERSION
          </div>
          <h1>Privacy Policy</h1>
          <span className="legal-updated">Last updated: November 2026</span>

          <div className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>
              FIXION collects only the information required to deliver a structured, reliable educational workspace for students, teachers, and team members:
            </p>
            <ul>
              <li>Account details: Name, email address, phone number, academic grade/level, and optional profile avatar.</li>
              <li>Learning progress: Course enrollments, video watch percentages, checkpoint responses, quiz scores, and assignment submissions.</li>
              <li>Uploaded course attachments and solution files stored securely via Cloudflare R2.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>2. How We Use Your Data</h2>
            <ul>
              <li>Granting access to courses, chapters, lessons, and assessments unlocked via subscription codes.</li>
              <li>Providing progress analytics and grading feedback to students and their enrolled instructors.</li>
              <li>Delivering real-time notifications for answered questions, graded assignments, and scheduled sessions.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>3. Contact Us</h2>
            <p>
              For privacy inquiries, data access requests, or account deletion, reach our support team at:
            </p>
            <ul>
              <li><strong>Phone:</strong> <a href="tel:01132804264" style={{ color: '#1d4ed8' }}>01132804264</a></li>
              <li><strong>Email:</strong> <a href="mailto:fixion.eg@gmail.com" style={{ color: '#1d4ed8' }}>fixion.eg@gmail.com</a></li>
              <li><strong>Facebook:</strong> <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>FIXION Official Facebook Page</a></li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  );
}
