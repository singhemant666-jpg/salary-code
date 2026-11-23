'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  X,
  Calendar,
  Sparkles,
  Clock,
  Stethoscope,
  UserCheck,
  Copy,
  Check,
  ShieldAlert,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { LeaveItem } from './LeavesClient';
import { parseClinicalSkills } from '@/lib/clinical-skills';
import { getGroqDoctorArrangement, type GroqClashResult } from '@/actions/groq-clash-ai';

export interface ClashingEmployee {
  id: string;
  employeeName: string;
  employeeId: string;
  department?: string | null;
  designation?: string | null;
  status: string;
  fromDateStr: string;
  toDateStr: string;
  fromDateRaw?: string;
  toDateRaw?: string;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  clinicalSkills?: string | null;
  mobile?: string | null;
  isSameDepartment?: boolean;
}

interface ClashDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: LeaveItem | null;
  clashes: ClashingEmployee[];
  allEmployees?: Array<{
    id: string;
    name: string;
    employeeId: string;
    department: string | null;
    designation?: string | null;
    shiftStartTime?: string | null;
    shiftEndTime?: string | null;
    clinicalSkills?: string | null;
    mobile?: string | null;
  }>;
  allLeaves?: LeaveItem[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarBg(name: string): string {
  const colors = [
    'linear-gradient(135deg, #6366f1, #4f46e5)',
    'linear-gradient(135deg, #06b6d4, #0891b2)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function isPhysiotherapyStaff(dept?: string | null): boolean {
  const d = (dept || '').toLowerCase().trim();
  return d.includes('physio');
}

export default function ClashDetailsModal({
  isOpen,
  onClose,
  leave,
  clashes,
  allEmployees = [],
  allLeaves = [],
}: ClashDetailsModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<'ai-plan' | 'clash'>('ai-plan');
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Groq AI State
  const [groqResult, setGroqResult] = useState<GroqClashResult | null>(null);
  const [groqLoading, setGroqLoading] = useState(false);

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // AI Coverage & Doctor Replacement Analysis
  const aiAnalysis = useMemo(() => {
    if (!leave) return null;

    // 1. Gather all clashing doctors
    const clashingDoctors = [
      {
        name: leave.employee.name,
        employeeId: leave.employee.employeeId,
        department: leave.employee.department,
        designation: leave.employee.designation,
        shiftStart: leave.employee.shiftStartTime || '09:00',
        shiftEnd: leave.employee.shiftEndTime || '18:00',
        skills: parseClinicalSkills(leave.employee.clinicalSkills),
        fromDate: leave.fromDateRaw,
        toDate: leave.toDateRaw,
      },
      ...clashes.map((c) => ({
        name: c.employeeName,
        employeeId: c.employeeId,
        department: c.department,
        designation: c.designation,
        shiftStart: c.shiftStartTime || '09:00',
        shiftEnd: c.shiftEndTime || '18:00',
        skills: parseClinicalSkills(c.clinicalSkills),
        fromDate: c.fromDateRaw || leave.fromDateRaw,
        toDate: c.toDateRaw || leave.toDateRaw,
      })),
    ];

    // 2. Identify missing / affected skills
    const skillCounts: Record<string, number> = {};
    clashingDoctors.forEach((doc) => {
      doc.skills.forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    const affectedSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // 3. Time slot shortage detection
    const morningAbsent = clashingDoctors.some((d) => d.shiftStart <= '10:00');
    const eveningAbsent = clashingDoctors.some((d) => d.shiftEnd >= '18:30');

    // 4. Overlap date window
    const clashDatesStr =
      leave.fromDateStr === leave.toDateStr ? leave.fromDateStr : `${leave.fromDateStr} – ${leave.toDateStr}`;

    // 5. Find other active doctors NOT on leave during these dates
    const clashingIds = new Set(clashingDoctors.map((d) => d.employeeId));

    const busyEmployeeIds = new Set<string>();
    allLeaves.forEach((l) => {
      if (l.status === 'APPROVED' || l.status === 'PENDING') {
        if (l.fromDateRaw <= leave.toDateRaw && l.toDateRaw >= leave.fromDateRaw) {
          busyEmployeeIds.add(l.employee.employeeId);
        }
      }
    });

    // Strictly filter to Physiotherapy department only!
    const candidateDoctors = allEmployees
      .filter((emp) => {
        if (clashingIds.has(emp.employeeId) || busyEmployeeIds.has(emp.employeeId)) return false;
        return isPhysiotherapyStaff(emp.department);
      })
      .map((emp) => {
        const empSkills = parseClinicalSkills(emp.clinicalSkills);
        const matchingSkills = affectedSkills
          .map((s) => s.name)
          .filter((s) => empSkills.some((es) => es.toLowerCase() === s.toLowerCase()));

        return {
          id: emp.id,
          name: emp.name,
          employeeId: emp.employeeId,
          department: emp.department,
          designation: emp.designation,
          shiftStart: emp.shiftStartTime || '09:00',
          shiftEnd: emp.shiftEndTime || '18:00',
          skills: empSkills,
          matchingSkills,
          matchScore: matchingSkills.length,
          isLateShift: (emp.shiftStartTime || '09:00') >= '11:00',
          isEarlyShift: (emp.shiftStartTime || '09:00') <= '09:30',
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    // Fallback recommendations if Groq is loading
    const fallbackRecommendations: Array<{
      type: 'EXTEND_SHIFT' | 'CROSS_COVERAGE' | 'STAGGER_LEAVE';
      title: string;
      doctorName?: string;
      details: string;
      badge: string;
      badgeColor: string;
    }> = [];

    if (morningAbsent) {
      const lateShiftCandidate = candidateDoctors.find((d) => d.isLateShift && d.matchScore > 0);
      if (lateShiftCandidate) {
        fallbackRecommendations.push({
          type: 'EXTEND_SHIFT',
          title: `Shift Extension: Dr. ${lateShiftCandidate.name}`,
          doctorName: lateShiftCandidate.name,
          details: `Ask Dr. ${lateShiftCandidate.name} (scheduled: ${lateShiftCandidate.shiftStart} – ${lateShiftCandidate.shiftEnd}) to report early at 09:00 AM to cover morning Modalities.`,
          badge: '⚡ Shift Extension',
          badgeColor: '#f59e0b',
        });
      }
    }

    if (clashes.length > 0) {
      const firstClash = clashes[0];
      fallbackRecommendations.push({
        type: 'STAGGER_LEAVE',
        title: `Leave Stagger: Dr. ${firstClash.employeeName}`,
        doctorName: firstClash.employeeName,
        details: `Request Dr. ${firstClash.employeeName} to postpone leave by 2 days to prevent dual-doctor absence in Physiotherapy.`,
        badge: '📅 Stagger Leave',
        badgeColor: '#8b5cf6',
      });
    }

    return {
      clashingDoctors,
      affectedSkills,
      morningAbsent,
      eveningAbsent,
      clashDatesStr,
      candidateDoctors,
      fallbackRecommendations,
    };
  }, [leave, clashes, allEmployees, allLeaves]);

  // Request Groq AI suggestions
  const fetchGroqAiSuggestions = useCallback(async () => {
    if (!leave || !aiAnalysis) return;
    setGroqLoading(true);
    try {
      const result = await getGroqDoctorArrangement({
        clashDates: aiAnalysis.clashDatesStr,
        clashingDoctors: aiAnalysis.clashingDoctors.map((d) => ({
          name: d.name,
          employeeId: d.employeeId,
          department: d.department,
          shiftStart: d.shiftStart,
          shiftEnd: d.shiftEnd,
          skills: d.skills,
          leaveDates: aiAnalysis.clashDatesStr,
        })),
        availableDoctors: aiAnalysis.candidateDoctors.map((d) => ({
          name: d.name,
          employeeId: d.employeeId,
          department: d.department,
          shiftStart: d.shiftStart,
          shiftEnd: d.shiftEnd,
          skills: d.skills,
        })),
        affectedSkills: aiAnalysis.affectedSkills.map((s) => s.name),
      });

      if (result && result.actions && result.actions.length > 0) {
        setGroqResult(result);
      }
    } catch (err) {
      console.error('Groq fetch error:', err);
    } finally {
      setGroqLoading(false);
    }
  }, [leave, aiAnalysis]);

  // Auto-fetch Groq AI when modal opens
  useEffect(() => {
    if (isOpen && leave && !groqResult && !groqLoading) {
      fetchGroqAiSuggestions();
    }
  }, [isOpen, leave, groqResult, groqLoading, fetchGroqAiSuggestions]);

  if (!isOpen || !leave || !mounted) return null;

  const hasSameDept = clashes.some((c) => c.isSameDepartment);
  const totalEmployeesOnLeave = clashes.length + 1;

  const handleCopyInternalMemo = () => {
    if (!aiAnalysis) return;

    let actionText = '';
    if (groqResult?.actions && groqResult.actions.length > 0) {
      actionText = groqResult.actions
        .map((a, i) => `${i + 1}. [${a.icon} ${a.title}]\n   ${a.instruction}`)
        .join('\n\n');
    } else {
      actionText = aiAnalysis.fallbackRecommendations
        .map((r, i) => `${i + 1}. [${r.badge}] ${r.title}\n   ${r.details}`)
        .join('\n\n');
    }

    const memo = `[CLINIC INTERNAL COVERAGE MEMO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dates: ${aiAnalysis.clashDatesStr}
Department: Physiotherapy
Absent Doctors (${totalEmployeesOnLeave}):
• Dr. ${leave.employee.name} (${leave.employee.employeeId}) [${leave.fromDateStr} – ${leave.toDateStr}]
${clashes.map((c) => `• Dr. ${c.employeeName} (${c.employeeId}) [${c.fromDateStr} – ${c.toDateStr}]`).join('\n')}

Affected Specialties:
${aiAnalysis.affectedSkills.length > 0 ? aiAnalysis.affectedSkills.map((s) => `• ${s.name} (${s.count} doctor absent)`).join('\n') : '• General Physiotherapy Services'}

Groq AI Recommended Actions:
${actionText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Managed internally by clinic management.`;

    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  const currentEmpSkills = parseClinicalSkills(leave.employee.clinicalSkills);

  const modalContent = (
    <div className="clash-modal-overlay" onClick={onClose}>
      <div className="clash-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="clash-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="clash-modal-title">Doctor Leave Clash &amp; Coverage</h3>
                <span className="clash-count-pill">{totalEmployeesOnLeave} Doctors</span>
                <span className="clash-groq-pill">⚡ Groq AI</span>
              </div>
              <p className="clash-modal-subtitle">
                Overlapping absences on {leave.fromDateStr === leave.toDateStr ? leave.fromDateStr : `${leave.fromDateStr} – ${leave.toDateStr}`} · Physiotherapy Department
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div className="clash-header-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('ai-plan')}
                className={`clash-tab-pill ${activeTab === 'ai-plan' ? 'clash-tab-pill-active-ai' : ''}`}
              >
                <Sparkles size={12} />
                <span>AI Suggestions</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clash')}
                className={`clash-tab-pill ${activeTab === 'clash' ? 'clash-tab-pill-active' : ''}`}
              >
                <Calendar size={12} /> Absences ({totalEmployeesOnLeave})
              </button>
            </div>

            <button type="button" onClick={onClose} className="clash-close-btn" title="Close popup">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Content — No Scroll Viewport */}
        <div className="clash-body-scroll">
          {activeTab === 'ai-plan' ? (
            /* 2-COLUMN WIDE NO-SCROLL LAYOUT */
            <div className="clash-grid-2col">
              {/* LEFT COLUMN: DIAGNOSIS & AVAILABLE PHYSIOTHERAPISTS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {/* Conflict Diagnosis Card */}
                <div className="clash-card-dark">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <ShieldAlert size={14} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Conflict Diagnosis
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                    <div className="clash-stat-box">
                      <span className="clash-stat-label">Absence Window</span>
                      <strong className="clash-stat-val" style={{ color: '#f87171' }}>
                        {aiAnalysis?.clashDatesStr}
                      </strong>
                      <span className="clash-stat-sub">{totalEmployeesOnLeave} doctors simultaneously off</span>
                    </div>

                    <div className="clash-stat-box">
                      <span className="clash-stat-label">Shift Shortage</span>
                      <strong className="clash-stat-val" style={{ color: '#fbbf24' }}>
                        {aiAnalysis?.morningAbsent ? 'Morning (09:00 - 13:00)' : 'Evening Shortage'}
                      </strong>
                      <span className="clash-stat-sub">
                        {aiAnalysis?.morningAbsent ? 'Morning peak patient surge' : 'Closing hours gap'}
                      </span>
                    </div>
                  </div>

                  {/* Deficit Specialties */}
                  <div style={{ marginTop: '0.45rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                      Deficit Treatments:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {aiAnalysis && aiAnalysis.affectedSkills.length > 0 ? (
                        aiAnalysis.affectedSkills.map((sk) => (
                          <span key={sk.name} className="clash-danger-pill">
                            ⚠️ {sk.name} ({sk.count} off)
                          </span>
                        ))
                      ) : (
                        <span className="clash-danger-pill">
                          ⚠️ General Physiotherapy Services
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Available Active Physiotherapists */}
                <div className="clash-card-dark" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={13} style={{ color: '#10b981' }} />
                      Available Physiotherapists ({aiAnalysis?.candidateDoctors.length || 0})
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#10b981' }}>Physiotherapy staff only</span>
                  </div>

                  {aiAnalysis && aiAnalysis.candidateDoctors.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      {aiAnalysis.candidateDoctors.slice(0, 4).map((cand) => (
                        <div key={cand.id} className="clash-candidate-card">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '0.76rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                              {cand.name}
                            </strong>
                            {cand.matchScore > 0 ? (
                              <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                                {cand.matchScore} Match
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Avail</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#38bdf8', marginTop: '1px' }}>
                            Shift: {cand.shiftStart} - {cand.shiftEnd}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cand.skills.length > 0 ? cand.skills.slice(0, 2).join(', ') : (cand.designation || 'No skills assigned')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                      No other active physiotherapists available on these dates.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: GROQ AI LIVE SUGGESTIONS (FULL HEIGHT) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="clash-groq-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={14} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fef3c7' }}>
                        Groq AI Roster Solution (Ultra-Short)
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={groqLoading}
                      onClick={fetchGroqAiSuggestions}
                      className="clash-refresh-btn"
                      title="Re-run Groq AI"
                    >
                      {groqLoading ? (
                        <Loader2 size={12} className="spin-icon" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      <span>{groqLoading ? 'Thinking...' : 'Regenerate'}</span>
                    </button>
                  </div>

                  {groqLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '1.5rem 0.5rem', gap: '0.5rem' }}>
                      <Loader2 size={22} className="spin-icon" style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: 600 }}>
                        Groq AI is optimizing physiotherapist shifts...
                      </span>
                    </div>
                  ) : groqResult && groqResult.actions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                      <div className="clash-ai-summary-pill">
                        💡 <strong>Summary:</strong> {groqResult.shortSummary}
                      </div>

                      {groqResult.actions.slice(0, 2).map((act, idx) => (
                        <div key={idx} className="clash-groq-action-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.9rem' }}>{act.icon || '⚡'}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {act.title}
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0 1.35rem', fontSize: '0.75rem', color: '#e2e8f0', lineHeight: 1.35 }}>
                            {act.instruction}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                      {aiAnalysis?.fallbackRecommendations.map((rec, idx) => (
                        <div key={idx} className="clash-rec-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '8px', background: `${rec.badgeColor}22`, color: rec.badgeColor }}>
                              {rec.badge}
                            </span>
                            <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                              {rec.title}
                            </strong>
                          </div>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                            {rec.details}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* OVERLAPPING ABSENCES TAB */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {hasSameDept && (
                <div className="clash-dept-alert">
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>⚠️</span>
                  <div style={{ fontSize: '0.76rem', lineHeight: 1.3 }}>
                    <strong>Same Department Conflict:</strong> Multiple staff members from{' '}
                    <strong>{leave.employee.department || 'Physiotherapy'}</strong> are
                    requesting leave on overlapping dates.
                  </div>
                </div>
              )}

              {/* Current Application */}
              <div>
                <div className="clash-section-label">Current Application</div>
                <div className="clash-emp-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: getAvatarBg(leave.employee.name),
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(leave.employee.name)}
                    </div>
                    <div>
                      <div className="clash-emp-name">{leave.employee.name}</div>
                      <div className="clash-emp-meta">
                        <span>{leave.employee.employeeId}</span>
                        <span>•</span>
                        <span>{leave.employee.department || 'Physiotherapy'}</span>
                        {leave.employee.shiftStartTime && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#38bdf8' }}>
                              Shift: {leave.employee.shiftStartTime} - {leave.employee.shiftEndTime || '18:00'}
                            </span>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '3px' }}>
                        {currentEmpSkills.length > 0 ? (
                          currentEmpSkills.map((sk) => (
                            <span key={sk} className="clash-skill-pill">
                              ⚡ {sk}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                            No specific skills assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="clash-emp-date">
                      <Calendar size={11} style={{ flexShrink: 0 }} />
                      <span>
                        {leave.fromDateStr === leave.toDateStr
                          ? leave.fromDateStr
                          : `${leave.fromDateStr} – ${leave.toDateStr}`}
                      </span>
                    </div>
                    <div style={{ marginTop: '2px' }}>
                      <span className="clash-status-pill clash-status-approved">
                        {leave.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overlapping Staff on Leave */}
              <div>
                <div className="clash-section-label-red">
                  <span>Overlapping Staff on Leave ({clashes.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.5rem' }}>
                  {clashes.map((clash) => {
                    const clashSkills = parseClinicalSkills(clash.clinicalSkills);
                    return (
                      <div
                        key={clash.id}
                        className={clash.isSameDepartment ? 'clash-emp-card-same-dept' : 'clash-emp-card'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: getAvatarBg(clash.employeeName),
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(clash.employeeName)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="clash-emp-name">{clash.employeeName}</span>
                              {clash.isSameDepartment && (
                                <span className="clash-same-dept-pill">SAME DEPT</span>
                              )}
                            </div>
                            <div className="clash-emp-meta">
                              <span>{clash.employeeId}</span>
                              <span>•</span>
                              <span>{clash.department || 'Physiotherapy'}</span>
                              {clash.shiftStartTime && (
                                <>
                                  <span>•</span>
                                  <span style={{ color: '#38bdf8' }}>
                                    Shift: {clash.shiftStartTime} - {clash.shiftEndTime || '18:00'}
                                  </span>
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '3px' }}>
                              {clashSkills.length > 0 ? (
                                clashSkills.map((sk) => (
                                  <span key={sk} className="clash-skill-pill">
                                    ⚡ {sk}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                  No specific skills assigned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div className="clash-emp-date-clash">
                            <Calendar size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span>
                              {clash.fromDateStr === clash.toDateStr
                                ? clash.fromDateStr
                                : `${clash.fromDateStr} – ${clash.toDateStr}`}
                            </span>
                          </div>
                          <div style={{ marginTop: '2px' }}>
                            <span className="clash-status-pill clash-status-approved">
                              {clash.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Copy Memo on Left & Close on Right */}
        <div className="clash-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={handleCopyInternalMemo}
              className="clash-footer-memo-btn"
            >
              {copiedMemo ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
              <span>{copiedMemo ? 'Copied to Clipboard!' : 'Copy Internal Shift Memo'}</span>
            </button>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              (Copies Groq AI instructions for clinic team)
            </span>
          </div>

          <button type="button" onClick={onClose} className="clash-footer-close-btn">
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        /* Crisp dark backdrop with zero blur and zero GPU lag — Portaled directly to document.body */
        .clash-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 99999999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background-color: rgba(0, 0, 0, 0.78) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          padding: 1rem !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }

        /* Wide executive dialog box centered in viewport without scroll */
        .clash-modal-dialog {
          width: 100%;
          max-width: 880px;
          max-height: calc(100vh - 2.5rem);
          background-color: #0f172a;
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 12px;
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.75);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
          margin: auto;
        }
        :global([data-theme='light']) .clash-modal-dialog {
          background-color: #ffffff !important;
          border: 1px solid rgba(239, 68, 68, 0.3) !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.12) !important;
        }

        .clash-modal-header {
          padding: 0.65rem 1rem;
          background: rgba(239, 68, 68, 0.08);
          border-bottom: 1px solid rgba(239, 68, 68, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        :global([data-theme='light']) .clash-modal-header {
          background: #fff5f5 !important;
          border-bottom: 1px solid #fee2e2 !important;
        }

        .clash-modal-title {
          margin: 0;
          font-size: 0.94rem;
          font-weight: 800;
          color: #ffffff;
        }
        :global([data-theme='light']) .clash-modal-title {
          color: #0f172a !important;
        }

        .clash-modal-subtitle {
          margin: 1px 0 0 0;
          font-size: 0.7rem;
          color: #94a3b8;
        }
        :global([data-theme='light']) .clash-modal-subtitle {
          color: #64748b !important;
        }

        .clash-count-pill {
          font-size: 0.66rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .clash-groq-pill {
          font-size: 0.62rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.35);
        }

        .clash-header-tabs {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(0, 0, 0, 0.35);
          padding: 2px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        :global([data-theme='light']) .clash-header-tabs {
          background: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
        }

        .clash-tab-pill {
          background: none;
          border: none;
          padding: 0.28rem 0.6rem;
          font-size: 0.7rem;
          font-weight: 600;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.12s ease;
        }
        :global([data-theme='light']) .clash-tab-pill {
          color: #64748b !important;
        }

        .clash-tab-pill-active-ai {
          background: rgba(245, 158, 11, 0.25) !important;
          color: #fde68a !important;
        }
        :global([data-theme='light']) .clash-tab-pill-active-ai {
          background: #fef3c7 !important;
          color: #b45309 !important;
        }

        .clash-tab-pill-active {
          background: rgba(239, 68, 68, 0.25) !important;
          color: #fca5a5 !important;
        }

        .clash-close-btn {
          background: rgba(255, 255, 255, 0.06);
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 5px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .clash-close-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
        }

        /* Compact body container */
        .clash-body-scroll {
          padding: 0.65rem 0.95rem;
          overflow-y: auto;
          flex: 1;
        }

        .clash-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 0.7rem;
          height: 100%;
        }
        @media (max-width: 768px) {
          .clash-grid-2col {
            grid-template-columns: 1fr;
          }
        }

        .clash-card-dark {
          padding: 0.65rem 0.8rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        :global([data-theme='light']) .clash-card-dark {
          background: #f8fafc !important;
          border-color: #e2e8f0 !important;
        }

        .clash-groq-card {
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%);
          border: 1.5px solid rgba(245, 158, 11, 0.35);
        }
        :global([data-theme='light']) .clash-groq-card {
          background: #fffbeb !important;
          border-color: #fde68a !important;
        }

        .clash-refresh-btn {
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #f59e0b;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.22rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .clash-ai-summary-pill {
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.25);
          font-size: 0.72rem;
          color: #fef3c7;
          line-height: 1.35;
        }
        :global([data-theme='light']) .clash-ai-summary-pill {
          background: #fef3c7 !important;
          color: #92400e !important;
        }

        .clash-groq-action-item {
          padding: 0.5rem 0.65rem;
          border-radius: 7px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        :global([data-theme='light']) .clash-groq-action-item {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
        }

        .clash-stat-box {
          padding: 0.45rem 0.6rem;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          flex-direction: column;
        }
        :global([data-theme='light']) .clash-stat-box {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
        }

        .clash-stat-label {
          font-size: 0.62rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .clash-stat-val {
          font-size: 0.82rem;
          margin-top: 1px;
        }

        .clash-stat-sub {
          font-size: 0.64rem;
          color: var(--text-secondary);
          margin-top: 1px;
        }

        .clash-danger-pill {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.14);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.35);
        }

        .clash-skill-pill {
          font-size: 0.62rem;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 8px;
          background: rgba(6, 182, 212, 0.12);
          color: #22d3ee;
          border: 1px solid rgba(6, 182, 212, 0.25);
        }

        .clash-candidate-card {
          padding: 0.4rem 0.55rem;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        :global([data-theme='light']) .clash-candidate-card {
          background: #ffffff !important;
          border-color: #f1f5f9 !important;
        }

        .clash-emp-card {
          padding: 0.55rem 0.8rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
        }
        :global([data-theme='light']) .clash-emp-card {
          background: #f8fafc !important;
          border-color: #e2e8f0 !important;
        }

        .clash-emp-card-same-dept {
          padding: 0.55rem 0.8rem;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
        }
        :global([data-theme='light']) .clash-emp-card-same-dept {
          background: #fff1f2 !important;
          border-color: #fecdd3 !important;
        }

        .clash-emp-name {
          font-weight: 700;
          font-size: 0.82rem;
          color: #ffffff;
        }
        :global([data-theme='light']) .clash-emp-name {
          color: #0f172a !important;
        }

        .clash-emp-meta {
          font-size: 0.68rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 1px;
        }

        .clash-emp-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .clash-emp-date-clash {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: #f87171;
          font-weight: 700;
        }

        .clash-same-dept-pill {
          font-size: 0.56rem;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
        }

        .clash-status-pill {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 8px;
        }
        .clash-status-approved {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }

        .clash-dept-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 8px;
          color: #fbbf24;
        }

        .clash-section-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 0.3rem;
        }

        .clash-section-label-red {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #f87171;
          margin-bottom: 0.3rem;
        }

        .clash-modal-footer {
          padding: 0.55rem 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        :global([data-theme='light']) .clash-modal-footer {
          background: #f8fafc !important;
          border-top-color: #e2e8f0 !important;
        }

        .clash-footer-memo-btn {
          padding: 0.32rem 0.75rem;
          border-radius: 6px;
          font-size: 0.74rem;
          font-weight: 600;
          background: rgba(59, 130, 246, 0.18);
          border: 1px solid rgba(59, 130, 246, 0.35);
          color: #60a5fa;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.12s ease;
        }
        .clash-footer-memo-btn:hover {
          background: rgba(59, 130, 246, 0.28);
        }

        .clash-footer-close-btn {
          padding: 0.32rem 0.95rem;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          cursor: pointer;
        }
        .clash-footer-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
