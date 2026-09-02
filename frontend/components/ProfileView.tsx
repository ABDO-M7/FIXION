'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { authApi, uploadsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Camera, User, Phone, Save, GraduationCap, Hash } from 'lucide-react';
import AppShell from '@/components/AppShell';

export default function ProfileView() {
  const { user, setUser } = useAuthStore();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setLevel(user.level || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  if (!user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadsApi.upload(file);
      setAvatarUrl(res.data.url);
      toast.success('Avatar uploaded! Make sure to save changes.');
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const dataToUpdate: any = { name, phone, avatarUrl };
      if (user.role === 'student') dataToUpdate.level = level;
      
      const res = await authApi.updateProfile(dataToUpdate);
      setUser(res.data);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal information</p>
        </div>
      </div>

      <div style={{ maxWidth: 600, marginTop: 24 }}>
        <form className="card" onSubmit={handleSave} style={{ padding: 32 }}>
          
          {/* Avatar Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
            <div style={{ position: 'relative' }}>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }}
                />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: 'white' }}>
                  {name?.[0]?.toUpperCase() || user.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="icon-btn"
                style={{
                  position: 'absolute', bottom: -4, right: -4,
                  background: 'var(--primary)', color: 'white',
                  width: 28, height: 28, border: '2px solid var(--bg)'
                }}
                disabled={isUploading}
              >
                {isUploading ? <span className="spinner" style={{ width: 14, height: 14, borderColor: 'white', borderRightColor: 'transparent' }} /> : <Camera size={14} />}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Profile Picture</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Upload a square image for best results.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  required
                />
              </div>
            </div>

            {user.role === 'student' && (
              <div className="form-group">
                <label className="form-label">School Level</label>
                <div style={{ position: 'relative' }}>
                  <GraduationCap size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    required
                  >
                    <option value="" disabled>Select level...</option>
                    <option value="Level 1">Level 1</option>
                    <option value="Level 2">Level 2</option>
                    <option value="Level 3">Level 3</option>
                  </select>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Your ID Code</label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={user.studentId || 'Not assigned yet'}
                  className="form-input"
                  style={{ paddingLeft: 36, background: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                  readOnly
                  disabled
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>This is your unique auto-generated ID.</p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 12, padding: '12px', fontSize: 15 }}
              disabled={isLoading || isUploading}
            >
              {isLoading ? <span className="spinner" /> : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
