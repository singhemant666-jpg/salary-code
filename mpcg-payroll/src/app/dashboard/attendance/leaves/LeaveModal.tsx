'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createLeave } from '@/actions/leaves';
import { Plus, X, Calendar, UserCheck } from 'lucide-react';

interface SimpleEmployee {
  id: string;
  name: string;
  employeeId: string;
  department?: string | null;
}

export default function LeaveModal({ employees }: { employees: SimpleEmployee[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const [employeeId, setEmployeeId] = useState('');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [leaveType, setLeaveType] = useState('PAID_LEAVE');
  const [reason, setReason] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);

  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState('FIRST_HALF');
  const [halfDayTime, setHalfDayTime] = useState('09:00 AM - 01:30 PM');

  const handleHalfDayTypeChange = (type: string) => {
    setHalfDayType(type);
    if (type === 'FIRST_HALF') setHalfDayTime('09:00 AM - 01:30 PM');
    else if (type === 'SECOND_HALF') setHalfDayTime('01:30 PM - 06:00 PM');
    else setHalfDayTime('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      alert('Please select an employee');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('fromDate', fromDate);
    formData.append('toDate', toDate);
    formData.append('leaveType', leaveType);
    formData.append('isHalfDay', String(isHalfDay));
    formData.append('halfDayType', halfDayType);
    formData.append('halfDayTime', halfDayTime);
    formData.append('reason', reason);
    formData.append('autoApprove', autoApprove ? 'true' : 'false');

    const result = await createLeave(formData);

    if (result.success) {
      setIsOpen(false);
      setReason('');
      setIsHalfDay(false);
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
          maxWidth: '500px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
          padding: '1.75rem',
        }}
      >
        <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Apply / Add Employee Leave
            </h2>
            <p className="text-xs text-muted" style={{ marginTop: '0.1rem' }}>
              Record approved paid leave, sick leave, or unpaid absence
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn btn-ghost btn-icon"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Select Employee *</label>
              <select
                className="form-select"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeId}) {emp.department ? `· ${emp.department}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>From Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    if (e.target.value > toDate) setToDate(e.target.value);
                  }}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>To Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Leave Type *</label>
              <select
                className="form-select"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="PAID_LEAVE">Paid Leave (PL)</option>
                <option value="CASUAL_LEAVE">Casual Leave (CL)</option>
                <option value="SICK_LEAVE">Sick Leave (SL)</option>
                <option value="UNPAID_LEAVE">Unpaid Leave / LOP</option>
              </select>
            </div>

            <div className="form-group" style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border-secondary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                />
                <span>Is Half Day Leave?</span>
              </label>

              {isHalfDay && (
                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="button" onClick={() => handleHalfDayTypeChange('FIRST_HALF')} className={`btn btn-xs ${halfDayType === 'FIRST_HALF' ? 'btn-primary' : 'btn-ghost'}`}>First Half</button>
                    <button type="button" onClick={() => handleHalfDayTypeChange('SECOND_HALF')} className={`btn btn-xs ${halfDayType === 'SECOND_HALF' ? 'btn-primary' : 'btn-ghost'}`}>Second Half</button>
                    <button type="button" onClick={() => handleHalfDayTypeChange('SPECIFIC_TIME')} className={`btn btn-xs ${halfDayType === 'SPECIFIC_TIME' ? 'btn-primary' : 'btn-ghost'}`}>Custom Time</button>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Timing e.g. 09:00 AM - 01:30 PM"
                    value={halfDayTime}
                    onChange={(e) => setHalfDayTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Reason / Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Medical emergency, Family function, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-checkbox-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                />
                <span>Approve immediately (mark days as Paid Leave in Daily Attendance)</span>
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UserCheck size={16} />
              {loading ? 'Saving...' : 'Submit Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Plus size={18} /> Apply / Add Leave
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
