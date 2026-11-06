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
  Check,
  Sparkles,
  Users,
  Calculator,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  CheckCheck,
  RotateCcw,
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
  const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');
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

    if (user?.permissions !== undefined && user?.permissions !== null) {
      setSelectedPermissions(parsePermissions(user.permissions, userRole));
    } else {
      setSelectedPermissions(ROLE_PRESETS[userRole] || []);
    }

    setActiveTab('details');
    setStatusMsg(null);
    setIsOpen(true);
  };

  const handleRoleChange = (newRole: 'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE') => {
    setRole(newRole);
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

  const rolesList: {
    r: 'HR_ADMIN' | 'ACCOUNTANT' | 'SUPER_ADMIN' | 'EMPLOYEE';
    title: string;
    desc: string;
    icon: any;
    color: string;
  }[] = [
    {
      r: 'HR_ADMIN',
      title: 'HR Administrator',
      desc: 'Employee directory, attendance logs & leave requests',
      icon: Users,
      color: '#38bdf8',
    },
    {
      r: 'ACCOUNTANT',
      title: 'Financial Accountant',
      desc: 'Payroll calculations, salary slips, advances & deductions',
      icon: Calculator,
      color: '#34d399',
    },
    {
      r: 'SUPER_ADMIN',
      title: 'Super Administrator',
      desc: 'Full unrestricted system access & role management',
      icon: ShieldCheck,
      color: '#c084fc',
    },
    {
      r: 'EMPLOYEE',
      title: 'Regular Employee',
      desc: 'Self-service portal: view personal slips & request leaves',
      icon: Briefcase,
      color: '#94a3b8',
    },
  ];

  const modalContent = isOpen ? (
        <div
      className="user-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="user-modal-card">
        {/* Sticky Header */}
        <div className="user-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: isEditMode
                  ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.15) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isEditMode ? '#38bdf8' : '#34d399',
              }}
            >
              {isEditMode ? <Edit size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h3
                className="user-modal-title"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {isEditMode ? 'Edit User & Permissions' : 'Create New System User'}
              </h3>
              <p className="user-modal-subtitle" style={{ fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                {isEditMode
                  ? 'Configure authentication details, assigned tier, and module capabilities'
                  : 'Register user credentials and specify granular module privileges'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="user-modal-close-btn"
            style={{
              borderRadius: '10px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div
          className="user-modal-tabs"
          style={{
            padding: '0.65rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`user-modal-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              border: '1px solid transparent',
            }}
          >
            <UserIcon size={15} />
            <span>1. Account Credentials & Role</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`user-modal-tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              border: '1px solid transparent',
            }}
          >
            <KeyRound size={15} />
            <span>2. Granular Permissions</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '10px',
                background: role === 'SUPER_ADMIN' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(56, 189, 248, 0.2)',
                color: role === 'SUPER_ADMIN' ? '#c084fc' : '#38bdf8',
                marginLeft: '0.2rem',
              }}
            >
              {role === 'SUPER_ADMIN' ? 'All (22)' : `${selectedPermissions.length}/${ALL_PERMISSIONS.length}`}
            </span>
          </button>
        </div>

        {/* Modal Body / Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Scrollable Container */}
          <div className="user-modal-body">
            {statusMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: statusMsg.success ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${statusMsg.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: statusMsg.success ? '#4ade80' : '#f87171',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                {statusMsg.success ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* TAB 1: Account Credentials & Role */}
            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 2-Column Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.1rem' }}>
                  {/* Full Name */}
                  <div>
                    <label
                      className="user-modal-label"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: '0.45rem',
                      }}
                    >
                      <UserIcon size={14} style={{ color: '#38bdf8' }} /> Full Name <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="user-modal-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        outline: 'none',
                        transition: 'all 150ms ease',
                      }}
                    />
                  </div>

                  {/* Email Address */}
                  <div>
                    <label
                      className="user-modal-label"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: '0.45rem',
                      }}
                    >
                      <Mail size={14} style={{ color: '#38bdf8' }} /> Email Address (Username) <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. hr@mpcglobal.com"
                      className="user-modal-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        outline: 'none',
                        transition: 'all 150ms ease',
                      }}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      className="user-modal-label"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: '0.45rem',
                      }}
                    >
                      <Lock size={14} style={{ color: '#38bdf8' }} />
                      {isEditMode ? 'New Password (Optional)' : 'Password *'}
                    </label>
                    <input
                      type="password"
                      required={!isEditMode}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        isEditMode
                          ? 'Leave blank to retain current password'
                          : 'Minimum 6 characters'
                      }
                      className="user-modal-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        outline: 'none',
                        transition: 'all 150ms ease',
                      }}
                    />
                  </div>

                  {/* Account Status */}
                  <div>
                    <label
                      className="user-modal-label"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: '0.45rem',
                      }}
                    >
                      <Shield size={14} style={{ color: '#38bdf8' }} /> Account Status <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="user-modal-input"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="ACTIVE">ACTIVE (Authorized to login)</option>
                      <option value="INACTIVE">INACTIVE (Access revoked/blocked)</option>
                    </select>
                  </div>
                </div>

                {/* Primary Role Tier Selection */}
                <div style={{ marginTop: '0.5rem' }}>
                  <label
                    className="user-modal-label"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Shield size={16} style={{ color: '#8b5cf6' }} /> Primary Role Tier <span style={{ color: '#f87171' }}>*</span>
                  </label>

                  {/* Balanced 2x2 Grid of Roles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                    {rolesList.map(opt => {
                      const isSelected = role === opt.r;
                      const IconComp = opt.icon;

                      return (
                        <div
                          key={opt.r}
                          onClick={() => handleRoleChange(opt.r)}
                          className={`user-role-card ${isSelected ? 'selected' : ''}`}
                          style={{
                            padding: '0.9rem 1.1rem',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 180ms ease',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.85rem',
                          }}
                        >
                          <div
                            className="user-role-icon-box"
                            style={{
                              background: isSelected ? `${opt.color}25` : undefined,
                              border: isSelected ? `1px solid ${opt.color}40` : undefined,
                              color: isSelected ? opt.color : undefined,
                            }}
                          >
                            <IconComp size={18} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                              <span className="user-role-title" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                {opt.title}
                              </span>
                              {isSelected && (
                                <div
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: opt.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Check size={11} color="#070c18" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <p className="user-role-desc" style={{ fontSize: '0.75rem', margin: 0, lineHeight: 1.35 }}>
                              {opt.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Next Step Banner */}
                <div
                  className="user-feature-banner"
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Sparkles size={16} style={{ color: '#38bdf8' }} />
                    <span className="user-feature-banner-text" style={{ fontSize: '0.82rem' }}>
                      Ready to customize specific feature access?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('permissions')}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      borderRadius: '8px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <span>Configure Permissions ({selectedPermissions.length})</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Granular Permissions */}
            {activeTab === 'permissions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Permissions Toolbar */}
                <div
                  className="user-perm-toolbar"
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <KeyRound size={17} style={{ color: '#38bdf8' }} />
                    <div>
                      <div className="user-perm-toolbar-title" style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                        Fine-Grained Capabilities
                      </div>
                      <div className="user-perm-toolbar-sub" style={{ fontSize: '0.74rem' }}>
                        {role === 'SUPER_ADMIN'
                          ? 'Super Admin automatically has full authority over all modules.'
                          : `${selectedPermissions.length} of ${ALL_PERMISSIONS.length} permissions currently assigned`}
                      </div>
                    </div>
                  </div>

                  {/* Preset Shortcuts */}
                  {role !== 'SUPER_ADMIN' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => applyPreset('HR_ADMIN')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '7px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: 'rgba(56, 189, 248, 0.08)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Sparkles size={12} /> HR Preset
                      </button>

                      <button
                        type="button"
                        onClick={() => applyPreset('ACCOUNTANT')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '7px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: 'rgba(16, 185, 129, 0.08)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Sparkles size={12} /> Accountant Preset
                      </button>

                      <button
                        type="button"
                        onClick={selectAll}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '7px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#cbd5e1',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <CheckCheck size={12} /> Select All
                      </button>

                      <button
                        type="button"
                        onClick={clearAll}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '7px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.22)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <RotateCcw size={12} /> Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Categorized Permissions Grid */}
                {role === 'SUPER_ADMIN' ? (
                  <div
                    style={{
                      padding: '2.5rem 1.5rem',
                      borderRadius: '14px',
                      background: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <ShieldCheck size={40} style={{ color: '#c084fc' }} />
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                      Super Administrator — Universal Clearance
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#cbd5e1', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
                      This user has global access across all employee records, biometric attendance, financial payroll processing, salary calculations, and system administration.
                    </p>
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
                          className="user-perm-category-box"
                          style={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Category Header */}
                          <div
                            style={{
                              padding: '0.75rem 1rem',
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className="user-perm-category-title" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                {category}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  background: selectedInCat > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                  color: selectedInCat > 0 ? '#38bdf8' : '#94a3b8',
                                }}
                              >
                                {selectedInCat} / {perms.length} Active
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleCategory(category)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: allInCatSelected ? '#f87171' : '#38bdf8',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {allInCatSelected ? 'Deselect Category' : 'Select Category'}
                            </button>
                          </div>

                          {/* Permissions Cards Grid */}
                          <div
                            style={{
                              padding: '0.75rem 1rem',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                              gap: '0.65rem',
                            }}
                          >
                            {perms.map(p => {
                              const isChecked = selectedPermissions.includes(p.key);

                              return (
                                <div
                                  key={p.key}
                                  onClick={() => togglePermission(p.key)}
                                  className={`user-perm-item ${isChecked ? 'checked' : ''}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.65rem',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // handled by parent div
                                    style={{
                                      marginTop: '0.2rem',
                                      accentColor: '#0284c7',
                                      width: '16px',
                                      height: '16px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      className="user-perm-item-label"
                                      style={{
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        marginBottom: '0.15rem',
                                      }}
                                    >
                                      {p.label}
                                    </div>
                                    <div
                                      className="user-perm-item-desc"
                                      style={{
                                        fontSize: '0.72rem',
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {p.description}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Modal Footer */}
          <div
            className="user-modal-footer"
            style={{
              padding: '1rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              {activeTab === 'permissions' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <ArrowLeft size={14} /> Back to Credentials
                </button>
              ) : (
                <div className="user-role-summary-text">
                  Role: <strong className="user-role-summary-strong">{role.replace(/_/g, ' ')}</strong> ·{' '}
                  {role === 'SUPER_ADMIN' ? 'All Permissions Enabled' : `${selectedPermissions.length} Privileges Granted`}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="user-modal-cancel-btn"
                style={{
                  padding: '0.65rem 1.15rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.65rem 1.4rem',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 150ms ease',
                }}
              >
                {loading ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{isEditMode ? 'Update User' : 'Create User'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
          <style jsx global>{`
        .user-modal-overlay {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          background-color: rgba(3, 7, 18, 0.78);
          animation: userFadeIn 0.15s ease-out;
        }
        [data-theme="light"] .user-modal-overlay {
          background-color: rgba(15, 23, 42, 0.45) !important;
        }

        .user-modal-card {
          width: 100%;
          max-width: 860px;
          height: 90vh;
          max-height: 780px;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: #0b1329;
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08);
          animation: userScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-theme="light"] .user-modal-card {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
        }

        .user-modal-header {
          padding: 1.25rem 1.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #0f172a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        [data-theme="light"] .user-modal-header {
          background-color: #f8fafc !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .user-modal-title {
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0;
          line-height: 1.2;
          color: #ffffff;
        }
        [data-theme="light"] .user-modal-title {
          color: #0f172a !important;
        }

        .user-modal-subtitle {
          font-size: 0.8rem;
          margin: 2px 0 0 0;
          color: #94a3b8;
        }
        [data-theme="light"] .user-modal-subtitle {
          color: #64748b !important;
        }

        .user-modal-close-btn {
          border-radius: 10px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 150ms ease;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
        }
        .user-modal-close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);
        }
        [data-theme="light"] .user-modal-close-btn {
          background: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
          color: #64748b !important;
        }
        [data-theme="light"] .user-modal-close-btn:hover {
          background: #fee2e2 !important;
          color: #ef4444 !important;
          border-color: #fecaca !important;
        }

        .user-modal-tabs {
          padding: 0.65rem 1.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: rgba(15, 23, 42, 0.6);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        [data-theme="light"] .user-modal-tabs {
          background-color: #f1f5f9 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .user-modal-tab-btn {
          padding: 0.55rem 1rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
          transition: all 150ms ease;
          border: 1px solid transparent;
          background: transparent;
          color: #94a3b8;
        }
        .user-modal-tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }
        .user-modal-tab-btn.active {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.35);
        }
        [data-theme="light"] .user-modal-tab-btn {
          color: #64748b !important;
        }
        [data-theme="light"] .user-modal-tab-btn:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }
        [data-theme="light"] .user-modal-tab-btn.active {
          background: #ffffff !important;
          color: #0284c7 !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
        }

        .user-modal-body {
          padding: 1.5rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          overflow-y: auto;
          flex: 1;
          background-color: #0b1329;
        }
        [data-theme="light"] .user-modal-body {
          background-color: #ffffff !important;
        }

        .user-modal-label {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 0.45rem;
          color: #cbd5e1;
        }
        [data-theme="light"] .user-modal-label {
          color: #334155 !important;
        }

        .user-modal-input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          font-size: 0.875rem;
          outline: none;
          transition: all 150ms ease;
          background-color: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
        .user-modal-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18);
        }
        [data-theme="light"] .user-modal-input {
          background-color: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          color: #0f172a !important;
        }
        [data-theme="light"] .user-modal-input:focus {
          border-color: #0284c7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15) !important;
        }

        .user-role-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #94a3b8;
        }
        [data-theme="light"] .user-role-icon-box {
          background: #f1f5f9 !important;
          border: 1px solid #e2e8f0 !important;
          color: #64748b !important;
        }

        .user-role-card {
          padding: 0.9rem 1.1rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 180ms ease;
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .user-role-card:hover {
          background-color: rgba(15, 23, 42, 0.85);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .user-role-card.selected {
          background-color: rgba(56, 189, 248, 0.12);
          border: 1.5px solid #38bdf8;
        }
        [data-theme="light"] .user-role-card {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }
        [data-theme="light"] .user-role-card:hover {
          background-color: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
        }
        [data-theme="light"] .user-role-card.selected {
          background-color: #f0f9ff !important;
          border: 1.5px solid #0284c7 !important;
        }

        .user-role-title {
          font-weight: 700;
          font-size: 0.88rem;
          color: #ffffff;
        }
        [data-theme="light"] .user-role-title {
          color: #0f172a !important;
        }

        .user-role-desc {
          font-size: 0.75rem;
          margin: 0;
          line-height: 1.35;
          color: #94a3b8;
        }
        [data-theme="light"] .user-role-desc {
          color: #64748b !important;
        }

        .user-feature-banner {
          padding: 0.85rem 1.1rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.25rem;
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.2);
        }
        [data-theme="light"] .user-feature-banner {
          background: #f0f9ff !important;
          border: 1px solid #bae6fd !important;
        }

        .user-feature-banner-text {
          font-size: 0.82rem;
          color: #e2e8f0;
        }
        [data-theme="light"] .user-feature-banner-text {
          color: #0369a1 !important;
          font-weight: 600;
        }

        .user-perm-toolbar {
          padding: 0.85rem 1.1rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        [data-theme="light"] .user-perm-toolbar {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }

        .user-perm-toolbar-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #f8fafc;
        }
        [data-theme="light"] .user-perm-toolbar-title {
          color: #0f172a !important;
        }

        .user-perm-toolbar-sub {
          font-size: 0.74rem;
          color: #94a3b8;
        }
        [data-theme="light"] .user-perm-toolbar-sub {
          color: #64748b !important;
        }

        .user-perm-category-box {
          border-radius: 12px;
          overflow: hidden;
          background-color: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        [data-theme="light"] .user-perm-category-box {
          background-color: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
        }

        .user-perm-category-header {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        [data-theme="light"] .user-perm-category-header {
          background: #f8fafc !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .user-perm-category-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }
        [data-theme="light"] .user-perm-category-title {
          color: #0f172a !important;
        }

        .user-perm-item {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 150ms ease;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .user-perm-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .user-perm-item.checked {
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.35);
        }
        [data-theme="light"] .user-perm-item {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
        }
        [data-theme="light"] .user-perm-item:hover {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }
        [data-theme="light"] .user-perm-item.checked {
          background: #f0f9ff !important;
          border: 1px solid #7dd3fc !important;
        }

        .user-perm-item-label {
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 0.15rem;
          color: #f8fafc;
        }
        [data-theme="light"] .user-perm-item-label {
          color: #0f172a !important;
        }

        .user-perm-item-desc {
          font-size: 0.72rem;
          line-height: 1.35;
          color: #94a3b8;
        }
        [data-theme="light"] .user-perm-item-desc {
          color: #64748b !important;
        }

        .user-modal-footer {
          padding: 1rem 1.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background-color: #0f172a;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        [data-theme="light"] .user-modal-footer {
          background-color: #f8fafc !important;
          border-top: 1px solid #e2e8f0 !important;
        }

        .user-modal-cancel-btn {
          padding: 0.65rem 1.15rem;
          font-weight: 600;
          font-size: 0.85rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 150ms ease;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
        }
        .user-modal-cancel-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        [data-theme="light"] .user-modal-cancel-btn {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #475569 !important;
        }
        [data-theme="light"] .user-modal-cancel-btn:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }

        .user-role-summary-text {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        [data-theme="light"] .user-role-summary-text {
          color: #64748b !important;
        }

        .user-role-summary-strong {
          color: #ffffff;
        }
        [data-theme="light"] .user-role-summary-strong {
          color: #0f172a !important;
        }

        @keyframes userFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes userScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
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
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.85rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          <UserPlus size={16} />
          <span>Add New User</span>
        </button>
      )}

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
