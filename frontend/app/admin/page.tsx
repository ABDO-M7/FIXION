'use client';
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { adminApi, codesApi, aiApi } from '@/lib/api';
import {
  Users, HelpCircle, CheckCircle, Key, BarChart2, TrendingUp,
  GraduationCap, ArrowRight, Layers, Sparkles, Plus, Trash2,
  RefreshCw, Play, Power, ShieldAlert, Cpu,
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const DEFAULT_PROVIDER_MODELS: Record<string, { model: string; reqLimit: number; tokLimit: number; hint: string }> = {
  groq: {
    model: 'llama-3.3-70b-versatile',
    reqLimit: 1000,
    tokLimit: 100000,
    hint: 'مجاني وسريع جداً (console.groq.com) — يدعم Llama 3.3 70B',
  },
  gemini: {
    model: 'gemini-2.0-flash',
    reqLimit: 1500,
    tokLimit: 1000000,
    hint: 'مجاني من Google AI Studio (aistudio.google.com) — 1500 طلب/يوم للمفتاح الواحد',
  },
  openrouter: {
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    reqLimit: 200,
    tokLimit: 100000,
    hint: 'موديلات مجانية متعددة (openrouter.ai)',
  },
};

export default function AdminDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [codeForm, setCodeForm] = useState({ plan: 'monthly', quantity: 10 });

  // AI Keys & Quota state
  const [aiQuotaData, setAiQuotaData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [showAddKeyForm, setShowAddKeyForm] = useState(false);
  const [keyForm, setKeyForm] = useState<{
    label: string;
    provider: 'groq' | 'gemini' | 'openrouter';
    apiKey: string;
    model: string;
    dailyRequestLimit: number;
    dailyTokenLimit: number;
  }>({
    label: '',
    provider: 'groq',
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    dailyRequestLimit: 1000,
    dailyTokenLimit: 100000,
  });

  const loadAiKeys = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await aiApi.listKeys();
      setAiQuotaData(res.data);
    } catch {
      // ignore if initial load fails
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      adminApi.overview().then(r => setOverview(r.data)).catch(() => {}),
      loadAiKeys(),
    ]).finally(() => setLoading(false));
  }, [loadAiKeys]);

  const handleProviderChange = (provider: 'groq' | 'gemini' | 'openrouter') => {
    const defaults = DEFAULT_PROVIDER_MODELS[provider] || DEFAULT_PROVIDER_MODELS.groq;
    setKeyForm(prev => ({
      ...prev,
      provider,
      model: defaults.model,
      dailyRequestLimit: defaults.reqLimit,
      dailyTokenLimit: defaults.tokLimit,
    }));
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyForm.apiKey.trim()) {
      toast.error('يرجى إدخال مفتاح API واحد على الأقل');
      return;
    }
    setAddingKey(true);
    try {
      const res = await aiApi.addKey(keyForm);
      const count = res.data?.addedCount || 1;
      toast.success(`تمت إضافة ${count} مفتاح API بنجاح!`);
      setKeyForm(prev => ({ ...prev, label: '', apiKey: '' }));
      setShowAddKeyForm(false);
      await loadAiKeys();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'فشل إضافة مفتاح الـ API');
    } finally {
      setAddingKey(false);
    }
  };

  const handleToggleKey = async (keyItem: any) => {
    try {
      await aiApi.updateKey(keyItem.id, { isActive: !keyItem.isActive });
      toast.success(keyItem.isActive ? 'تم إيقاف المفتاح مؤقتاً' : 'تم تفعيل المفتاح');
      await loadAiKeys();
    } catch {
      toast.error('فشل تحديث حالة المفتاح');
    }
  };

  const handleResetQuota = async (id: string) => {
    try {
      await aiApi.resetKeyQuota(id);
      toast.success('تم تصفير استهلاك الكوتا اليومية للمفتاح');
      await loadAiKeys();
    } catch {
      toast.error('فشل تصفير الكوتا');
    }
  };

  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await aiApi.testKey(id);
      if (res.data?.ok) {
        toast.success(`المفتاح يعمل بنجاح! (${res.data.latencyMs}ms)`);
      } else {
        toast.error(`فشل اختبار المفتاح: ${res.data?.error || 'خطأ غير معروف'}`);
      }
      await loadAiKeys();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'فشل اختبار المفتاح');
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف مفتاح الـ API هذا؟')) return;
    try {
      await aiApi.deleteKey(id);
      toast.success('تم حذف المفتاح');
      await loadAiKeys();
    } catch {
      toast.error('فشل حذف المفتاح');
    }
  };

  const generateCodes = async () => {
    setGeneratingCodes(true);
    try {
      const res = await codesApi.generate({ plan: codeForm.plan, quantity: +codeForm.quantity, codeType: 'timed' });
      toast.success(`${res.data.length} codes generated!`);
      adminApi.overview().then(r => setOverview(r.data));
    } catch {
      toast.error('Failed to generate codes');
    } finally { setGeneratingCodes(false); }
  };

  const pieData = overview ? [
    { name: 'Students', value: overview.users?.students || 0 },
    { name: 'Teachers', value: overview.users?.teachers || 0 },
    { name: 'Team members', value: overview.users?.teamMembers || 0 },
    { name: 'Assistants', value: overview.users?.assistants || 0 },
  ] : [];

  const questionData = overview ? [
    { name: 'Pending', value: overview.questions?.pending || 0, fill: '#f59e0b' },
    { name: 'Answered', value: overview.questions?.answered || 0, fill: '#10b981' },
  ] : [];

  if (loading) return <AppShell><div className="page-loader"><span className="spinner" /></div></AppShell>;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview & management</p>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          Last updated: {new Date(overview?.generatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card blue">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}><Users size={20} style={{ color: 'var(--primary-light)' }} /></div>
          <div className="stat-value">{overview?.users?.total?.toLocaleString()}</div>
          <div className="stat-label">Total Users</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {overview?.users?.students} students · {overview?.users?.teachers} teachers · {overview?.users?.teamMembers || 0} team
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}><HelpCircle size={20} style={{ color: 'var(--secondary)' }} /></div>
          <div className="stat-value">{overview?.questions?.total?.toLocaleString()}</div>
          <div className="stat-label">Total Questions</div>
          <div style={{ fontSize: 11, color: 'var(--warning)' }}>{overview?.questions?.pending} pending</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CheckCircle size={20} style={{ color: 'var(--success)' }} /></div>
          <div className="stat-value">{overview?.answers?.total?.toLocaleString()}</div>
          <div className="stat-label">Total Answers</div>
          <div style={{ fontSize: 11, color: 'var(--success)' }}>
            {overview?.questions?.total ? Math.round((overview.answers.total / overview.questions.total) * 100) : 0}% response rate
          </div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}><Key size={20} style={{ color: 'var(--accent)' }} /></div>
          <div className="stat-value">{overview?.subscriptions?.activeSubscriptions?.toLocaleString()}</div>
          <div className="stat-label">Active Subscriptions</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {overview?.subscriptions?.availableCodes} codes available
          </div>
        </div>
      </div>

      {/* Course Workflow Quick Access Banner */}
      <div className="card" style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <GraduationCap size={24} style={{ color: 'var(--primary-light)' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Course Workflows & Curriculums (إدارة مسارات الحصص والمناهج)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              Manage lesson pipelines, Bunny Stream videos, quizzes, homework, and sequential unlocking rules.
            </p>
          </div>
        </div>
        <Link href="/admin/courses" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={15} /> Open Workflows <ArrowRight size={15} />
        </Link>
      </div>

      {/* ── AI Multi-API Keys & Quota Monitor ─────────────────────────────────── */}
      <div className="card" style={{
        marginBottom: 24,
        border: '1px solid rgba(16,185,129,0.28)',
        background: 'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(16,185,129,0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(16,185,129,0.18)',
              border: '1px solid rgba(16,185,129,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Cpu size={24} style={{ color: '#34d399' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>إدارة مفاتيح الذكاء الاصطناعي ومراقبة الكوتا (LLM Multi-API Quota)</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(16,185,129,0.16)', color: '#34d399',
                }}>
                  مجاني 100% + تبديل تلقائي
                </span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                أضف عدة مفاتيح API مجانية (Groq / Google Gemini / OpenRouter) ليتم توزيع الشات بوت وتصحيح المقالي وتحليل أخطاء الطلاب عليها تلقائياً مع عرض المتبقي في الكوتا لكل مفتاح.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadAiKeys}
              className="btn btn-secondary btn-sm"
              disabled={aiLoading}
            >
              <RefreshCw size={14} /> تحديث الكوتا
            </button>
            <button
              type="button"
              onClick={() => setShowAddKeyForm(v => !v)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> {showAddKeyForm ? 'إغلاق النموذج' : 'إضافة مفاتيح API جديدة'}
            </button>
          </div>
        </div>

        {/* Summary Quota Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}>
          <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>المفاتيح النشطة / الإجمالي</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 4 }}>
              {aiQuotaData?.summary?.activeKeys ?? 0} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>/ {aiQuotaData?.summary?.totalKeys ?? 0}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>الطلبات المتبقية اليوم (Requests)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
              {(aiQuotaData?.summary?.totalRemainingRequests ?? 0).toLocaleString()}{' '}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                / {(aiQuotaData?.summary?.totalRequestLimit ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>التوكنز المتبقية اليوم (Tokens)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#a5b4fc', marginTop: 4 }}>
              {(aiQuotaData?.summary?.totalRemainingTokens ?? 0).toLocaleString()}{' '}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                / {(aiQuotaData?.summary?.totalTokenLimit ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>نسبة الكوتا المتبقية الإجمالية</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: (aiQuotaData?.summary?.overallRemainingRequestsPercent ?? 0) > 25 ? '#10b981' : '#f59e0b' }}>
                {aiQuotaData?.summary?.overallRemainingRequestsPercent ?? 0}%
              </span>
              <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${aiQuotaData?.summary?.overallRemainingRequestsPercent ?? 0}%`,
                  background: (aiQuotaData?.summary?.overallRemainingRequestsPercent ?? 0) > 25 ? '#10b981' : '#f59e0b',
                  borderRadius: 99,
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Add Key Form */}
        {showAddKeyForm && (
          <form
            onSubmit={handleAddKey}
            style={{
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              إضافة مفتاح أو مجموعة مفاتيح API مجانية (يدعم إدخال عدة مفاتيح كل مفتاح في سطر مستقل)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">المزوّد المجاني (Provider)</label>
                <select
                  className="form-input"
                  value={keyForm.provider}
                  onChange={e => handleProviderChange(e.target.value as 'groq' | 'gemini' | 'openrouter')}
                  style={{ appearance: 'auto' }}
                >
                  <option value="groq">Groq Cloud (Llama 3.3 70B - سريع ومجاني)</option>
                  <option value="gemini">Google Gemini (Gemini 2.0 Flash - مجاني)</option>
                  <option value="openrouter">OpenRouter (Free Models)</option>
                </select>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  {DEFAULT_PROVIDER_MODELS[keyForm.provider]?.hint}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">اسم تعريفي للمفتاح (Label)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: حساب Groq الأول"
                  value={keyForm.label}
                  onChange={e => setKeyForm(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">اسم الموديل (Model)</label>
                <input
                  type="text"
                  className="form-input"
                  value={keyForm.model}
                  onChange={e => setKeyForm(prev => ({ ...prev, model: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الحد اليومي للطلبات (Requests/Day)</label>
                <input
                  type="number"
                  className="form-input"
                  min={10}
                  value={keyForm.dailyRequestLimit}
                  onChange={e => setKeyForm(prev => ({ ...prev, dailyRequestLimit: +e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الحد اليومي للتوكنز (Tokens/Day)</label>
                <input
                  type="number"
                  className="form-input"
                  min={1000}
                  value={keyForm.dailyTokenLimit}
                  onChange={e => setKeyForm(prev => ({ ...prev, dailyTokenLimit: +e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                مفتاح الـ API (يمكنك لصق مفتاح واحد أو عدة مفاتيح كل مفتاح في سطر جديد)
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx&#10;أو AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={keyForm.apiKey}
                onChange={e => setKeyForm(prev => ({ ...prev, apiKey: e.target.value }))}
                style={{ fontFamily: 'monospace', fontSize: 12.5 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowAddKeyForm(false)} className="btn btn-ghost btn-sm">
                إلغاء
              </button>
              <button type="submit" disabled={addingKey} className="btn btn-primary btn-sm">
                {addingKey ? 'جاري الحفظ...' : 'حفظ وتفعيل المفتاح'}
              </button>
            </div>
          </form>
        )}

        {/* Keys Table / Cards */}
        {(!aiQuotaData?.keys || aiQuotaData.keys.length === 0) ? (
          <div style={{
            padding: '20px',
            borderRadius: 12,
            background: 'rgba(245,158,11,0.08)',
            border: '1px dashed rgba(245,158,11,0.35)',
            color: '#fbbf24',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldAlert size={18} />
              <span>
                لم تتم إضافة مفاتيح API خارجية بعد (يعمل النظام حالياً بالمحلل الذكي المحلي الاحتياطي). اضغط على <strong>&quot;إضافة مفاتيح API جديدة&quot;</strong> لإضافة مفاتيح Groq أو Gemini المجانية!
              </span>
            </div>
            <button type="button" onClick={() => setShowAddKeyForm(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> أضف أول مفتاح مجاني الآن
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aiQuotaData.keys.map((k: any) => {
              const reqPct = k.remainingRequestsPercent ?? 0;
              const tokPct = k.remainingTokensPercent ?? 0;
              const statusColor =
                k.status === 'ACTIVE'
                  ? '#10b981'
                  : k.status === 'COOLDOWN'
                    ? '#f59e0b'
                    : k.status === 'EXHAUSTED'
                      ? '#ef4444'
                      : '#94a3b8';
              const statusLabel =
                k.status === 'ACTIVE'
                  ? 'نشط وجاهز'
                  : k.status === 'COOLDOWN'
                    ? 'تهدئة مؤقتة (429)'
                    : k.status === 'EXHAUSTED'
                      ? 'نفدت كوتا اليوم'
                      : 'متوقف يدوياً';

              return (
                <div
                  key={k.id}
                  style={{
                    background: 'rgba(15,23,42,0.8)',
                    border: `1px solid ${k.status === 'ACTIVE' ? 'rgba(16,185,129,0.28)' : 'var(--border)'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                        background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}55`,
                      }}>
                        ● {statusLabel}
                      </span>
                      <strong style={{ fontSize: 14, color: '#f8fafc' }}>{k.label}</strong>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: 'rgba(99,102,241,0.16)', color: '#a5b4fc', textTransform: 'uppercase',
                      }}>
                        {k.provider} · {k.model}
                      </span>
                      <code style={{ fontSize: 11.5, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>
                        {k.maskedKey}
                      </code>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleTestKey(k.id)}
                        disabled={testingKeyId === k.id}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 11.5 }}
                        title="اختبار الاتصال بالمفتاح"
                      >
                        <Play size={12} /> {testingKeyId === k.id ? 'جاري الاختبار...' : 'اختبار'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetQuota(k.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 11.5 }}
                        title="تصفير عداد الكوتا اليومي"
                      >
                        <RefreshCw size={12} /> تصفير الكوتا
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleKey(k)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: 11.5, color: k.isActive ? '#fbbf24' : '#34d399' }}
                      >
                        <Power size={12} /> {k.isActive ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(k.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 8px', color: '#f87171' }}
                        title="حذف المفتاح"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Quota Progress Bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    {/* Remaining Requests */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>الطلبات المتبقية اليوم (Requests):</span>
                        <strong style={{ color: reqPct > 20 ? '#38bdf8' : '#f87171' }}>
                          {(k.remainingRequests ?? 0).toLocaleString()} متبقي من {(k.dailyRequestLimit ?? 0).toLocaleString()} ({reqPct}%)
                        </strong>
                      </div>
                      <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${reqPct}%`,
                          background: reqPct > 20 ? 'linear-gradient(90deg, #0ea5e9, #38bdf8)' : '#ef4444',
                          borderRadius: 99,
                        }} />
                      </div>
                    </div>

                    {/* Remaining Tokens */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>التوكنز المتبقية اليوم (Tokens):</span>
                        <strong style={{ color: tokPct > 20 ? '#a5b4fc' : '#f87171' }}>
                          {(k.remainingTokens ?? 0).toLocaleString()} متبقي من {(k.dailyTokenLimit ?? 0).toLocaleString()} ({tokPct}%)
                        </strong>
                      </div>
                      <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${tokPct}%`,
                          background: tokPct > 20 ? 'linear-gradient(90deg, #6366f1, #a855f7)' : '#ef4444',
                          borderRadius: 99,
                        }} />
                      </div>
                    </div>
                  </div>

                  {k.lastError && (
                    <div style={{ fontSize: 11, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', padding: '5px 10px', borderRadius: 6 }}>
                      آخر تنبيه من المزود: {k.lastError}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>User Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Questions Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={questionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {questionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-2">
        {/* Generate Codes */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Generate Subscription Codes</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Batch-generate prepaid codes to distribute to students.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Plan</label>
                <select
                  value={codeForm.plan}
                  onChange={e => setCodeForm(prev => ({ ...prev, plan: e.target.value }))}
                  className="form-input"
                  style={{ appearance: 'auto' }}
                >
                  <option value="weekly">Weekly (7 days)</option>
                  <option value="monthly">Monthly (30 days)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  value={codeForm.quantity}
                  onChange={e => setCodeForm(prev => ({ ...prev, quantity: +e.target.value }))}
                  className="form-input"
                  min={1} max={500} placeholder="10"
                />
              </div>
            </div>
            <button onClick={generateCodes} disabled={generatingCodes} className="btn btn-primary">
              {generatingCodes
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</>
                : <><Key size={15} /> Generate {codeForm.quantity} Codes</>}
            </button>
          </div>
        </div>

        {/* Code Stats */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Subscription Codes Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Total Codes Generated', value: overview?.subscriptions?.totalCodes || 0, color: 'var(--primary-light)' },
              { label: 'Codes Used', value: overview?.subscriptions?.usedCodes || 0, color: 'var(--success)' },
              { label: 'Available Codes', value: overview?.subscriptions?.availableCodes || 0, color: 'var(--warning)' },
              { label: 'Active Subscriptions', value: overview?.subscriptions?.activeSubscriptions || 0, color: 'var(--accent)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: item.color, fontSize: 16 }}>{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
