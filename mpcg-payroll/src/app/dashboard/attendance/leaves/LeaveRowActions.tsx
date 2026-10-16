'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updateLeaveStatus, deleteLeave, sendLeaveWhatsAppNotificationManually } from '@/actions/leaves';
import ApproveLeaveModal from './ApproveLeaveModal';
import { Check, X, Trash2, MessageCircle, ChevronDown, RotateCcw } from 'lucide-react';

interface LeaveRowActionsProps {
  leave: {
    id: string;
    status: string;
    employeeName: string;
    employeeId: string;
    mobileNumber?: string | null;
    fromDateStr: string;
    toDateStr: string;
    fromDateRaw: string;
    toDateRaw: string;
    leaveType: string;
  };
}

export default function LeaveRowActions({ leave }: LeaveRowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleMenu = () => {
    if (!isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: Math.max(12, window.innerWidth - rect.right),
      });
      setIsMenuOpen(true);
    } else {
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleScrollOrResize = () => setIsMenuOpen(false);
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleApprove = () => {
    setIsMenuOpen(false);
    setIsApproveModalOpen(true);
  };

  const handleReject = async () => {
    setIsMenuOpen(false);
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return;
    setLoading(true);
    const res = await updateLeaveStatus(leave.id, 'REJECTED', undefined, undefined, reason);
    if (res.success) {
      if (res.whatsappUrl && !res.whatsappSent) {
        if (confirm('Leave application rejected. Would you like to open WhatsApp to notify the employee?')) {
          window.open(res.whatsappUrl, '_blank');
        }
      } else {
        alert(res.message);
      }
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    setIsMenuOpen(false);
    setLoading(true);
    const res = await updateLeaveStatus(leave.id, 'CANCELLED');
    if (res.success) {
      if (res.whatsappUrl && !res.whatsappSent) {
        if (confirm('Leave cancelled. Would you like to open WhatsApp to notify the employee?')) {
          window.open(res.whatsappUrl, '_blank');
        }
      } else {
        alert(res.message);
      }
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  const handleWhatsApp = async () => {
    setIsMenuOpen(false);
    setLoading(true);
    const res = await sendLeaveWhatsAppNotificationManually(leave.id);
    setLoading(false);
    if (res.whatsappUrl && !res.whatsappSent) {
      window.open(res.whatsappUrl, '_blank');
    }
    alert(res.message);
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!confirm('Are you sure you want to delete this leave record?')) return;
    setLoading(true);
    const res = await deleteLeave(leave.id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'flex-end' }}>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleMenu}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem',
            fontSize: '0.76rem',
            fontWeight: 600,
            borderRadius: '8px',
            background: isMenuOpen ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.06)',
            color: isMenuOpen ? '#818cf8' : 'var(--text-primary)',
            border: isMenuOpen ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid var(--border-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: isMenuOpen ? '0 0 10px rgba(99, 102, 241, 0.25)' : 'none',
          }}
          title="Click to view actions"
        >
          <span>Actions</span>
          <ChevronDown
            size={12}
            style={{
              transition: 'transform 0.2s ease',
              transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: 0.85,
            }}
          />
        </button>
      </div>

      {mounted && isMenuOpen && createPortal(
        <div
          ref={menuRef}
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            right: `${menuPos.right}px`,
            minWidth: '175px',
            background: 'var(--bg-modal, #0f172a)',
            border: '1px solid var(--modal-border, rgba(255, 255, 255, 0.12))',
            borderRadius: '10px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
            padding: '0.35rem',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            backdropFilter: 'blur(12px)',
          }}
        >
          {leave.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={handleApprove}
                className="leave-dropdown-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#34d399',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s ease',
                }}
              >
                <Check size={14} style={{ color: '#10b981' }} strokeWidth={2.5} />
                <span>Approve Leave</span>
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="leave-dropdown-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#f87171',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s ease',
                }}
              >
                <X size={14} style={{ color: '#ef4444' }} strokeWidth={2.5} />
                <span>Reject Leave</span>
              </button>

              <div style={{ height: '1px', background: 'var(--border-secondary, rgba(255, 255, 255, 0.08))', margin: '0.2rem 0' }} />
            </>
          )}

          {leave.status === 'APPROVED' && (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="leave-dropdown-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary, #94a3b8)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s ease',
                }}
              >
                <RotateCcw size={14} style={{ color: '#94a3b8' }} />
                <span>Cancel Leave</span>
              </button>

              <div style={{ height: '1px', background: 'var(--border-secondary, rgba(255, 255, 255, 0.08))', margin: '0.2rem 0' }} />
            </>
          )}

          <button
            type="button"
            onClick={handleWhatsApp}
            className="leave-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#22c55e',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s ease',
            }}
          >
            <MessageCircle size={14} style={{ color: '#22c55e' }} strokeWidth={2.2} />
            <span>Send WhatsApp</span>
          </button>

          <div style={{ height: '1px', background: 'var(--border-secondary, rgba(255, 255, 255, 0.08))', margin: '0.2rem 0' }} />

          <button
            type="button"
            onClick={handleDelete}
            className="leave-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#ef4444',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s ease',
            }}
          >
            <Trash2 size={14} style={{ color: '#ef4444' }} />
            <span>Delete Record</span>
          </button>
        </div>,
        document.body
      )}

      <ApproveLeaveModal
        leave={leave}
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onSuccess={() => router.refresh()}
      />

      <style jsx global>{`
        .leave-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.08) !important;
        }
        [data-theme="light"] .leave-dropdown-item:hover {
          background: rgba(0, 0, 0, 0.06) !important;
        }
      `}</style>
    </>
  );
}
