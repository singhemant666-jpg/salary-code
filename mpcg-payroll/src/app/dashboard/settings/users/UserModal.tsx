'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createUser, updateUser } from '@/actions/users';
import { UserPlus, Edit, X, Lock, Mail, User as UserIcon, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface UserData {
  id?: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'HR_ADMIN' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
}

interface UserModalProps {
  user?: UserData;
  triggerButton?: React.ReactNode;
}

export default function UserModal({ user, triggerButton }: UserModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'HR_ADMIN' | 'EMPLOYEE'>(user?.role || 'HR_ADMIN');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(user?.status || 'ACTIVE');

  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isEditMode = !!user?.id;

  const handleOpen = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPassword('');
    setRole(user?.role || 'HR_ADMIN');
    setStatus(user?.status || 'ACTIVE');
    setStatusMsg(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('role', role);
    formData.append('status', status);

    let res;
    if (isEditMode && user?.id) {
      res = await updateUser(user.id, formData);
    } else {
      res = await createUser(formData);
    }

    setLoading(false);

    if (res.success) {
      setStatusMsg({ success: true, text: res.message });
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 700);
    } else {
      setStatusMsg({ success: false, text: res.message });
    }
  };

  const modalContent = isOpen ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4' }}>
              {isEditMode ? <Edit size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {isEditMode ? 'Edit User Credentials' : 'Add New System User'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {isEditMode ? 'Update user name, email, role or reset password' : 'Create login credentials for Super Admin or HR Admin'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {statusMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: statusMsg.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${statusMsg.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: statusMsg.success ? '#4ade80' : '#f87171',
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {statusMsg.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserIcon size={14} style={{ color: '#06b6d4' }} /> Full Name *
            </label>
            <input
              type="text"
              className="form-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              style={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
            />
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={14} style={{ color: '#06b6d4' }} /> Email Address (Login Username) *
            </label>
            <input
              type="email"
              className="form-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. hr@mpcglobal.com"
              style={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={14} style={{ color: '#06b6d4' }} /> {isEditMode ? 'New Password (Optional)' : 'Password *'}
            </label>
            <input
              type="password"
              className="form-input"
              required={!isEditMode}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditMode ? 'Leave blank to keep existing password...' : 'Enter minimum 6 characters password...'}
              style={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
            />
            {isEditMode && (
              <span style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.2rem', display: 'block' }}>
                💡 Only type a password here if you want to change/reset this user's password.
              </span>
            )}
          </div>

          {/* Role & Status Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={14} style={{ color: '#8b5cf6' }} /> User Role *
              </label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                style={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
              >
                <option value="HR_ADMIN">HR Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}>
                Account Status *
              </label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            marginTop: '0.5rem'
          }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                padding: '0.65rem 1.15rem',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.65rem 1.4rem',
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update User Credentials' : 'Create System User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      {triggerButton ? (
        <span onClick={handleOpen} style={{ cursor: 'pointer' }}>
          {triggerButton}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="btn btn-primary"
          style={{ gap: '0.45rem', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}
        >
          <UserPlus size={16} />
          + Add New User
        </button>
      )}

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
