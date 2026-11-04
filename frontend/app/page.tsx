'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Readex_Pro } from 'next/font/google';
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, BookOpenCheck, CalendarClock, Check, ChevronDown,
  ClipboardCheck, Globe2, KeyRound, LockKeyhole, Mail, Menu, MessageCircleQuestion, Minus,
  Phone, PlayCircle, ShieldCheck, Users, X,
} from 'lucide-react';
import './landing.css';

const readex = Readex_Pro({ subsets: ['arabic', 'latin'], weight: ['300', '400', '500', '600', '700'], display: 'swap' });

type Language = 'ar' | 'en';
type Mark = 'yes' | 'partial' | 'no';

const CONTACT = {
  phone: '01132804264',
  email: 'fixion.eg@gmail.com',
  facebook: 'https://www.facebook.com/profile.php?id=61594354154461',
};

const copy = {
  ar: {
    dir: 'rtl' as const,
    nav: [['#features', 'المميزات'], ['#compare', 'المقارنة'], ['#how', 'إزاي بتشتغل'], ['#faq', 'الأسئلة']],
    signIn: 'تسجيل الدخول',
    start: 'ابدأ الآن',
    language: 'English',
    heroTitle: ['ذاكر صح،', 'واعرف إنت فين.'],
    heroBody: 'فيديوهات بأسئلة تفاعلية، اختبارات، واجبات، وتواصل مباشر مع مدرسك. كل ده في منصة واحدة.',
    heroSecondary: 'شوف المقارنة',
    heroChipLabel: 'سؤال داخل الفيديو',
    heroChipText: 'جاوب صح عشان تكمل الدرس',
    heroBadge: 'تقدمك في الكورس',
    previewCourse: 'الفيزياء · الفصل الرابع — الحركة والقوة',
    previewLessons: [
      ['01 · مقدمة القوانين الأساسية', 'done'],
      ['02 · العجلة المنتظمة وتطبيقاتها', 'active'],
      ['03 · مسائل مستويات عليا + كويز', 'locked'],
    ] as const,
    capabilities: ['كورسات منظمة', 'فيديوهات تفاعلية', 'اختبارات وواجبات', 'مواعيد شرح', 'إشعارات لحظية', 'عربي وإنجليزي'],
    featuresTitle: 'كل اللي محتاجه عشان تذاكر بتركيز',
    featuresBody: 'مش مجرد مكان ترفع عليه فيديوهات. FIXION بتمشي مع الطالب خطوة بخطوة وبتدي المدرس صورة كاملة.',
    checkpointTitle: 'فيديو بيسألك وإنت بتذاكر',
    checkpointBody: 'المدرس بيحط أسئلة في نقط محددة جوه الفيديو. الطالب لازم يجاوب عشان يكمل، فالمذاكرة بتبقى فعلية مش مشاهدة وبس.',
    checkpointQuestion: 'لو السرعة ثابتة، العجلة بتساوي؟',
    checkpointOptions: ['صفر', 'ثابتة موجبة', 'متغيرة'],
    unlockTitle: 'الدرس بيتفتح بالترتيب',
    unlockBody: 'الحصة اللي بعدها تتفتح لما تشوف نسبة معينة من الفيديو أو تنجح في الاختبار.',
    quizTitle: 'اختبارات وواجبات بدرجات',
    quizBody: 'حل وسلّم من المنصة، واعرف درجتك وملاحظات المدرس.',
    askTitle: 'اسأل مدرسك واحجز ميعاد',
    askBody: 'ابعت سؤالك بصورة أو ملف، أو احجز ميعاد شرح مخصوص.',
    codesTitle: 'كود واحد بيفتح المحتوى',
    codesBody: 'اشتراك بالحصة، بالشابتر، أو بالشهر الكامل لكل محتوى المدرس.',
    codeKinds: ['حصة', 'شابتر', 'شهر'],
    progressTitle: 'تقدمك قدامك',
    progressBody: 'نسبة المشاهدة، الدرجات، والإشعارات في لوحة واحدة.',
    progressLabel: 'الفيزياء · الوحدة الرابعة',
    compareEyebrow: 'المقارنة',
    compareTitle: 'ليه FIXION بدل الطرق التانية؟',
    compareBody: 'مقارنة عامة بين FIXION وأشهر الطرق اللي الطلاب والمدرسين بيستخدموها.',
    compareCols: ['FIXION', 'يوتيوب وجروبات تليجرام', 'منصات الفيديو التقليدية'],
    compareRows: [
      ['أسئلة تفاعلية جوه الفيديو', 'yes', 'no', 'no'],
      ['فتح الدروس بالترتيب حسب المشاهدة أو الدرجة', 'yes', 'no', 'partial'],
      ['اختبارات وواجبات بتصحيح ودرجات', 'yes', 'no', 'partial'],
      ['أكواد اشتراك بالحصة أو الشابتر أو الشهر', 'yes', 'no', 'partial'],
      ['أسئلة مباشرة للمدرس وحجز مواعيد شرح', 'yes', 'partial', 'no'],
      ['متابعة نسبة مشاهدة وتقدم كل طالب', 'yes', 'no', 'partial'],
      ['حسابات شخصية وحماية للمحتوى', 'yes', 'no', 'yes'],
      ['إشعارات لحظية بالردود والدرجات', 'yes', 'partial', 'partial'],
    ] as Array<[string, Mark, Mark, Mark]>,
    markLabels: { yes: 'متاح', partial: 'جزئي', no: 'غير متاح' },
    howTitle: 'تبدأ في 3 خطوات',
    steps: [
      ['أنشئ حسابك', 'سجّل بالإيميل أو بحساب جوجل في أقل من دقيقة.'],
      ['ادخل كود الاشتراك', 'الكود بيفتحلك الحصة أو الشابتر أو الشهر حسب نوعه.'],
      ['ذاكر وتابع', 'شوف، جاوب، سلّم، واسأل، وتقدمك بيتسجل أول بأول.'],
    ],
    rolesTitle: 'معمولة للطالب والمدرس مع بعض',
    roles: [
      { key: 'student', label: 'للطالب', points: ['كل كورساتك في مكان واحد', 'أسئلة تفاعلية بتثبت المعلومة', 'درجاتك وملاحظات المدرس أول بأول', 'اسأل واحجز ميعاد شرح'] },
      { key: 'teacher', label: 'للمدرس', points: ['ارفع فيديوهات وملفات ورتبها بالشابتر', 'حط أسئلة جوه الفيديو وشروط فتح', 'صحح الواجبات وقيّم الطلاب', 'اعرف مين اتفرج ومين لأ'] },
      { key: 'admin', label: 'للإدارة', points: ['إدارة المدرسين والمساعدين والصلاحيات', 'توليد أكواد الاشتراك ومتابعتها', 'تحليلات للمنصة كلها', 'متابعة صحة السيستم'] },
    ],
    panelKicker: 'لوحة متابعة المجموعة',
    panelTitle: 'مجموعة 3 ثانوي — الفيزياء',
    panelStudents: '148 طالب نشط',
    panelStats: [
      ['94%', 'متوسط إتمام الدروس'],
      ['88%', 'متوسط درجات الكويز'],
      ['12 د', 'سرعة الرد على الأسئلة'],
    ] as const,
    panelCols: ['الطالب', 'المشاهدة', 'الاختبار'] as const,
    panelRows: [
      ['أحمد محمد', 100, '19 / 20'],
      ['مريم خالد', 85, '18 / 20'],
      ['يوسف طارق', 70, '17 / 20'],
    ] as const,
    panelNote: 'تحديث لحظي لنسب المشاهدة والدرجات وحالة كل طالب',
    faqTitle: 'أسئلة بتتكرر',
    faqs: [
      ['إزاي أشترك في كورس؟', 'بتاخد كود الاشتراك من مدرسك أو السنتر، وتدخله من صفحة الاشتراك بعد ما تعمل حساب.'],
      ['لو معايا كود حصة وبعدين جبت كود شهر؟', 'كود الشهر بيفتح كل محتوى المدرس في المجموعة طول مدة الاشتراك، حتى لو كنت مستخدم كود حصة قبل كده.'],
      ['ينفع أذاكر من الموبايل؟', 'أيوه، المنصة شغالة على الموبايل والتابلت والكمبيوتر من غير ما تنزل أي برنامج.'],
      ['ينفع أشارك حسابي مع حد؟', 'لأ، الحساب شخصي وكل كود بيتستخدم مرة واحدة لحساب طالب واحد.'],
      ['أتواصل معاكم إزاي؟', `كلمنا على ${'01132804264'} أو ابعت على fixion.eg@gmail.com أو من صفحتنا على فيسبوك.`],
    ],
    ctaTitle: 'جاهز تبدأ؟',
    ctaBody: 'اعمل حسابك دلوقتي وادخل كود الاشتراك بتاعك.',
    footerAbout: 'منصة تعليمية متكاملة للطلاب والمدرسين في مصر.',
    footerContact: 'تواصل معنا',
    footerLinks: 'روابط',
    facebook: 'فيسبوك',
    contactPage: 'صفحة التواصل',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الاستخدام',
    rights: 'جميع الحقوق محفوظة.',
    sticky: 'ابدأ رحلتك على FIXION',
  },
  en: {
    dir: 'ltr' as const,
    nav: [['#features', 'Features'], ['#compare', 'Compare'], ['#how', 'How it works'], ['#faq', 'FAQ']],
    signIn: 'Sign in',
    start: 'Get started',
    language: 'العربية',
    heroTitle: ['Study right.', 'Know where you stand.'],
    heroBody: 'Interactive video lessons, quizzes, assignments, and direct access to your teacher. All in one platform.',
    heroSecondary: 'See the comparison',
    heroChipLabel: 'In-video question',
    heroChipText: 'Answer correctly to continue',
    heroBadge: 'Course progress',
    previewCourse: 'Physics · Unit 04 — Motion & Forces',
    previewLessons: [
      ['01 · Core Laws Introduction', 'done'],
      ['02 · Uniform Acceleration & Applications', 'active'],
      ['03 · Advanced Problems + Quiz', 'locked'],
    ] as const,
    capabilities: ['Structured courses', 'Interactive videos', 'Quizzes & assignments', 'Booked sessions', 'Live notifications', 'Arabic & English'],
    featuresTitle: 'Everything you need to study with focus',
    featuresBody: 'Not just a place to upload videos. FIXION guides students step by step and gives teachers the full picture.',
    checkpointTitle: 'Videos that ask while you learn',
    checkpointBody: 'Teachers place questions at exact moments in a video. Students answer to continue, so studying becomes active, not passive watching.',
    checkpointQuestion: 'If velocity is constant, acceleration equals?',
    checkpointOptions: ['Zero', 'Positive constant', 'Variable'],
    unlockTitle: 'Lessons unlock in order',
    unlockBody: 'The next lesson opens after you watch enough of the video or pass the quiz.',
    quizTitle: 'Graded quizzes & assignments',
    quizBody: 'Solve and submit online, then see your grade and teacher feedback.',
    askTitle: 'Ask your teacher, book a session',
    askBody: 'Send a question with an image or file, or book a dedicated session.',
    codesTitle: 'One code unlocks the content',
    codesBody: 'Subscribe per lesson, per chapter, or a full month of a teacher\u2019s content.',
    codeKinds: ['Lesson', 'Chapter', 'Month'],
    progressTitle: 'Your progress, visible',
    progressBody: 'Watch progress, grades, and notifications in one dashboard.',
    progressLabel: 'Physics · Unit 4',
    compareEyebrow: 'Comparison',
    compareTitle: 'Why FIXION over the usual options?',
    compareBody: 'A general comparison between FIXION and the tools students and teachers commonly use.',
    compareCols: ['FIXION', 'YouTube & Telegram groups', 'Traditional video platforms'],
    compareRows: [
      ['Interactive questions inside videos', 'yes', 'no', 'no'],
      ['Sequenced unlocking by watch time or score', 'yes', 'no', 'partial'],
      ['Graded quizzes and assignments', 'yes', 'no', 'partial'],
      ['Lesson, chapter, or monthly access codes', 'yes', 'no', 'partial'],
      ['Direct teacher questions and booked sessions', 'yes', 'partial', 'no'],
      ['Per-student watch and progress tracking', 'yes', 'no', 'partial'],
      ['Personal accounts and protected content', 'yes', 'no', 'yes'],
      ['Live notifications for replies and grades', 'yes', 'partial', 'partial'],
    ] as Array<[string, Mark, Mark, Mark]>,
    markLabels: { yes: 'Included', partial: 'Partial', no: 'Not available' },
    howTitle: 'Start in 3 steps',
    steps: [
      ['Create your account', 'Sign up with email or Google in under a minute.'],
      ['Enter your access code', 'The code unlocks a lesson, a chapter, or a full month.'],
      ['Learn and track', 'Watch, answer, submit, and ask. Your progress is saved as you go.'],
    ],
    rolesTitle: 'Built for students and teachers together',
    roles: [
      { key: 'student', label: 'Students', points: ['All your courses in one place', 'Interactive questions that make it stick', 'Grades and teacher feedback as they land', 'Ask questions and book sessions'] },
      { key: 'teacher', label: 'Teachers', points: ['Upload videos and files, organized by chapter', 'Add in-video questions and unlock rules', 'Grade assignments and evaluate students', 'See who watched and who didn\u2019t'] },
      { key: 'admin', label: 'Admins', points: ['Manage teachers, assistants, and permissions', 'Generate and track access codes', 'Platform-wide analytics', 'System health monitoring'] },
    ],
    panelKicker: 'Group live analytics',
    panelTitle: 'Grade 12 — Physics Group A',
    panelStudents: '148 active students',
    panelStats: [
      ['94%', 'Lesson completion'],
      ['88%', 'Average quiz score'],
      ['12m', 'Question response time'],
    ] as const,
    panelCols: ['Student', 'Watched', 'Quiz'] as const,
    panelRows: [
      ['Ahmed Mohamed', 100, '19 / 20'],
      ['Mariam Khaled', 85, '18 / 20'],
      ['Youssef Tarek', 70, '17 / 20'],
    ] as const,
    panelNote: 'Real-time tracking of watch percentages, checkpoints, and grades',
    faqTitle: 'Common questions',
    faqs: [
      ['How do I join a course?', 'Get an access code from your teacher or center, then enter it on the subscription page after creating your account.'],
      ['I used a lesson code, then got a monthly code?', 'A monthly code unlocks all of the teacher\u2019s content in that group for its full duration, even if you used a lesson code before.'],
      ['Can I study on my phone?', 'Yes. FIXION works on phones, tablets, and computers with nothing to install.'],
      ['Can I share my account?', 'No. Accounts are personal, and each code works once for one student account.'],
      ['How do I contact you?', 'Call 01132804264, email fixion.eg@gmail.com, or message our Facebook page.'],
    ],
    ctaTitle: 'Ready to start?',
    ctaBody: 'Create your account now and enter your access code.',
    footerAbout: 'A complete learning platform for students and teachers in Egypt.',
    footerContact: 'Contact',
    footerLinks: 'Links',
    facebook: 'Facebook',
    contactPage: 'Contact page',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    rights: 'All rights reserved.',
    sticky: 'Start learning on FIXION',
  },
};

