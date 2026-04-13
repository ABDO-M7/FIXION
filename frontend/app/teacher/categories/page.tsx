'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { categoriesApi } from '@/lib/api';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  subject: string;
  bookName: string;
  chapter: string;
  lesson: string;
  questionNumber?: number;
}

const EMPTY_FORM = { subject: '', bookName: '', chapter: '', lesson: '', questionNumber: '' };

export default function TeacherCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoriesApi.list();
      setCategories(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (cat: Category) => {
    setForm({ subject: cat.subject, bookName: cat.bookName, chapter: cat.chapter, lesson: cat.lesson, questionNumber: String(cat.questionNumber || '') });
    setEditId(cat.id);
    setShowForm(true);
  };

  const saveCategory = async () => {
    if (!form.subject || !form.bookName || !form.chapter || !form.lesson) {
      toast.error('Please fill in subject, book, chapter, and lesson');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, questionNumber: form.questionNumber ? +form.questionNumber : undefined };
      if (editId) {
        await categoriesApi.update(editId, payload);
        setCategories(prev => prev.map(c => c.id === editId ? { ...c, ...payload } : c));
        toast.success('Category updated');
      } else {
        const res = await categoriesApi.create(payload);
        setCategories(prev => [...prev, res.data]);
        toast.success('Category created');
      }
      setShowForm(false);
      setEditId(null);
    } catch { toast.error('Failed to save category'); } finally { setSaving(false); }
  };

  const grouped = categories.reduce((acc, cat) => {
    if (!acc[cat.subject]) acc[cat.subject] = [];
    acc[cat.subject].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">{categories.length} categories · {Object.keys(grouped).length} subjects</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary"><Plus size={15} /> New Category</button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--primary)', boxShadow: 'var(--shadow-glow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>{editId ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">✕ Cancel</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { key: 'subject', label: 'Subject', placeholder: 'e.g. Mathematics' },
              { key: 'bookName', label: 'Book Name', placeholder: 'e.g. Algebra Textbook' },
              { key: 'chapter', label: 'Chapter', placeholder: 'e.g. Chapter 3' },
              { key: 'lesson', label: 'Lesson', placeholder: 'e.g. Quadratic Equations' },
              { key: 'questionNumber', label: 'Question No. (optional)', placeholder: 'e.g. 7' },
            ].map(field => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <input
                  value={(form as any)[field.key]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="form-input"
                  placeholder={field.placeholder}
                  type={field.key === 'questionNumber' ? 'number' : 'text'}
                />
              </div>
            ))}
          </div>
          <button onClick={saveCategory} disabled={saving} className="btn btn-primary">
            {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (editId ? 'Save Changes' : 'Create Category')}
          </button>
        </div>
      )}

      {/* Categories grouped by subject */}
      {loading ? (
        <div className="page-loader"><span className="spinner" /></div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><BookOpen size={40} /></div>
          <div className="empty-state-title">No categories yet</div>
          <div className="empty-state-text">Create categories to help organize questions by subject and chapter.</div>
          <button onClick={openCreate} className="btn btn-primary" style={{ marginTop: 16 }}>
            <Plus size={15} /> Create First Category
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([subject, cats]) => (
            <div key={subject}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} style={{ color: 'var(--primary-light)' }} />
                {subject}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({cats.length})</span>
              </h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Chapter</th>
                      <th>Lesson</th>
                      <th>Q. No.</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map(cat => (
                      <tr key={cat.id}>
                        <td style={{ fontSize: 13 }}>{cat.bookName}</td>
                        <td style={{ fontSize: 13 }}>{cat.chapter}</td>
                        <td style={{ fontSize: 13 }}>{cat.lesson}</td>
                        <td style={{ fontSize: 13 }}>{cat.questionNumber || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEdit(cat)} className="btn btn-secondary btn-sm"><Pencil size={12} /> Edit</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
