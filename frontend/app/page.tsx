'use client';

import { useEffect, useState } from 'react';
import {
  ArrowUpRight, BarChart3, BookOpen, Check,
  ClipboardCheck, Globe2, GraduationCap, Menu, MessageCircle, PlayCircle,
  ShieldCheck, Users, X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import GradientWaves from '@/components/GradientWaves';
import AIAssistantWidget from '@/components/AIAssistantWidget';

type Language = 'ar' | 'en';

const BlueBuddyModel = dynamic(() => import('@/components/BlueBuddyModel'), {
  ssr: false,
  loading: () => <div className="blue-buddy-scene" aria-hidden="true" />,
});

const copy = {
  ar: {
    dir: 'rtl' as const, nav: ['المنصة', 'للطلاب', 'لأعضاء الفريق', 'كيف تعمل؟'], signIn: 'تسجيل الدخول', start: 'ابدأ الآن',
    eyebrow: 'منصة التعليم التي تكبر معك', title: 'كل رحلتك التعليمية\nفي مكان واحد.', body: 'من الدرس إلى السؤال، ومن الفيديو إلى الاختبار. FIXION تجمع الأدوات التي يحتاجها الطالب وعضو الفريق في تجربة واحدة واضحة وسريعة.', primary: 'أنشئ حسابك مجانًا', secondary: 'استكشف المنصة', signal: 'تعلم أذكى. تابع تقدمك. اطمئن أكثر.', mascotLabel: 'رفيقك في FIXION', mascotText: 'أنا معاك في رحلتك التعليمية.', mascotLoading: 'جاري تحميل المجسم', mascotError: 'تعذر تحميل المجسم ثلاثي الأبعاد.',
    featureEyebrow: 'أكثر من سؤال وجواب', featureTitle: 'نظام كامل يساعدك\nعلى التعلم والاستمرار.', featureBody: 'FIXION ليست مجرد مكان للسؤال. إنها مساحة منظمة للمحتوى، المتابعة، التواصل، والإنجاز.',
    features: [{ title: 'كورسات وفيديوهات', body: 'شاهد المحتوى داخل كل كورس وارجع إلى الدرس الذي تحتاجه في أي وقت.', icon: BookOpen, tone: 'cyan' }, { title: 'اختبارات وواجبات', body: 'حل، سلّم، واعرف مستواك من خلال نتائج ودرجات واضحة.', icon: ClipboardCheck, tone: 'amber' }, { title: 'دعم من فريق المنصة', body: 'اسأل أعضاء الفريق المتخصصين واحجز موعدًا للشرح عندما تحتاج إلى وقت مخصص.', icon: MessageCircle, tone: 'blue' }, { title: 'تقدمك في صورة واحدة', body: 'تابع واجباتك، اختباراتك، وإشعاراتك من لوحة تحكم مرتبة.', icon: BarChart3, tone: 'mint' }],
    flowEyebrow: 'من أول يوم', flowTitle: 'ابدأ بخطوة، وخلي المنصة تكمل معك.', flow: [['01', 'أنشئ حسابك', 'سجل بياناتك في دقائق وحدد دورك كطالب أو عضو فريق.'], ['02', 'ادخل إلى الكورس', 'استخدم كود الاشتراك للوصول إلى مجموعتك ومحتواك.'], ['03', 'تعلم وتابع', 'شاهد، حل، اسأل، واعرف تقدمك بدون تشتت.']],
    rolesEyebrow: 'مصممة لكل طرف', roles: [{ title: 'للطالب', body: 'محتوى منظم، فيديوهات، اختبارات، واجبات، وأسئلة في مكان واحد.', icon: GraduationCap }, { title: 'لأعضاء الفريق', body: 'أنشئ الكورسات، أضف الفيديوهات، تابع التسليمات، وقيّم طلابك.', icon: Users }, { title: 'للإدارة', body: 'إدارة المستخدمين، الاشتراكات، الأكواد، والتحليلات من لوحة واحدة.', icon: ShieldCheck }],
    ctaTitle: 'جاهز تبدأ بشكل مختلف؟', ctaBody: 'خلي كل أدوات التعلم قريبة منك، وابدأ أول خطوة على FIXION.', cta: 'ابدأ مجانًا', footer: 'منصة تعليمية متكاملة للطلاب وأعضاء الفريق.', language: 'English',
  },
  en: {
    dir: 'ltr' as const, nav: ['Platform', 'For students', 'For team members', 'How it works'], signIn: 'Sign in', start: 'Get started',
    eyebrow: 'The learning platform that grows with you', title: 'Your complete\nlearning journey, in one place.', body: 'From lessons to questions, from video to assessment. FIXION brings students and team members into one clear, focused learning experience.', primary: 'Create your free account', secondary: 'Explore the platform', signal: 'Learn smarter. Track progress. Feel in control.', mascotLabel: 'Your FIXION buddy', mascotText: 'Here with you throughout your learning journey.', mascotLoading: 'Loading the 3D model', mascotError: 'The 3D model could not be loaded.',
    featureEyebrow: 'More than Q&A', featureTitle: 'A complete system\nfor learning and momentum.', featureBody: 'FIXION is not only a place to ask. It is a structured space for content, feedback, communication, and progress.',
    features: [{ title: 'Courses & video lessons', body: 'Watch content inside every course and return to the lesson you need.', icon: BookOpen, tone: 'cyan' }, { title: 'Quizzes & assignments', body: 'Solve, submit, and understand your level through clear results.', icon: ClipboardCheck, tone: 'amber' }, { title: 'Team member support', body: 'Ask our team members and book a focused explanation session when you need it.', icon: MessageCircle, tone: 'blue' }, { title: 'Progress in one view', body: 'Follow assignments, quizzes, and notifications from a calm dashboard.', icon: BarChart3, tone: 'mint' }],
    flowEyebrow: 'From day one', flowTitle: 'Start with one step. Let the platform carry the rest.', flow: [['01', 'Create your account', 'Set up your profile in minutes as a student or team member.'], ['02', 'Enter your course', 'Use your subscription code to unlock your group and content.'], ['03', 'Learn and track', 'Watch, solve, ask, and see your progress without the noise.']],
    rolesEyebrow: 'Built for every side', roles: [{ title: 'For students', body: 'Organized content, videos, quizzes, assignments, and questions in one place.', icon: GraduationCap }, { title: 'For team members', body: 'Create courses, publish videos, follow submissions, and grade your students.', icon: Users }, { title: 'For admins', body: 'Manage users, subscriptions, codes, and analytics from one control center.', icon: ShieldCheck }],
    ctaTitle: 'Ready to learn differently?', ctaBody: 'Keep every part of your learning journey close, and take the first step with FIXION.', cta: 'Start for free', footer: 'A complete learning platform for students and team members.', language: 'العربية',
  },
};

export default function HomePage() {
  const [lang, setLang] = useState<Language>('ar');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = copy[lang];

  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 16); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll); }, []);

  return (
    <div className="landing-page" dir={t.dir}>
      <nav className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <Link href="/" className="landing-brand" aria-label="FIXION home"><img src="/brand/icon.png" alt="" className="landing-brand-mark" /><span>FIXION</span></Link>
        <div className={`landing-nav-links ${menuOpen ? 'is-open' : ''}`}><a href="#platform" onClick={() => setMenuOpen(false)}>{t.nav[0]}</a><a href="#roles" onClick={() => setMenuOpen(false)}>{t.nav[1]}</a><a href="#roles" onClick={() => setMenuOpen(false)}>{t.nav[2]}</a><a href="#how" onClick={() => setMenuOpen(false)}>{t.nav[3]}</a></div>
        <div className="landing-nav-actions"><button className="landing-language" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label="Change language"><Globe2 size={16} /> {t.language}</button><Link href="/login" className="landing-signin">{t.signIn}</Link><Link href="/register" className="landing-nav-cta">{t.start}<ArrowUpRight size={16} /></Link><button className="landing-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
      </nav>

      <main>
        <section className="landing-hero"><div className="landing-hero-waves"><GradientWaves /></div><div className="landing-hero-copy"><div className="landing-eyebrow"><span className="landing-eyebrow-dot" />{t.eyebrow}</div><h1>{t.title.split('\n').map((line, index) => <span key={line} className={index === 1 ? 'accent-line' : ''}>{line}</span>)}</h1><p>{t.body}</p><div className="landing-hero-actions"><Link href="/register" className="landing-primary-button">{t.primary}<ArrowUpRight size={18} /></Link><a href="#platform" className="landing-secondary-button"><PlayCircle size={18} />{t.secondary}</a></div><div className="landing-signal"><Check size={15} />{t.signal}</div></div>
          <div className="landing-hero-visual"><div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" /><BlueBuddyModel loadingLabel={t.mascotLoading} errorLabel={t.mascotError} accessibleLabel={t.mascotLabel} /><div className="hero-buddy-caption"><strong>{t.mascotLabel}</strong><span>{t.mascotText}</span></div></div>
        </section>

        <section className="landing-proof-strip"><span>One workspace for</span><strong>COURSES</strong><strong>VIDEO LESSONS</strong><strong>ASSESSMENTS</strong><strong>TEACHER SUPPORT</strong><strong>PROGRESS</strong></section>
        <section className="landing-section landing-features" id="platform"><div className="landing-section-heading"><div><div className="landing-eyebrow">{t.featureEyebrow}</div><h2>{t.featureTitle.split('\n').map(line => <span key={line}>{line}</span>)}</h2></div><p>{t.featureBody}</p></div><div className="feature-bento">{t.features.map((feature, index) => { const Icon = feature.icon; return <article className={`feature-tile feature-tile-${index + 1} tone-${feature.tone}`} key={feature.title}><div className="feature-icon"><Icon size={21} /></div><div><h3>{feature.title}</h3><p>{feature.body}</p></div><span className="feature-index">0{index + 1}</span></article>; })}</div></section>
        <section className="landing-section landing-flow" id="how"><div className="landing-eyebrow">{t.flowEyebrow}</div><h2>{t.flowTitle}</h2><div className="flow-grid">{t.flow.map(([number, title, body]) => <article className="flow-step" key={number}><span className="flow-number">{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
        <section className="landing-section landing-roles" id="roles"><div className="landing-eyebrow">{t.rolesEyebrow}</div><div className="roles-grid">{t.roles.map(role => { const Icon = role.icon; return <article className="role-card" key={role.title}><div className="role-card-icon"><Icon size={22} /></div><h3>{role.title}</h3><p>{role.body}</p><ArrowUpRight size={18} /></article>; })}</div></section>
        <section className="landing-cta"><div><div className="landing-eyebrow">FIXION / NEXT STEP</div><h2>{t.ctaTitle}</h2><p>{t.ctaBody}</p></div><Link href="/register" className="landing-primary-button">{t.cta}<ArrowUpRight size={18} /></Link></section>
      </main>
      <footer className="landing-footer"><Link href="/" className="landing-brand"><img src="/brand/icon.png" alt="" className="landing-brand-mark" /><span>FIXION</span></Link><span>{t.footer}</span><span>© {new Date().getFullYear()} FIXION</span></footer>
      <AIAssistantWidget />
    </div>
  );
}