function MarkCell({ mark, label }: { mark: Mark; label: string }) {
  const Icon = mark === 'yes' ? Check : mark === 'partial' ? Minus : X;
  return (
    <span className={`lp-mark lp-mark-${mark}`} title={label}>
      <Icon size={15} strokeWidth={2.4} aria-hidden="true" />
      <span className="lp-sr">{label}</span>
    </span>
  );
}

export default function HomePage() {
  const [lang, setLang] = useState<Language>('ar');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [role, setRole] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const t = copy[lang];
  const Arrow = t.dir === 'rtl' ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>('.lp-reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={`lp ${readex.className}`} dir={t.dir} lang={lang}>
      {/* Navigation */}
      <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link href="/" className="lp-brand" aria-label="FIXION">
            <img src="/brand/icon.png" alt="" width={32} height={32} />
            <span>FIXION</span>
          </Link>
          <nav className={`lp-nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Main">
            {t.nav.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <Link href="/login" className="lp-nav-mobile-only" onClick={() => setMenuOpen(false)}>{t.signIn}</Link>
          </nav>
          <div className="lp-nav-actions">
            <button type="button" className="lp-lang" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label="Change language">
              <Globe2 size={16} /> {t.language}
            </button>
            <Link href="/login" className="lp-link-signin">{t.signIn}</Link>
            <Link href="/register" className="lp-btn lp-btn-primary lp-btn-sm">{t.start}</Link>
            <button type="button" className="lp-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <h1>
                <span>{t.heroTitle[0]}</span>
                <span className="lp-accent">{t.heroTitle[1]}</span>
              </h1>
              <p>{t.heroBody}</p>
              <div className="lp-hero-actions">
                <Link href="/register" className="lp-btn lp-btn-primary">{t.start}<Arrow size={18} /></Link>
                <a href="#compare" className="lp-btn lp-btn-ghost">{t.heroSecondary}</a>
              </div>
            </div>

            <div className="lp-hero-visual" aria-hidden="true">
              <div className="lp-app">
                <div className="lp-app-bar">
                  <i /><i /><i />
                  <span>{t.previewCourse}</span>
                </div>
                <div className="lp-app-body">
                  <div className="lp-player">
                    <div className="lp-player-screen">
                      <div className="lp-player-board">
                        <span>v = Δx / Δt</span>
                        <span>a = Δv / Δt</span>
                      </div>
                      <span className="lp-player-play"><PlayCircle size={34} strokeWidth={1.6} /></span>
                    </div>
                    <div className="lp-player-controls">
                      <span className="lp-player-time">04:12 / 18:40</span>
                      <div className="lp-player-track">
                        <i className="lp-player-fill" />
                        <b style={{ insetInlineStart: '22%' }} />
                        <b style={{ insetInlineStart: '48%' }} className="is-now" />
                        <b style={{ insetInlineStart: '76%' }} />
                      </div>
                    </div>
                  </div>
                  <ul className="lp-lessons">
                    {t.previewLessons.map(([title, state], index) => (
                      <li key={title} className={`is-${state}`}>
                        <span className="lp-lesson-dot">
                          {state === 'done' ? <Check size={12} strokeWidth={3} /> : state === 'locked' ? <LockKeyhole size={11} /> : index + 1}
                        </span>
                        <span>{title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="lp-float lp-float-question">
                <span className="lp-float-icon"><PlayCircle size={18} /></span>
                <div>
                  <strong>{t.heroChipLabel}</strong>
                  <span>{t.heroChipText}</span>
                </div>
              </div>
              <div className="lp-float lp-float-progress">
                <span>{t.heroBadge}</span>
                <div className="lp-progress"><i style={{ width: '68%' }} /></div>
                <strong>68%</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Capability strip */}
        <section className="lp-strip" aria-label="Capabilities">
          <div className="lp-container lp-strip-inner">
            {t.capabilities.map(item => (
              <span key={item}><Check size={14} strokeWidth={2.6} />{item}</span>
            ))}
          </div>
        </section>

        {/* Features bento */}
        <section className="lp-section" id="features">
          <div className="lp-container">
            <div className="lp-head lp-reveal">
              <h2>{t.featuresTitle}</h2>
              <p>{t.featuresBody}</p>
            </div>

            <div className="lp-bento">
              <article className="lp-tile lp-tile-hero lp-reveal">
                <div className="lp-tile-copy">
                  <span className="lp-tile-icon lp-tile-icon-invert"><PlayCircle size={20} /></span>
                  <h3>{t.checkpointTitle}</h3>
                  <p>{t.checkpointBody}</p>
                </div>
                <div className="lp-quiz-demo" role="group" aria-label={t.checkpointQuestion}>
                  <div className="lp-quiz-time"><span />04:12</div>
                  <strong>{t.checkpointQuestion}</strong>
                  <div className="lp-quiz-options">
                    {t.checkpointOptions.map((option, index) => {
                      const state = picked === null ? '' : index === 0 ? 'is-right' : picked === index ? 'is-wrong' : '';
                      return (
                        <button type="button" key={option} className={state} onClick={() => setPicked(index)}>
                          <span>{String.fromCharCode(65 + index)}</span>{option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>

              <article className="lp-tile lp-reveal">
                <span className="lp-tile-icon"><LockKeyhole size={20} /></span>
                <h3>{t.unlockTitle}</h3>
                <p>{t.unlockBody}</p>
              </article>

              <article className="lp-tile lp-tile-soft lp-reveal">
                <span className="lp-tile-icon"><ClipboardCheck size={20} /></span>
                <h3>{t.quizTitle}</h3>
                <p>{t.quizBody}</p>
              </article>

              <article className="lp-tile lp-reveal">
                <span className="lp-tile-icon"><MessageCircleQuestion size={20} /></span>
                <h3>{t.askTitle}</h3>
                <p>{t.askBody}</p>
                <div className="lp-tile-meta"><CalendarClock size={15} /><Bell size={15} /></div>
              </article>

              <article className="lp-tile lp-tile-soft lp-reveal">
                <span className="lp-tile-icon"><KeyRound size={20} /></span>
                <h3>{t.codesTitle}</h3>
                <p>{t.codesBody}</p>
                <div className="lp-code-pills">
                  {t.codeKinds.map(kind => <span key={kind}>{kind}</span>)}
                </div>
              </article>

              <article className="lp-tile lp-reveal">
                <span className="lp-tile-icon"><BarChart3 size={20} /></span>
                <h3>{t.progressTitle}</h3>
                <p>{t.progressBody}</p>
                <div className="lp-mini-progress">
                  <span>{t.progressLabel}</span>
                  <div className="lp-progress"><i style={{ width: '72%' }} /></div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Fixion AI Companion & Smart Video Heatmap Showcase */}
        <section className="lp-section" id="ai-companion" style={{ paddingTop: 12 }}>
          <div className="lp-container">
            <div
              className="lp-reveal"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
                gap: 28,
                alignItems: 'center',
                padding: '32px 28px',
                borderRadius: 28,
                background: 'linear-gradient(135deg, #0b132b 0%, #1d2d50 55%, #133b5c 100%)',
                color: '#f8fafc',
                boxShadow: '0 24px 60px rgba(11, 19, 43, 0.22)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, width: 'fit-content', padding: '6px 14px', borderRadius: 999, background: 'rgba(56, 189, 248, 0.14)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#7dd3fc', fontSize: 13, fontWeight: 800 }}>
                  <img src="/brand/fixion-mascot-avatar.png" alt="Fixion AI" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                  <span>{lang === 'ar' ? 'رفيق التعلم الذكي Fixion AI + خريطة الفهم الحرارية' : 'Fixion AI Learning Companion & Confusion Heatmap'}</span>
                </div>
                <h2 style={{ fontSize: 'clamp(1.55rem, 2.6vw, 2.25rem)', fontWeight: 900, margin: 0, lineHeight: 1.3, color: '#ffffff' }}>
                  {lang === 'ar'
                    ? 'مساعد تعليمي ذكي للطلاب، ونظام تحليلي متقدم يوضح للمدرس أكثر أجزاء الحصة صعوبة'
                    : 'Smart AI learning companion for students, plus advanced video analytics and confusion heatmaps for teachers'}
                </h2>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.75, color: 'rgba(241, 245, 249, 0.85)' }}>
                  {lang === 'ar'
                    ? 'توفر المنصة رفيقاً ذكياً لمساعدة الطالب في حل المسائل وتصحيح الأسئلة المقالية وتشخيص نقاط الضعف، إلى جانب خريطة حرارية تحليلية (Heatmap) توضح للمدرس والـ Assistant الدقائق الزمنية التي وجد الطلاب صعوبة فيها وقائمة بالطلاب لمتابعتهم.'
                    : 'An integrated learning system featuring an AI tutor for instant explanations, essay grading, and mistake diagnostics, alongside an interactive video heatmap that pinpoints exact timestamps students struggled with.'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 4 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <strong style={{ display: 'block', color: '#38bdf8', fontSize: 14, marginBottom: 4 }}>
                      {lang === 'ar' ? 'مساعد تعليمي وتصحيح مقالي بالذكاء الاصطناعي' : 'AI Learning Companion & Essay Grading'}
                    </strong>
                    <span style={{ fontSize: 12.5, color: 'rgba(241,245,249,0.75)' }}>
                      {lang === 'ar' ? 'شرح فوري خطوة بخطوة وتحليل لأخطاء الكويزات والامتحانات' : 'Step-by-step explanations and diagnostic mistake analysis'}
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <strong style={{ display: 'block', color: '#fbbf24', fontSize: 14, marginBottom: 4 }}>
                      {lang === 'ar' ? 'خريطة الفهم الحرارية (Confusion Heatmap)' : 'Video Confusion Heatmap'}
                    </strong>
                    <span style={{ fontSize: 12.5, color: 'rgba(241,245,249,0.75)' }}>
                      {lang === 'ar' ? 'رصد زمني لأكثر الدقائق غير المفهومة في الفيديو وقائمة بالطلاب' : 'Data-driven timeline pinpointing exact timestamps students flagged'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', border: '2px solid rgba(56, 189, 248, 0.35)', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)' }}>
                <img
                  src="/brand/fixion-ai-companion.jpg"
                  alt="Fixion AI Companion"
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="lp-section lp-compare" id="compare">
          <div className="lp-container">
            <div className="lp-head lp-head-center lp-reveal">
              <span className="lp-eyebrow">{t.compareEyebrow}</span>
              <h2>{t.compareTitle}</h2>
              <p>{t.compareBody}</p>
            </div>

            <div className="lp-table-wrap lp-reveal">
              <table className="lp-table">
                <thead>
                  <tr>
                    <th scope="col"><span className="lp-sr">Feature</span></th>
                    {t.compareCols.map((col, index) => (
                      <th scope="col" key={col} className={index === 0 ? 'is-us' : ''}>
                        {index === 0 ? (
                          <span className="lp-table-brand"><img src="/brand/icon.png" alt="" width={22} height={22} />{col}</span>
                        ) : col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.compareRows.map(([feature, ...marks]) => (
                    <tr key={feature}>
                      <th scope="row">{feature}</th>
                      {marks.map((mark, index) => (
                        <td key={index} className={index === 0 ? 'is-us' : ''}>
                          <MarkCell mark={mark} label={t.markLabels[mark]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lp-legend">
              <span><MarkCell mark="yes" label={t.markLabels.yes} />{t.markLabels.yes}</span>
              <span><MarkCell mark="partial" label={t.markLabels.partial} />{t.markLabels.partial}</span>
              <span><MarkCell mark="no" label={t.markLabels.no} />{t.markLabels.no}</span>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="lp-section lp-how" id="how">
          <div className="lp-container">
            <h2 className="lp-reveal">{t.howTitle}</h2>
            <ol className="lp-steps">
              {t.steps.map(([title, body], index) => (
                <li key={title} className="lp-reveal">
                  <span className="lp-step-num">{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Roles */}
        <section className="lp-section lp-roles">
          <div className="lp-container lp-roles-grid">
            <div className="lp-roles-copy lp-reveal">
              <h2>{t.rolesTitle}</h2>
              <div className="lp-tabs" role="tablist">
                {t.roles.map((item, index) => (
                  <button
                    type="button"
                    role="tab"
                    key={item.key}
                    aria-selected={role === index}
                    className={role === index ? 'is-active' : ''}
                    onClick={() => setRole(index)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <ul className="lp-role-points" role="tabpanel" key={`${lang}-${role}`}>
                {t.roles[role].points.map(point => (
                  <li key={point}><span><Check size={14} strokeWidth={2.6} /></span>{point}</li>
                ))}
              </ul>
              <Link href="/register" className="lp-btn lp-btn-primary">{t.start}<Arrow size={18} /></Link>
            </div>
            <div className="lp-panel lp-reveal" aria-hidden="true">
              <div className="lp-panel-head">
                <div>
                  <span>{t.panelKicker}</span>
                  <strong>{t.panelTitle}</strong>
                </div>
                <span className="lp-panel-chip"><Users size={14} />{t.panelStudents}</span>
              </div>
              <div className="lp-panel-stats">
                {t.panelStats.map(([value, label]) => (
                  <div key={label}><strong>{value}</strong><span>{label}</span></div>
                ))}
              </div>
              <div className="lp-panel-table">
                <div className="lp-panel-row lp-panel-row-head">
                  <span>{t.panelCols[0]}</span><span>{t.panelCols[1]}</span><span>{t.panelCols[2]}</span>
                </div>
                {t.panelRows.map(([name, watched, grade]) => (
                  <div className="lp-panel-row" key={name}>
                    <span className="lp-panel-name"><i>{name.charAt(0)}</i>{name}</span>
                    <span className="lp-panel-watch"><span className="lp-progress"><i style={{ width: `${watched}%` }} /></span>{watched}%</span>
                    <span className="lp-panel-grade">{grade}</span>
                  </div>
                ))}
              </div>
              <div className="lp-panel-foot">
                <ShieldCheck size={15} />{t.panelNote}
                <BookOpenCheck size={15} />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-section lp-faq" id="faq">
          <div className="lp-container lp-faq-grid">
            <h2 className="lp-reveal">{t.faqTitle}</h2>
            <div className="lp-faq-list lp-reveal">
              {t.faqs.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}<ChevronDown size={18} /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="lp-container">
          <div className="lp-cta lp-reveal">
            <div>
              <h2>{t.ctaTitle}</h2>
              <p>{t.ctaBody}</p>
            </div>
            <div className="lp-cta-actions">
              <Link href="/register" className="lp-btn lp-btn-light">{t.start}<Arrow size={18} /></Link>
              <Link href="/login" className="lp-btn lp-btn-outline-light">{t.signIn}</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div>
            <Link href="/" className="lp-brand">
              <img src="/brand/icon.png" alt="" width={32} height={32} />
              <span>FIXION</span>
            </Link>
            <p>{t.footerAbout}</p>
          </div>
          <div>
            <h4>{t.footerContact}</h4>
            <a href={`tel:${CONTACT.phone}`} dir="ltr"><Phone size={15} />{CONTACT.phone}</a>
            <a href={`mailto:${CONTACT.email}`}><Mail size={15} />{CONTACT.email}</a>
            <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer"><Globe2 size={15} />{t.facebook}</a>
          </div>
          <div>
            <h4>{t.footerLinks}</h4>
            <Link href="/contact">{t.contactPage}</Link>
            <Link href="/privacy">{t.privacy}</Link>
            <Link href="/terms">{t.terms}</Link>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>© {new Date().getFullYear()} FIXION. {t.rights}</span>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="lp-sticky" role="region" aria-label="Quick actions">
        <span>{t.sticky}</span>
        <Link href="/register" className="lp-btn lp-btn-primary lp-btn-sm">{t.start}</Link>
      </div>
    </div>
  );
}
