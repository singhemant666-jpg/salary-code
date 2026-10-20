'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createUser, updateUser } from '@/actions/users';
import {
  ALL_PERMISSIONS,
  PERMISSIONS_BY_CATEGORY,
  ROLE_PRESETS,
  parsePermissions,
  PermissionKey,
  PermissionCategory,
} from '@/lib/permissions';
import {
  UserPlus,
  Edit,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  CheckCircle,
  AlertCircle,
  KeyRound,
  SlidersHorizontal,
  Check,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

interface UserData {
  id?: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
  permissions?: any;
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
  const [role, setRole] = useState<'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE'>(
    user?.role || 'HR_ADMIN'
  );
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(user?.status || 'ACTIVE');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isEditMode = !!user?.id;

  const handleOpen = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPassword('');
    const userRole = user?.role || 'HR_ADMIN';
    setRole(userRole);
    setStatus(user?.status || 'ACTIVE');

    // Initialize permissions
    if (user?.permissions !== undefined && user?.permissions !== null) {
      setSelectedPermissions(parsePermissions(user.permissions, userRole));
    } else {
      setSelectedPermissions(ROLE_PRESETS[userRole] || []);
    }

    setStatusMsg(null);
    setIsOpen(true);
  };

  const handleRoleChange = (newRole: 'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE') => {
    setRole(newRole);
    // Apply role preset default
    setSelectedPermissions(ROLE_PRESETS[newRole] || []);
  };

  const togglePermission = (key: PermissionKey) => {
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleCategory = (category: PermissionCategory) => {
    const catKeys = PERMISSIONS_BY_CATEGORY[category].map(p => p.key);
    const allSelected = catKeys.every(k => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(k => !catKeys.includes(k)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...catKeys])));
    }
  };

  const selectAll = () => {
    setSelectedPermissions(ALL_PERMISSIONS.map(p => p.key));
  };

  const clearAll = () => {
    setSelectedPermissions([]);
  };

  const applyPreset = (presetRole: 'HR_ADMIN' | 'ACCOUNTANT' | 'SUPER_ADMIN') => {
    setSelectedPermissions(ROLE_PRESETS[presetRole] || []);
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

    // Save permissions as JSON array string
    const permsToSave = role === 'SUPER_ADMIN' ? ALL_PERMISSIONS.map(p => p.key) : selectedPermissions;
    formData.append('permissions', JSON.stringify(permsToSave));

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
        padding: '1.25rem',
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
          maxWidth: '820px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-modal, #0f172a)',
          color: 'var(--text-on-modal, #f8fafc)',
          border: '1px solid var(--modal-border, rgba(255, 255, 255, 0.12))',
          borderRadius: '18px',
          boxShadow: 'var(--modal-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.6))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-modal-header, rgba(15, 23, 42, 0.6))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                padding: '0.5rem',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.2)',
                color: '#06b6d4',
              }}
            >
              {isEditMode ? <Edit size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--text-on-modal, #f8fafc)',
                  margin: 0,
                }}
              >
                {isEditMode ? 'Edit User & Permissions' : 'Add New System User'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-label-muted, #94a3b8)' }}>
                {isEditMode
                  ? 'Customize roles, credentials, and granular module permissions'
                  : 'Create user account and assign custom feature permissions'}
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
              color: 'var(--text-label-muted, #94a3b8)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {statusMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: statusMsg.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${statusMsg.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: statusMsg.success ? '#4ade80' : '#f87171',
                fontSize: '0.85rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {statusMsg.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* User Basic Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Full Name */}
            <div className="form-group">
              <label
                className="form-label"
                style={{
                  color: 'var(--text-label, #e2e8f0)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <UserIcon size={14} style={{ color: '#06b6d4' }} /> Full Name *
              </label>
              <input
                type="text"
                className="form-input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{
                  background: 'var(--bg-input, #1e293b)',
                  borderColor: 'var(--border-input, rgba(255, 255, 255, 0.1))',
                  color: 'var(--text-on-modal, #f8fafc)',
                }}
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label
                className="form-label"
                style={{
                  color: 'var(--text-label, #e2e8f0)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Mail size={14} style={{ color: '#06b6d4' }} /> Email Address (Username) *
              </label>
              <input
                type="email"
                className="form-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. hr@mpcglobal.com"
                style={{
                  background: 'var(--bg-input, #1e293b)',
                  borderColor: 'var(--border-input, rgba(255, 255, 255, 0.1))',
                  color: 'var(--text-on-modal, #f8fafc)',
                }}
              />
            </div>
          </div>

          {/* Password & Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Password */}
            <div className="form-group">
              <label
                className="form-label"
                style={{
                  color: 'var(--text-label, #e2e8f0)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Lock size={14} style={{ color: '#06b6d4' }} />{' '}
                {isEditMode ? 'New Password (Optional)' : 'Password *'}
              </label>
              <input
                type="password"
                className="form-input"
                required={!isEditMode}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isEditMode
                    ? 'Leave blank to keep existing password...'
                    : 'Enter minimum 6 characters password...'
                }
                style={{
                  background: 'var(--bg-input, #1e293b)',
                  borderColor: 'var(--border-input, rgba(255, 255, 255, 0.1))',
                  color: 'var(--text-on-modal, #f8fafc)',
                }}
              />
            </div>

            {/* Status */}
            <div className="form-group">
              <label
                className="form-label"
                style={{
                  color: 'var(--text-label, #e2e8f0)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Account Status *
              </label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{
                  background: 'var(--bg-input, #1e293b)',
                  borderColor: 'var(--border-input, rgba(255, 255, 255, 0.1))',
                  color: 'var(--text-on-modal, #f8fafc)',
                }}
              >
                <option value="ACTIVE">ACTIVE (Can log in)</option>
                <option value="INACTIVE">INACTIVE (Access blocked)</option>
              </select>
            </div>
          </div>

          {/* User Role Selection */}
          <div className="form-group">
            <label
              className="form-label"
              style={{
                color: 'var(--text-label, #e2e8f0)',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Shield size={14} style={{ color: '#8b5cf6' }} /> Primary Role *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
              {[
                { r: 'HR_ADMIN', label: 'HR Admin', desc: 'Employees, Attendance & Leaves' },
                { r: 'ACCOUNTANT', label: 'Accountant', desc: 'Payroll, Slips & Deductions' },
                { r: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Unrestricted Full Access' },
                { r: 'EMPLOYEE', label: 'Employee', desc: 'Self-Service Portal' },
              ].map(opt => {
                const isSelected = role === opt.r;
                return (
                  <button
                    key={opt.r}
                    type="button"
                    onClick={() => handleRoleChange(opt.r as any)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${isSelected ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(8, 145, 178, 0.08))'
                        : 'rgba(255, 255, 255, 0.03)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#38bdf8' : 'var(--text-on-modal, #f8fafc)' }}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} color="#0f172a" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-label-muted, #94a3b8)', marginTop: '2px' }}>
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Permissions Matrix */}
          <div
            style={{
              marginTop: '0.5rem',
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#38bdf8',
                  }}
                >
                  <KeyRound size={16} /> Granular Feature Permissions
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: '#06b6d4',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    {role === 'SUPER_ADMIN'
                      ? 'Full Access (All Enabled)'
                      : `${selectedPermissions.length} / ${ALL_PERMISSIONS.length} Allowed`}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-label-muted, #94a3b8)', marginTop: '2px' }}>
                  Toggle specific permissions on or off for this user.
                </div>
              </div>

              {/* Quick Preset Buttons */}
              {role !== 'SUPER_ADMIN' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => applyPreset('HR_ADMIN')}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <Sparkles size={12} style={{ color: '#06b6d4' }} /> HR Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('ACCOUNTANT')}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <Sparkles size={12} style={{ color: '#10b981' }} /> Accountant Defaults
                  </button>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem', color: '#ef4444' }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {role === 'SUPER_ADMIN' ? (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  fontSize: '0.82rem',
                  color: '#e2e8f0',
                  lineHeight: '1.5',
                }}
              >
                🛡️ <strong>Super Administrator</strong> has universal access across all modules, including user management, payroll, settings, and database imports. Granular toggles are automatically enabled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(Object.keys(PERMISSIONS_BY_CATEGORY) as PermissionCategory[]).map(category => {
                  const perms = PERMISSIONS_BY_CATEGORY[category];
                  const selectedInCat = perms.filter(p => selectedPermissions.includes(p.key)).length;
                  const allInCatSelected = selectedInCat === perms.length;

                  return (
                    <div
                      key={category}
                      style={{
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Category Header */}
                      <div
                        style={{
                          padding: '0.65rem 0.85rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-on-modal, #f8fafc)' }}>
                          {category}{' '}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-label-muted, #94a3b8)', fontWeight: 500 }}>
                            ({selectedInCat}/{perms.length})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: allInCatSelected ? '#ef4444' : '#06b6d4',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {allInCatSelected ? 'Deselect Category' : 'Select Category'}
                        </button>
                      </div>

                      {/* Permissions List in Category */}
                      <div style={{ padding: '0.65rem 0.85rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
                        {perms.map(p => {
                          const isChecked = selectedPermissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.6rem',
                                padding: '0.5rem 0.65rem',
                                borderRadius: '8px',
                                background: isChecked ? 'rgba(6, 182, 212, 0.07)' : 'rgba(255, 255, 255, 0.01)',
                                border: `1px solid ${isChecked ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.04)'}`,
                                cursor: 'pointer',
                                transition: 'all 150ms ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(p.key)}
                                style={{ marginTop: '0.2rem', accentColor: '#06b6d4', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isChecked ? '#38bdf8' : 'var(--text-on-modal, #f8fafc)' }}>
                                  {p.label}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-label-muted, #94a3b8)', lineHeight: '1.3', marginTop: '1px' }}>
                                  {p.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-primary, rgba(255, 255, 255, 0.1))',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                padding: '0.65rem 1.15rem',
                background: 'var(--btn-ghost-bg, rgba(255, 255, 255, 0.05))',
                color: 'var(--btn-ghost-text, #94a3b8)',
                fontWeight: 600,
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--btn-ghost-border, rgba(255, 255, 255, 0.1))',
                cursor: 'pointer',
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
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update User & Permissions' : 'Create System User'}
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
