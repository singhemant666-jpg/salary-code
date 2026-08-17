'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createHoliday, updateHoliday } from '@/actions/holidays';
import { Plus, Edit2, X } from 'lucide-react';

interface Holiday {
  id: string;
  name: string;
  date: Date | string;
  isOptional: boolean;
}

export default function HolidayModal({ holiday }: { holiday?: Holiday }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isEditing = !!holiday;

  const initialDateStr = holiday?.date
    ? new Date(holiday.date).toISOString().split('T')[0]
    : '';

  const [name, setName] = useState(holiday?.name || '');
  const [date, setDate] = useState(initialDateStr);
  const [isOptional, setIsOptional] = useState(holiday?.isOptional || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('date', date);
    formData.append('isOptional', isOptional ? 'true' : 'false');

    let result;
    if (isEditing && holiday) {
      result = await updateHoliday(holiday.id, formData);
    } else {
      result = await createHoliday(formData);
    }

    if (result.success) {
      setIsOpen(false);
      if (!isEditing) {
        setName('');
        setDate('');
        setIsOptional(false);
      }
      router.refresh();
    } else {
      alert(result.message);
    }
    setLoading(false);
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '460px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
          padding: '1.75rem',
        }}
      >
        <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEditing ? 'Edit Holiday' : 'Add New Holiday'}
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn btn-ghost btn-icon"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Holiday Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Independence Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Holiday Date *</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-checkbox-group">
              <label htmlFor={`isOptional-${holiday?.id || 'new'}`} className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main, #f8fafc)' }}>
                <input
                  type="checkbox"
                  id={`isOptional-${holiday?.id || 'new'}`}
                  className="form-checkbox"
                  checked={isOptional}
                  onChange={(e) => setIsOptional(e.target.checked)}
                />
                Optional / Restricted Holiday
              </label>
            </div>
          </div>

          <div className="flex-gap" style={{ justifyContent: 'flex-end', display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Holiday'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      {isEditing ? (
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-ghost btn-icon btn-sm"
          title="Edit Holiday"
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <Edit2 size={15} />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> Add Holiday
        </button>
      )}

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
