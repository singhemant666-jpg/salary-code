'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  X,
  Calendar,
  Sparkles,
  Clock,
  Stethoscope,
  UserCheck,
  ArrowRight,
  Copy,
  Check,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type { LeaveItem } from './LeavesClient';
import { parseClinicalSkills } from '@/lib/clinical-skills';

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

export default function ClashDetailsModal({
  isOpen,
  onClose,
  leave,
  clashes,
  allEmployees = [],
  allLeaves = [],
}: ClashDetailsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'clash' | 'ai-plan'>('clash');
  const [copiedMemo, setCopiedMemo] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    // 1. Gather all clashing doctors (current applicant + overlapping staff)
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

    // Also exclude anyone else who has leave overlapping this range
    const busyEmployeeIds = new Set<string>();
    allLeaves.forEach((l) => {
      if (l.status === 'APPROVED' || l.status === 'PENDING') {
        if (l.fromDateRaw <= leave.toDateRaw && l.toDateRaw >= leave.fromDateRaw) {
          busyEmployeeIds.add(l.employee.employeeId);
        }
      }
    });

    const candidateDoctors = allEmployees
      .filter((emp) => !clashingIds.has(emp.employeeId) && !busyEmployeeIds.has(emp.employeeId))
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

    // 6. Actionable internal recommendations
    const recommendations: Array<{
      type: 'EXTEND_SHIFT' | 'CROSS_COVERAGE' | 'STAGGER_LEAVE';
      title: string;
      doctorName?: string;
      details: string;
      badge: string;
      badgeColor: string;
    }> = [];

    // Recommendation A: Request timing extension / early reporting if morning shortage
    if (morningAbsent) {
      const lateShiftCandidate = candidateDoctors.find((d) => d.isLateShift && d.matchScore > 0);
      if (lateShiftCandidate) {
        recommendations.push({
          type: 'EXTEND_SHIFT',
          title: `Request Dr. ${lateShiftCandidate.name} to Extend Shift (Start 09:00 AM)`,
          doctorName: lateShiftCandidate.name,
          details: `Dr. ${lateShiftCandidate.name} covers ${lateShiftCandidate.matchingSkills.join(', ')} but is scheduled for ${lateShiftCandidate.shiftStart} – ${lateShiftCandidate.shiftEnd}. Internally request them to report early at 09:00 AM to prevent morning clinic shortage.`,
          badge: '⚡ Timing Extension',
          badgeColor: '#f59e0b',
        });
      }
    }

    // Recommendation B: Primary doctor stand-in
    const bestMatchingDoctor = candidateDoctors.find(
      (d) => d.matchScore > 0 && (!recommendations[0] || d.employeeId !== candidateDoctors.find((c) => c.isLateShift)?.employeeId)
    );
    if (bestMatchingDoctor) {
      recommendations.push({
        type: 'CROSS_COVERAGE',
        title: `Assign Dr. ${bestMatchingDoctor.name} for Priority Coverage`,
        doctorName: bestMatchingDoctor.name,
        details: `Available during ${bestMatchingDoctor.shiftStart} – ${bestMatchingDoctor.shiftEnd}. Capable of handling ${bestMatchingDoctor.matchingSkills.join(', ')}. Direct morning/afternoon patient appointments to this doctor.`,
        badge: '🩺 Stand-in Coverage',
        badgeColor: '#10b981',
      });
    }

    // Recommendation C: Leave staggering negotiation
    if (clashes.length > 0) {
      const firstClash = clashes[0];
      recommendations.push({
        type: 'STAGGER_LEAVE',
        title: `Request Leave Staggering with Dr. ${firstClash.employeeName}`,
        doctorName: firstClash.employeeName,
        details: `Discuss internally with Dr. ${firstClash.employeeName} to postpone leave by 2 days (avoiding concurrent absence with Dr. ${leave.employee.name}) so the clinic remains fully operational.`,
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
      recommendations,
    };
  }, [leave, clashes, allEmployees, allLeaves]);

  if (!isOpen || !leave) return null;

  const hasSameDept = clashes.some((c) => c.isSameDepartment);
  const totalEmployeesOnLeave = clashes.length + 1;

  const handleCopyInternalMemo = () => {
    if (!aiAnalysis) return;
    const memo = `[CLINIC INTERNAL COVERAGE MEMO]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dates: ${aiAnalysis.clashDatesStr}
Department: ${leave.employee.department || 'Physiotherapy / Clinical'}
Absent Staff (${totalEmployeesOnLeave}):
• Dr. ${leave.employee.name} (${leave.employee.employeeId}) [${leave.fromDateStr} – ${leave.toDateStr}]
${clashes.map((c) => `• Dr. ${c.employeeName} (${c.employeeId}) [${c.fromDateStr} – ${c.toDateStr}]`).join('\n')}

Affected Specialties / Modalities:
${aiAnalysis.affectedSkills.length > 0 ? aiAnalysis.affectedSkills.map((s) => `• ${s.name} (${s.count} doctor absent)`).join('\n') : '• General Physiotherapy Services'}

AI Recommended Internal Arrangements:
${aiAnalysis.recommendations.map((r, i) => `${i + 1}. [${r.badge}] ${r.title}\n   ${r.details}`).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: Managed internally by clinic administration.`;

    navigator.clipboard.writeText(memo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  const currentEmpSkills = parseClinicalSkills(leave.employee.clinicalSkills);

  return (
    <div className="clash-modal-overlay" onClick={onClose}>
      <div className="clash-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="clash-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="clash-modal-title">Doctor Leave Clash &amp; Coverage</h3>
                <span className="clash-count-pill">{totalEmployeesOnLeave} Doctors</span>
              </div>
              <p className="clash-modal-subtitle">
                Overlapping absences detected · AI-powered internal roster arrangement
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="clash-close-btn" title="Close popup">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="clash-tab-nav">
          <button
            type="button"
            onClick={() => setActiveTab('clash')}
            className={`clash-tab-btn ${activeTab === 'clash' ? 'clash-tab-btn-active' : ''}`}
          >
            <Calendar size={14} /> Overlapping Absences ({totalEmployeesOnLeave})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai-plan')}
            className={`clash-tab-btn ${activeTab === 'ai-plan' ? 'clash-tab-btn-active-ai' : ''}`}
          >
            <Sparkles size={14} style={{ color: '#a78bfa' }} />
            <span>AI Doctor Arrangement &amp; Shift Plan</span>
            <span className="clash-ai-badge">SMART</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="clash-body-scroll">
          {activeTab === 'clash' ? (
            <>
              {/* Same department warning banner */}
              {hasSameDept && (
                <div className="clash-dept-alert">
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
                  <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                    <strong>Same Department Conflict:</strong> Multiple staff members from{' '}
                    <strong>{leave.employee.department || 'the same department'}</strong> are
                    scheduled on leave on the same date(s). Please review department coverage!
                  </div>
                </div>
              )}

              {/* Current Employee Application */}
              <div>
                <div className="clash-section-label">Current Application</div>
                <div className="clash-emp-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: getAvatarBg(leave.employee.name),
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
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

                      {/* Clinical Skills Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {currentEmpSkills.length > 0 ? (
                          currentEmpSkills.map((sk) => (
                            <span key={sk} className="clash-skill-pill">
                              ⚡ {sk}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            No specific clinical skills assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="clash-emp-date">
                      <Calendar size={13} style={{ flexShrink: 0 }} />
                      <span>
                        {leave.fromDateStr === leave.toDateStr
                          ? leave.fromDateStr
                          : `${leave.fromDateStr} – ${leave.toDateStr}`}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span
                        className={
                          leave.status === 'APPROVED'
                            ? 'clash-status-pill clash-status-approved'
                            : 'clash-status-pill clash-status-pending'
                        }
                      >
                        {leave.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overlapping Employees */}
              <div style={{ marginTop: '1rem' }}>
                <div className="clash-section-label-red">
                  <span>Overlapping Staff on Leave ({clashes.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {clashes.map((clash) => {
                    const clashSkills = parseClinicalSkills(clash.clinicalSkills);
                    return (
                      <div
                        key={clash.id}
                        className={clash.isSameDepartment ? 'clash-emp-card-same-dept' : 'clash-emp-card'}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: getAvatarBg(clash.employeeName),
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(clash.employeeName)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                            {/* Skills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                              {clashSkills.length > 0 ? (
                                clashSkills.map((sk) => (
                                  <span key={sk} className="clash-skill-pill">
                                    ⚡ {sk}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  No clinical skills assigned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div className="clash-emp-date-clash">
                            <Calendar size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span>
                              {clash.fromDateStr === clash.toDateStr
                                ? clash.fromDateStr
                                : `${clash.fromDateStr} – ${clash.toDateStr}`}
                            </span>
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            <span
                              className={
                                clash.status === 'APPROVED'
                                  ? 'clash-status-pill clash-status-approved'
                                  : 'clash-status-pill clash-status-pending'
                              }
                            >
                              {clash.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick AI Trigger Banner */}
              <div
                onClick={() => setActiveTab('ai-plan')}
                role="button"
                tabIndex={0}
                style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.12) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Sparkles size={18} style={{ color: '#a78bfa' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#c4b5fd' }}>
                      Solve Clinic Shortage with AI Doctor Arrangement
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      View shortage diagnosis, shift extension suggestions &amp; internal coverage plan
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: '#a78bfa' }} />
              </div>
            </>
          ) : (
            <>
              {/* AI Plan View */}
              {aiAnalysis && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Internal Shortage Diagnosis Card */}
                  <div className="clash-ai-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.65rem' }}>
                      <ShieldAlert size={18} style={{ color: '#ef4444' }} />
                      <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        Clinic Service &amp; Shift Impact Analysis
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                      <div className="clash-stat-box">
                        <span className="clash-stat-label">Absence Window</span>
                        <strong className="clash-stat-val" style={{ color: '#f87171' }}>
                          {aiAnalysis.clashDatesStr}
                        </strong>
                        <span className="clash-stat-sub">{totalEmployeesOnLeave} doctors simultaneously off</span>
                      </div>

                      <div className="clash-stat-box">
                        <span className="clash-stat-label">Shift Shortage</span>
                        <strong className="clash-stat-val" style={{ color: '#fbbf24' }}>
                          {aiAnalysis.morningAbsent ? 'Morning (09:00 - 13:00)' : 'Evening Shortage'}
                        </strong>
                        <span className="clash-stat-sub">
                          {aiAnalysis.morningAbsent ? 'Peak morning appointments exposed' : 'Closing hours deficit'}
                        </span>
                      </div>
                    </div>

                    {/* Affected Specialties */}
                    <div style={{ marginTop: '0.85rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        Deficit Treatments / Specialties:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {aiAnalysis.affectedSkills.length > 0 ? (
                          aiAnalysis.affectedSkills.map((sk) => (
                            <span key={sk.name} className="clash-danger-pill">
                              ⚠️ {sk.name} ({sk.count} doctor absent)
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            General physiotherapy service shortage
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendations Section */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} style={{ color: '#a78bfa' }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Smart AI Internal Arrangement Options
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🔒 Managed Internally
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {aiAnalysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="clash-rec-card">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: `${rec.badgeColor}22`,
                                color: rec.badgeColor,
                                border: `1px solid ${rec.badgeColor}55`,
                              }}
                            >
                              {rec.badge}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Option {idx + 1}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                            {rec.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                            {rec.details}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Available Doctors for Stand-in */}
                  {aiAnalysis.candidateDoctors.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <UserCheck size={14} style={{ color: '#10b981' }} />
                        Available Clinic Doctors on {aiAnalysis.clashDatesStr} ({aiAnalysis.candidateDoctors.length})
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                        {aiAnalysis.candidateDoctors.slice(0, 4).map((cand) => (
                          <div key={cand.id} className="clash-candidate-card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                {cand.name}
                              </strong>
                              {cand.matchScore > 0 && (
                                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                                  {cand.matchScore} Match
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '2px' }}>
                              Shift: {cand.shiftStart} - {cand.shiftEnd}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {cand.skills.length > 0 ? cand.skills.slice(0, 2).join(', ') : 'General Physio'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copy Internal Memo Box */}
                  <div style={{ marginTop: '0.5rem', padding: '0.85rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Info size={13} style={{ color: '#38bdf8' }} /> Internal Shift Memo (For Clinic Admin / Team)
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyInternalMemo}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {copiedMemo ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                        {copiedMemo ? 'Copied to Clipboard!' : 'Copy Internal Memo'}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Copies a ready-to-use internal clinic memo to share with the front desk, duty coordinator, or internal management.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="clash-modal-footer">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {activeTab === 'clash' ? (
              <span>Reviewing {totalEmployeesOnLeave} staff leaves</span>
            ) : (
              <span>AI recommendations computed based on real-time doctor roster</span>
            )}
          </div>
          <button type="button" onClick={onClose} className="clash-footer-close-btn">
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .clash-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.65);
          padding: 1rem;
          animation: clashFadeIn 0.15s ease-out;
        }
        :global([data-theme='light']) .clash-modal-overlay {
          background-color: rgba(15, 23, 42, 0.45) !important;
        }

        .clash-modal-dialog {
          width: 100%;
          max-width: 620px;
          max-height: 88vh;
          background-color: #0f172a;
          border: 1.5px solid rgba(239, 68, 68, 0.45);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: clashScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        :global([data-theme='light']) .clash-modal-dialog {
          background-color: #ffffff !important;
          border: 1.5px solid rgba(239, 68, 68, 0.3) !important;
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 0 25px rgba(239, 68, 68, 0.08) !important;
        }

        .clash-modal-header {
          padding: 1rem 1.25rem;
          background: linear-gradient(180deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.03) 100%);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        :global([data-theme='light']) .clash-modal-header {
          background: linear-gradient(180deg, #fff1f2 0%, #ffffff 100%) !important;
          border-bottom: 1px solid #fee2e2 !important;
        }

        .clash-modal-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #ffffff;
        }
        :global([data-theme='light']) .clash-modal-title {
          color: #0f172a !important;
        }

        .clash-modal-subtitle {
          margin: 2px 0 0 0;
          font-size: 0.76rem;
          color: #94a3b8;
        }
        :global([data-theme='light']) .clash-modal-subtitle {
          color: #64748b !important;
        }

        .clash-count-pill {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        :global([data-theme='light']) .clash-count-pill {
          background: #fee2e2 !important;
          color: #b91c1c !important;
          border: 1px solid #fca5a5 !important;
        }

        .clash-close-btn {
          background: rgba(255, 255, 255, 0.06);
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .clash-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        :global([data-theme='light']) .clash-close-btn {
          background: #f1f5f9 !important;
          color: #475569 !important;
        }

        .clash-tab-nav {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
          padding: 0 1rem;
        }
        :global([data-theme='light']) .clash-tab-nav {
          background: #f8fafc !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }

        .clash-tab-btn {
          background: none;
          border: none;
          padding: 0.75rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
        }
        .clash-tab-btn:hover {
          color: #ffffff;
        }
        :global([data-theme='light']) .clash-tab-btn {
          color: #64748b !important;
        }
        :global([data-theme='light']) .clash-tab-btn:hover {
          color: #0f172a !important;
        }

        .clash-tab-btn-active {
          color: #ef4444 !important;
          border-bottom-color: #ef4444 !important;
        }

        .clash-tab-btn-active-ai {
          color: #c4b5fd !important;
          border-bottom-color: #8b5cf6 !important;
        }
        :global([data-theme='light']) .clash-tab-btn-active-ai {
          color: #7c3aed !important;
          border-bottom-color: #7c3aed !important;
        }

        .clash-ai-badge {
          font-size: 0.62rem;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 8px;
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          color: #ffffff;
          letter-spacing: 0.5px;
        }

        .clash-body-scroll {
          padding: 1.15rem 1.25rem;
          overflow-y: auto;
          flex: 1;
        }

        .clash-dept-alert {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.75rem 0.9rem;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 10px;
          color: #fbbf24;
          margin-bottom: 1rem;
        }
        :global([data-theme='light']) .clash-dept-alert {
          background: #fef3c7 !important;
          border-color: #fcd34d !important;
          color: #92400e !important;
        }

        .clash-section-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #94a3b8;
          margin-bottom: 0.45rem;
        }

        .clash-section-label-red {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #f87171;
          margin-bottom: 0.45rem;
        }

        .clash-emp-card {
          padding: 0.75rem 0.95rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }
        :global([data-theme='light']) .clash-emp-card {
          background: #f8fafc !important;
          border-color: #e2e8f0 !important;
        }

        .clash-emp-card-same-dept {
          padding: 0.75rem 0.95rem;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }
        :global([data-theme='light']) .clash-emp-card-same-dept {
          background: #fff1f2 !important;
          border-color: #fecdd3 !important;
        }

        .clash-emp-name {
          font-weight: 700;
          font-size: 0.88rem;
          color: #ffffff;
        }
        :global([data-theme='light']) .clash-emp-name {
          color: #0f172a !important;
        }

        .clash-emp-meta {
          font-size: 0.75rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
          flex-wrap: wrap;
        }
        :global([data-theme='light']) .clash-emp-meta {
          color: #64748b !important;
        }

        .clash-emp-date {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          color: #94a3b8;
          font-weight: 600;
        }
        :global([data-theme='light']) .clash-emp-date {
          color: #475569 !important;
        }

        .clash-emp-date-clash {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          color: #f87171;
          font-weight: 700;
        }
        :global([data-theme='light']) .clash-emp-date-clash {
          color: #dc2626 !important;
        }

        .clash-same-dept-pill {
          font-size: 0.62rem;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          letter-spacing: 0.4px;
        }
        :global([data-theme='light']) .clash-same-dept-pill {
          background: #fee2e2 !important;
          color: #b91c1c !important;
        }

        .clash-status-pill {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
          display: inline-block;
        }
        .clash-status-approved {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        :global([data-theme='light']) .clash-status-approved {
          background: #d1fae5 !important;
          color: #065f46 !important;
        }
        .clash-status-pending {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .clash-skill-pill {
          font-size: 0.67rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 12px;
          background: rgba(6, 182, 212, 0.12);
          color: #22d3ee;
          border: 1px solid rgba(6, 182, 212, 0.3);
        }

        .clash-danger-pill {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.14);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.35);
        }

        .clash-ai-card {
          padding: 0.85rem 1rem;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        :global([data-theme='light']) .clash-ai-card {
          background: #fff5f5 !important;
          border-color: #fed7d7 !important;
        }

        .clash-stat-box {
          padding: 0.65rem 0.8rem;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
        }
        :global([data-theme='light']) .clash-stat-box {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
        }

        .clash-stat-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .clash-stat-val {
          font-size: 0.95rem;
          margin-top: 2px;
        }

        .clash-stat-sub {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .clash-rec-card {
          padding: 0.8rem 0.95rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.15s ease;
        }
        .clash-rec-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        :global([data-theme='light']) .clash-rec-card {
          background: #f8fafc !important;
          border-color: #e2e8f0 !important;
        }

        .clash-candidate-card {
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        :global([data-theme='light']) .clash-candidate-card {
          background: #ffffff !important;
          border-color: #f1f5f9 !important;
        }

        .clash-modal-footer {
          padding: 0.85rem 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        :global([data-theme='light']) .clash-modal-footer {
          background: #f8fafc !important;
          border-top-color: #e2e8f0 !important;
        }

        .clash-footer-close-btn {
          padding: 0.45rem 1.15rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .clash-footer-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        :global([data-theme='light']) .clash-footer-close-btn {
          background: #e2e8f0 !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }

        @keyframes clashFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes clashScaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
