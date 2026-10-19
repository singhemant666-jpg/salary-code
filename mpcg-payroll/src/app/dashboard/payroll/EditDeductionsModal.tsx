'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { updatePayrollDeductions } from '@/actions/payroll';
import type { PaidLeaveBalanceInfo } from '@/actions/payroll';
import { Edit2, X, Check, Gift, AlertCircle } from 'lucide-react';
import { formatINR, decimalHoursToHHMMString, decimalHoursToReadableString, excelRound } from '@/lib/currency-utils';

interface EditDeductionsModalProps {
  payroll: {
    id: string;
    employeeName: string;
    employeeId: string;
    grossSalary: number;
    lopDeduction: number;
    lopDays: number;
    shortHoursDeduction?: number;
    shortWorkingHours?: number;
    waiveShortHoursDeduction?: boolean;
    advanceDeduction: number;
    otherDeduction: number;
    otherDeductionNote: string | null;
    pfDeduction: number;
    tdsDeduction?: number;
    ptDeduction?: number;
    totalDeduction: number;
    netSalary: number;
    basicSalary?: number;
    paidLeaveAdjustment?: number;
    holdSalaryDeduction?: number;
    holdSalaryReleaseAmount?: number;
    holdSalaryReleaseReason?: string | null;
    latePenaltyDeduction?: number;
    latePenaltyDays?: number;
    lateCount?: number;
    waiveLatePenaltyDeduction?: boolean;
    suddenLeavePenaltyDeduction?: number;
    suddenLeavePenaltyDays?: number;
    waiveSuddenLeaveDeduction?: boolean;
    waiveLopDeduction?: boolean;
    waivePtDeduction?: boolean;
    missingPunchDays?: number;
    waiveMissingPunchDeduction?: boolean;
  };
  leaveBalance: PaidLeaveBalanceInfo;
}

export default function EditDeductionsModal({ payroll, leaveBalance }: EditDeductionsModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [otherDeduction, setOtherDeduction] = useState<string>(String(payroll.otherDeduction || 0));
  const [otherDeductionNote, setOtherDeductionNote] = useState<string>(payroll.otherDeductionNote || '');
  const [advanceDeduction, setAdvanceDeduction] = useState<string>(String(payroll.advanceDeduction || 0));
  const [pfDeduction, setPfDeduction] = useState<string>(String(payroll.pfDeduction || 0));
  const [tdsDeduction, setTdsDeduction] = useState<string>(String(payroll.tdsDeduction || 0));
  const [paidLeaveAdj, setPaidLeaveAdj] = useState<string>(String(payroll.paidLeaveAdjustment || 0));
  const [holdSalaryDeduction, setHoldSalaryDeduction] = useState<string>(String(payroll.holdSalaryDeduction || 0));
  const [holdSalaryReleaseAmount, setHoldSalaryReleaseAmount] = useState<string>(String(payroll.holdSalaryReleaseAmount || 0));
  const [holdSalaryReleaseReason, setHoldSalaryReleaseReason] = useState<string>(payroll.holdSalaryReleaseReason || '');
  const [encashRemaining, setEncashRemaining] = useState<boolean>(false);
  const [waiveShortHours, setWaiveShortHours] = useState<boolean>(Boolean(payroll.waiveShortHoursDeduction));
  const [shortHoursVal, setShortHoursVal] = useState<string>(String(payroll.shortHoursDeduction || 0));
  const [waiveLatePenalty, setWaiveLatePenalty] = useState<boolean>(Boolean(payroll.waiveLatePenaltyDeduction));
  const [waiveSuddenLeave, setWaiveSuddenLeave] = useState<boolean>(Boolean(payroll.waiveSuddenLeaveDeduction));
  const [waiveLop, setWaiveLop] = useState<boolean>(Boolean(payroll.waiveLopDeduction));
  const [waivePt, setWaivePt] = useState<boolean>(Boolean(payroll.waivePtDeduction));
  const [waiveMissingPunch, setWaiveMissingPunch] = useState<boolean>(Boolean(payroll.waiveMissingPunchDeduction));

  useEffect(() => {
    setOtherDeduction(String(payroll.otherDeduction || 0));
    setOtherDeductionNote(payroll.otherDeductionNote || '');
    setAdvanceDeduction(String(payroll.advanceDeduction || 0));
    setPfDeduction(String(payroll.pfDeduction || 0));
    setTdsDeduction(String(payroll.tdsDeduction || 0));
    setPaidLeaveAdj(String(payroll.paidLeaveAdjustment || 0));
    setHoldSalaryDeduction(String(payroll.holdSalaryDeduction || 0));
    setHoldSalaryReleaseAmount(String(payroll.holdSalaryReleaseAmount || 0));
    setHoldSalaryReleaseReason(payroll.holdSalaryReleaseReason || '');
    setWaiveShortHours(Boolean(payroll.waiveShortHoursDeduction));
    setShortHoursVal(String(payroll.shortHoursDeduction || 0));
    setWaiveLatePenalty(Boolean(payroll.waiveLatePenaltyDeduction));
    setWaiveSuddenLeave(Boolean(payroll.waiveSuddenLeaveDeduction));
    setWaiveLop(Boolean(payroll.waiveLopDeduction));
    setWaivePt(Boolean(payroll.waivePtDeduction));
    setWaiveMissingPunch(Boolean(payroll.waiveMissingPunchDeduction));
  }, [payroll]);

  const gross = Number(payroll.grossSalary || 0);
  const lopDays = Number(payroll.lopDays || 0);

  // Unadjusted LOP days before any paid leave was applied
  const alreadyAppliedAdj = Number(payroll.paidLeaveAdjustment || 0);
  const unadjustedLopDays = Number(payroll.lopDays || 0) + alreadyAppliedAdj;
  const availableAnnual = Number(leaveBalance.remainingAnnual || 0);
  const maxLopCanOffset = Math.round(unadjustedLopDays * 10) / 10;
  const effectiveMax = Math.min(availableAnnual, maxLopCanOffset > 0 ? maxLopCanOffset : availableAnnual);
  const adjDays = Math.min(Math.max(0, parseFloat(paidLeaveAdj) || 0), effectiveMax);

  // Per-day LOP value based on Basic Salary / 30 (e.g. ₹45,000 / 30 = ₹1,500/day)
  const basicSalaryVal = Number(payroll.basicSalary || payroll.grossSalary || 0);
  const lopPerDay = basicSalaryVal > 0 ? (basicSalaryVal / 30) : 0;
  const baseTotalLopDeduction = Number(payroll.lopDeduction || 0) + (alreadyAppliedAdj * lopPerDay);
  const adjustedLopDeduction = Math.max(0, baseTotalLopDeduction - (adjDays * lopPerDay));
  const savedAmount = Math.min(adjDays * lopPerDay, baseTotalLopDeduction);

  const isProfileMissingPunchDisabled = (payroll as any)?.employee?.missingPunchPenalty === false;
  const currentLateDeduction = Number(payroll.latePenaltyDeduction || 0);
  const currentSuddenDeduction = Number(payroll.suddenLeavePenaltyDeduction || 0);
  const missingPunchDays = Number(payroll.missingPunchDays || 0);
  const missingPunchDeductionDays = Math.round(missingPunchDays * 0.5 * 10) / 10;
  const currentMissingPunchDeduction = isProfileMissingPunchDisabled
    ? 0
    : Math.round(missingPunchDeductionDays * (basicSalaryVal > 0 ? basicSalaryVal / 30 : lopPerDay) * 100) / 100;

  // Adjust preview LOP deduction if user toggles waive flags
  let previewLop = waiveLop ? 0 : adjustedLopDeduction;
  if (!waiveLop) {
    if (!payroll.waiveLatePenaltyDeduction && waiveLatePenalty) {
      previewLop = Math.max(0, previewLop - currentLateDeduction);
    }
    if (!payroll.waiveSuddenLeaveDeduction && waiveSuddenLeave) {
      previewLop = Math.max(0, previewLop - currentSuddenDeduction);
    }
    if (!isProfileMissingPunchDisabled && !payroll.waiveMissingPunchDeduction && waiveMissingPunch) {
      previewLop = Math.max(0, previewLop - currentMissingPunchDeduction);
    }
  }

  const otherVal = parseFloat(otherDeduction) || 0;
  const advanceVal = parseFloat(advanceDeduction) || 0;
  const pfVal = parseFloat(pfDeduction) || 0;
  const tdsVal = parseFloat(tdsDeduction) || 0;
  const holdVal = parseFloat(holdSalaryDeduction) || 0;
  const releaseVal = parseFloat(holdSalaryReleaseAmount) || 0;
  const ptVal = waivePt ? 0 : Number(payroll.ptDeduction || 0);
  const parsedShortHours = waiveShortHours ? 0 : Math.max(0, parseFloat(shortHoursVal) || 0);
  const isShortCustom = !waiveShortHours && (parsedShortHours !== Number(payroll.shortHoursDeduction || 0));

  const computedGross = gross + releaseVal;
  const deductionsBeforeTds = previewLop + parsedShortHours + otherVal + advanceVal + pfVal + holdVal + ptVal;
  const netBeforeTds = Math.max(0, computedGross - deductionsBeforeTds);
  const tenPercentTds = Math.round(netBeforeTds * 0.10);

  // In payroll registers/table, deduction includes TDS and net salary is after TDS.
  // (In salary slips, Net Salary is displayed without TDS deduction, with TDS shown separately below)
  const computedTotalDeduction = deductionsBeforeTds + tdsVal;
  const computedNetSalary = Math.max(0, excelRound(computedGross - computedTotalDeduction, 0));
  const slipNetSalary = Math.max(0, excelRound(computedGross - deductionsBeforeTds, 0));

  const canAdjust = (unadjustedLopDays > 0 || lopDays > 0) && leaveBalance.maxForThisMonth > 0;
  const periodBlocked = false;
  const annualExhausted = leaveBalance.annualTotal > 0 && leaveBalance.remainingAnnual <= 0 && (payroll.paidLeaveAdjustment || 0) === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await updatePayrollDeductions(payroll.id, {
      otherDeduction: otherVal,
      otherDeductionNote,
      advanceDeduction: advanceVal,
      pfDeduction: pfVal,
      tdsDeduction: tdsVal,
      paidLeaveAdjustment: adjDays,
      holdSalaryDeduction: holdVal,
      holdSalaryReleaseAmount: releaseVal,
      holdSalaryReleaseReason: holdSalaryReleaseReason || undefined,
      encashRemainingLeaves: encashRemaining,
      waiveShortHoursDeduction: waiveShortHours,
      shortHoursDeduction: parsedShortHours,
      isShortHoursCustomized: isShortCustom,
      waiveLatePenaltyDeduction: waiveLatePenalty,
      waiveSuddenLeaveDeduction: waiveSuddenLeave,
      waiveLopDeduction: waiveLop,
      waivePtDeduction: waivePt,
      waiveMissingPunchDeduction: waiveMissingPunch,
    });

    setLoading(false);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const modalContent = isOpen ? (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%', maxWidth: '540px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
          padding: '1.75rem', maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Edit Salary Deductions</h2>
            <p className="text-xs text-muted" style={{ marginTop: '0.1rem' }}>{payroll.employeeName} ({payroll.employeeId})</p>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>

            {/* Paid Leave Adjustment Section */}
            {(unadjustedLopDays > 0 || lopDays > 0 || alreadyAppliedAdj > 0 || (leaveBalance.is1YearCompleted && leaveBalance.remainingAnnual > 0)) && (
              <div style={{
                background: canAdjust ? 'rgba(22,163,74,0.06)' : 'rgba(148,163,184,0.06)',
                border: `1.5px solid ${canAdjust ? 'rgba(22,163,74,0.3)' : 'rgba(148,163,184,0.2)'}`,
                borderRadius: '12px', padding: '1rem',
              }}>
                {/* Title Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Gift size={16} style={{ color: canAdjust ? '#16a34a' : '#94a3b8' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: canAdjust ? '#16a34a' : '#94a3b8' }}>
                    Paid Leave Adjustment
                  </span>
                  <span style={{
                    background: canAdjust ? 'rgba(22,163,74,0.12)' : 'rgba(148,163,184,0.15)',
                    color: canAdjust ? '#16a34a' : '#94a3b8',
                    fontSize: '0.7rem', fontWeight: 700, borderRadius: '20px', padding: '0.1rem 0.5rem',
                  }}>
                    REDUCES LOP
                  </span>
                </div>

                {/* 6-Month Block Policy Notice */}
                {leaveBalance.blockNumber === 0 && (
                  <div style={{
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#b45309',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem'
                  }}>
                    <span>⏳ Probation Active: 0 paid leaves during first 6 months. 6 annual paid leaves unlock after completing 6 months.</span>
                  </div>
                )}
                {leaveBalance.blockNumber === 1 && (
                  <div style={{
                    background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)',
                    borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#15803d',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem'
                  }}>
                    <span>🎉 Months 7–12 Active: 6 annual paid leaves unlocked!</span>
                  </div>
                )}
                {leaveBalance.blockNumber === 2 && (
                  <div style={{
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#1d4ed8',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem'
                  }}>
                    <span>🏆 1+ Year Completed: 6 annual paid leaves unlocked. Any untaken leaves encashed into salary.</span>
                  </div>
                )}

                {/* Annual Balance Pills */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div style={{
                    background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                    borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Annual Total: </span>
                    <strong style={{ color: '#0891b2' }}>{leaveBalance.annualTotal} leaves</strong>
                  </div>
                  <div style={{
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Used: </span>
                    <strong style={{ color: '#d97706' }}>
                      {leaveBalance.usedThisYear + adjDays}
                      {Number(leaveBalance.openingPaidLeavesUsed || 0) > 0 ? ` (${leaveBalance.openingPaidLeavesUsed} opening + ${(leaveBalance.payrollUsedThisYear || 0) + adjDays} payroll)` : ''}
                    </strong>
                  </div>
                  <div style={{
                    background: (leaveBalance.remainingAnnual - adjDays) > 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                    border: `1px solid ${(leaveBalance.remainingAnnual - adjDays) > 0 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                    borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Remaining: </span>
                    <strong style={{ color: (leaveBalance.remainingAnnual - adjDays) > 0 ? '#16a34a' : '#dc2626' }}>
                      {Math.max(0, leaveBalance.remainingAnnual - adjDays)}
                    </strong>
                  </div>
                  <div style={{
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Period: </span>
                    <strong style={{ color: '#7c3aed' }}>{leaveBalance.periodLabel}</strong>
                  </div>
                </div>

                {/* Blocked state */}
                {leaveBalance.blockNumber > 0 && (periodBlocked || annualExhausted) && (
                  <div style={{
                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                    background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#dc2626',
                  }}>
                    <AlertCircle size={14} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                    <span>
                      {annualExhausted
                        ? `All ${leaveBalance.annualTotal} annual paid leaves have been used this year.`
                        : `A paid leave was already used in the ${leaveBalance.periodLabel} period.`}
                    </span>
                  </div>
                )}

                {/* Active adjustment input */}
                {canAdjust && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <span>Apply Leave Days</span>
                        <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>
                          (max {effectiveMax} available to offset LOP · {availableAnnual} in annual quota)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={effectiveMax}
                        className="form-input font-mono"
                        value={paidLeaveAdj}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setPaidLeaveAdj(String(Math.min(v, effectiveMax)));
                        }}
                        placeholder="0"
                      />
                    </div>
                    {adjDays > 0 && (
                      <div style={{
                        textAlign: 'center', padding: '0.5rem 0.75rem',
                        background: 'rgba(22,163,74,0.1)', borderRadius: '8px', minWidth: '110px',
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Employee Saves</div>
                        <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>+{formatINR(savedAmount)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Already applied adjustment */}
                {!canAdjust && (payroll.paidLeaveAdjustment || 0) > 0 && (
                  <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                    ✓ {payroll.paidLeaveAdjustment} day(s) already adjusted this period
                  </div>
                )}

                {/* 1-Year Paid Leave Encashment Section */}
                {leaveBalance.is1YearCompleted && leaveBalance.remainingAnnual > 0 && (
                  <div style={{
                    background: 'rgba(59,130,246,0.08)', border: '1.5px solid rgba(59,130,246,0.3)',
                    borderRadius: '10px', padding: '0.85rem', marginTop: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1d4ed8' }}>
                          🏆 1-Year Tenure Completed: Paid Leave Encashment
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {leaveBalance.remainingAnnual} unused paid leave(s) available for encashment ({formatINR(leaveBalance.encashmentAmount)}).
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#1d4ed8', flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={encashRemaining}
                          onChange={(e) => setEncashRemaining(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                        />
                        Encash to Salary
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Leave Without Pay (LOP) Deduction Waiver Section */}
            {(lopDays > 0 || Number(payroll.lopDeduction || 0) > 0 || payroll.waiveLopDeduction) && (
              <div style={{
                background: waiveLop ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1.5px solid ${waiveLop ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '12px', padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: waiveLop ? '#16a34a' : '#dc2626' }}>
                      Leave Without Pay (LOP) Deduction (₹)
                    </span>
                    {lopDays > 0 && (
                      <span className="text-xs text-muted" style={{ marginLeft: '0.4rem' }}>
                        ({lopDays} day{lopDays > 1 ? 's' : ''} LOP)
                      </span>
                    )}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: waiveLop ? '#16a34a' : '#dc2626' }}>
                    <input
                      type="checkbox"
                      checked={waiveLop}
                      onChange={(e) => setWaiveLop(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                    />
                    Waive (₹0)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    disabled
                    className="form-input font-mono"
                    style={{ opacity: waiveLop ? 0.6 : 1 }}
                    value={waiveLop ? '₹0.00 (Waived)' : formatINR(adjustedLopDeduction)}
                  />
                  <span style={{ fontSize: '0.75rem', color: waiveLop ? '#16a34a' : 'var(--text-muted)' }}>
                    {waiveLop ? '✓ LOP deduction waived' : `Auto LOP deduction (${formatINR(adjustedLopDeduction)})`}
                  </span>
                </div>
              </div>
            )}

            {/* Missing Punch Biometric Attendance Deduction Waiver Section */}
            {(isProfileMissingPunchDisabled || missingPunchDays > 0 || payroll.waiveMissingPunchDeduction) && (
              <div style={{
                background: isProfileMissingPunchDisabled ? 'rgba(6,182,212,0.06)' : waiveMissingPunch ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1.5px solid ${isProfileMissingPunchDisabled ? 'rgba(6,182,212,0.3)' : waiveMissingPunch ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '12px', padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isProfileMissingPunchDisabled ? '#06b6d4' : waiveMissingPunch ? '#16a34a' : '#dc2626' }}>
                      Missing Punch Deduction (₹)
                    </span>
                    {missingPunchDays > 0 && (
                      <span className="text-xs text-muted" style={{ marginLeft: '0.4rem' }}>
                        ({missingPunchDays} missing punch{missingPunchDays > 1 ? 'es' : ''} / {missingPunchDeductionDays}d ded)
                      </span>
                    )}
                  </div>
                  {isProfileMissingPunchDisabled ? (
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#06b6d4', padding: '0.2rem 0.5rem', background: 'rgba(6,182,212,0.1)', borderRadius: '6px' }}>
                      Profile Exempt (OFF)
                    </span>
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: waiveMissingPunch ? '#16a34a' : '#dc2626' }}>
                      <input
                        type="checkbox"
                        checked={waiveMissingPunch}
                        onChange={(e) => setWaiveMissingPunch(e.target.checked)}
                        style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                      />
                      Waive (₹0)
                    </label>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    disabled
                    className="form-input font-mono"
                    style={{ opacity: (isProfileMissingPunchDisabled || waiveMissingPunch) ? 0.6 : 1 }}
                    value={isProfileMissingPunchDisabled ? '₹0.00 (Exempt in Profile)' : waiveMissingPunch ? '₹0.00 (Waived)' : formatINR(currentMissingPunchDeduction)}
                  />
                  <span style={{ fontSize: '0.75rem', color: isProfileMissingPunchDisabled ? '#06b6d4' : waiveMissingPunch ? '#16a34a' : 'var(--text-muted)' }}>
                    {isProfileMissingPunchDisabled
                      ? '✓ Employee profile has Missing Punch rule turned OFF (Exempt)'
                      : waiveMissingPunch
                      ? '✓ Missing punch deduction waived'
                      : `Auto missing punch deduction (${formatINR(currentMissingPunchDeduction)})`}
                  </span>
                </div>
              </div>
            )}

            {/* Short Working Hours Editable Section */}
            {(Number(payroll.shortHoursDeduction || 0) > 0 || Number(payroll.shortWorkingHours || 0) > 0) && (
              <div style={{
                background: waiveShortHours ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1.5px solid ${waiveShortHours ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '12px', padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: waiveShortHours ? '#16a34a' : '#dc2626' }}>
                      Short Working Hours Deduction (₹)
                    </span>
                    {Number(payroll.shortWorkingHours || 0) > 0 && (
                      <span className="text-xs text-muted" style={{ marginLeft: '0.4rem' }}>
                        ({decimalHoursToHHMMString(payroll.shortWorkingHours)} / {decimalHoursToReadableString(payroll.shortWorkingHours)} short)
                      </span>
                    )}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: waiveShortHours ? '#16a34a' : '#dc2626' }}>
                    <input
                      type="checkbox"
                      checked={waiveShortHours}
                      onChange={(e) => {
                        setWaiveShortHours(e.target.checked);
                        if (e.target.checked) setShortHoursVal('0');
                        else setShortHoursVal(String(payroll.shortHoursDeduction || 0));
                      }}
                      style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                    />
                    Waive (₹0)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={waiveShortHours}
                    className="form-input font-mono"
                    style={{ opacity: waiveShortHours ? 0.6 : 1 }}
                    value={waiveShortHours ? '0' : shortHoursVal}
                    onChange={(e) => {
                      setShortHoursVal(e.target.value);
                      if (waiveShortHours) setWaiveShortHours(false);
                    }}
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', textDecoration: 'underline' }}
                    onClick={() => {
                      setWaiveShortHours(false);
                      setShortHoursVal(String(payroll.shortHoursDeduction || 0));
                    }}
                  >
                    Reset Auto ({formatINR(Number(payroll.shortHoursDeduction || 0))})
                  </button>
                </div>
              </div>
            )}

            {/* Late Coming Deduction Editable Section */}
            {(Number(payroll.latePenaltyDeduction || 0) > 0 || Number(payroll.latePenaltyDays || 0) > 0 || payroll.waiveLatePenaltyDeduction || Number(payroll.lateCount || 0) > 0) && (
              <div style={{
                background: waiveLatePenalty ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1.5px solid ${waiveLatePenalty ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '12px', padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: waiveLatePenalty ? '#16a34a' : '#dc2626' }}>
                      Late Coming Deduction (₹)
                    </span>
                    {(Number(payroll.latePenaltyDays || 0) > 0 || Number(payroll.lateCount || 0) > 0) && (
                      <span className="text-xs text-muted" style={{ marginLeft: '0.4rem' }}>
                        ({Number(payroll.latePenaltyDays || 0)}d penalty{Number(payroll.lateCount || 0) > 0 ? ` / ${payroll.lateCount} late` : ''})
                      </span>
                    )}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: waiveLatePenalty ? '#16a34a' : '#dc2626' }}>
                    <input
                      type="checkbox"
                      checked={waiveLatePenalty}
                      onChange={(e) => setWaiveLatePenalty(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                    />
                    Waive (₹0)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    disabled
                    className="form-input font-mono"
                    style={{ opacity: waiveLatePenalty ? 0.6 : 1 }}
                    value={waiveLatePenalty ? '₹0.00 (Waived)' : formatINR(Number(payroll.latePenaltyDeduction || 0))}
                  />
                  <span style={{ fontSize: '0.75rem', color: waiveLatePenalty ? '#16a34a' : 'var(--text-muted)' }}>
                    {waiveLatePenalty ? '✓ Late penalty waived' : `Auto late penalty (${formatINR(Number(payroll.latePenaltyDeduction || 0))})`}
                  </span>
                </div>
              </div>
            )}

            {/* Sudden Leave Double Deduction (2x Penalty) Editable Section */}
            {(Number(payroll.suddenLeavePenaltyDeduction || 0) > 0 || Number(payroll.suddenLeavePenaltyDays || 0) > 0 || payroll.waiveSuddenLeaveDeduction || Number(payroll.lopDays || 0) > 0) && (
              <div style={{
                background: waiveSuddenLeave ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1.5px solid ${waiveSuddenLeave ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '12px', padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: waiveSuddenLeave ? '#16a34a' : '#dc2626' }}>
                      Sudden Leave Double Deduction (₹)
                    </span>
                    {Number(payroll.suddenLeavePenaltyDays || 0) > 0 && (
                      <span className="text-xs text-muted" style={{ marginLeft: '0.4rem' }}>
                        ({Number(payroll.suddenLeavePenaltyDays || 0)}d charged / 2x penalty)
                      </span>
                    )}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: waiveSuddenLeave ? '#16a34a' : '#dc2626' }}>
                    <input
                      type="checkbox"
                      checked={waiveSuddenLeave}
                      onChange={(e) => setWaiveSuddenLeave(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                    />
                    Waive (₹0)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    disabled
                    className="form-input font-mono"
                    style={{ opacity: waiveSuddenLeave ? 0.6 : 1 }}
                    value={waiveSuddenLeave ? '₹0.00 (Waived)' : formatINR(Number(payroll.suddenLeavePenaltyDeduction || 0))}
                  />
                  <span style={{ fontSize: '0.75rem', color: waiveSuddenLeave ? '#16a34a' : 'var(--text-muted)' }}>
                    {waiveSuddenLeave ? '✓ 2x penalty waived' : `Auto 2x deduction (${formatINR(Number(payroll.suddenLeavePenaltyDeduction || 0))})`}
                  </span>
                </div>
              </div>
            )}

            {/* Professional Tax (PT) Deduction Waiver Section */}
            {(Number(payroll.ptDeduction || 0) > 0 || payroll.waivePtDeduction) && (
              <div style={{
                background: waivePt ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1.5px solid ${waivePt ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '12px', padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: waivePt ? '#16a34a' : '#dc2626' }}>
                      Professional Tax (PT) Deduction (₹)
                    </span>
                    <span className="text-xs text-muted" style={{ marginLeft: '0.4rem' }}>
                      (Statutory Deduction)
                    </span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: waivePt ? '#16a34a' : '#dc2626' }}>
                    <input
                      type="checkbox"
                      checked={waivePt}
                      onChange={(e) => setWaivePt(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                    />
                    Waive (₹0)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    disabled
                    className="form-input font-mono"
                    style={{ opacity: waivePt ? 0.6 : 1 }}
                    value={waivePt ? '₹0.00 (Waived)' : formatINR(Number(payroll.ptDeduction || 0))}
                  />
                  <span style={{ fontSize: '0.75rem', color: waivePt ? '#16a34a' : 'var(--text-muted)' }}>
                    {waivePt ? '✓ Professional Tax waived' : `Auto PT deduction (${formatINR(Number(payroll.ptDeduction || 0))})`}
                  </span>
                </div>
              </div>
            )}

            {/* Other Deduction */}
            <div className="form-group">
              <label className="form-label">Other / Custom Deduction (₹)</label>
              <input
                type="number" step="0.01" className="form-input font-mono"
                value={otherDeduction}
                onChange={(e) => setOtherDeduction(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Deduction Reason / Note</label>
              <input
                type="text" className="form-input"
                value={otherDeductionNote}
                onChange={(e) => setOtherDeductionNote(e.target.value)}
                placeholder="e.g. Late penalty, Uniform cost"
              />
            </div>

            {/* Unpaid Salary (SD) */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#d97706', fontWeight: 600 }}>
                Unpaid Salary (SD) (₹)
              </label>
              <input
                type="number" step="0.01" className="form-input font-mono"
                value={holdSalaryDeduction}
                onChange={(e) => setHoldSalaryDeduction(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                15-Day Joining Hold (Option 2: capped to days worked in Month 1, remaining balance in Month 2).
              </p>
            </div>

            {/* Refund / Release of Joining Salary Hold */}
            <div className="form-group" style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
              <label className="form-label" style={{ color: '#16a34a', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>Refund / Release Joining Salary Hold (₹)</span>
                <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>F&amp;F / Exit</span>
              </label>
              <input
                type="number" step="0.01" className="form-input font-mono"
                value={holdSalaryReleaseAmount}
                onChange={(e) => setHoldSalaryReleaseAmount(e.target.value)}
                placeholder="0.00"
              />
              <input
                type="text" className="form-input" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                value={holdSalaryReleaseReason}
                onChange={(e) => setHoldSalaryReleaseReason(e.target.value)}
                placeholder="Release Reason (e.g. Exit / F&F settlement release)"
              />
              <p className="text-xs text-muted" style={{ marginTop: '0.3rem' }}>
                Refunds held salary to the employee (credited to gross earnings in this payroll).
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Advance Payment (₹)</label>
                <input
                  type="number" step="0.01" className="form-input font-mono"
                  value={advanceDeduction}
                  onChange={(e) => setAdvanceDeduction(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label className="form-label">ESIC Deduction (₹)</label>
                <input
                  type="number" step="0.01" className="form-input font-mono"
                  value={pfDeduction}
                  onChange={(e) => setPfDeduction(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* TDS Deduction with 10% Auto Calculation and Manual Entry */}
            <div className="form-group" style={{
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '10px',
              padding: '0.875rem 1rem',
              marginTop: '0.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ color: '#2563eb', fontWeight: 600, margin: 0 }}>
                  TDS Deduction (₹)
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.6rem',
                      background: tdsVal === tenPercentTds && tenPercentTds > 0 ? '#2563eb' : 'rgba(59, 130, 246, 0.12)',
                      color: tdsVal === tenPercentTds && tenPercentTds > 0 ? '#ffffff' : '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    onClick={() => setTdsDeduction(String(tenPercentTds))}
                    title={`Apply 10% of Net Salary Before TDS (₹${formatINR(netBeforeTds)})`}
                  >
                    ⚡ Auto 10% ({formatINR(tenPercentTds)})
                  </button>
                  {tdsVal > 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', color: 'var(--text-muted)' }}
                      onClick={() => setTdsDeduction('0')}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input font-mono"
                value={tdsDeduction}
                onChange={(e) => setTdsDeduction(e.target.value)}
                placeholder="Enter manual amount or click 10% above"
                style={{ fontSize: '0.95rem' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Net Before TDS: <strong className="font-mono">{formatINR(netBeforeTds)}</strong></span>
                <span>Default 10%: <strong className="font-mono">{formatINR(tenPercentTds)}</strong></span>
              </div>
            </div>

            {/* Live Preview */}
            <div style={{
              background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: '10px', padding: '0.875rem 1rem', fontSize: '0.85rem',
            }}>
              <div className="flex-between" style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                <span>Gross Salary:</span>
                <span className="font-mono">{formatINR(gross)}</span>
              </div>
              {previewLop > 0 && (
                <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                  <span>LOP Deduction{adjDays > 0 ? ` (after ${adjDays}d leave)` : ''}:</span>
                  <span className="font-mono">-{formatINR(previewLop)}</span>
                </div>
              )}
              {waiveLop && adjustedLopDeduction > 0 && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '0.3rem' }}>
                  <span>Leave Without Pay (LOP) Waived:</span>
                  <span className="font-mono">+{formatINR(adjustedLopDeduction)}</span>
                </div>
              )}
              {adjDays > 0 && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '0.3rem' }}>
                  <span>Paid Leave Benefit:</span>
                  <span className="font-mono">+{formatINR(savedAmount)}</span>
                </div>
              )}
              {waiveLatePenalty && currentLateDeduction > 0 && !payroll.waiveLatePenaltyDeduction && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '0.3rem' }}>
                  <span>Late Coming Waived:</span>
                  <span className="font-mono">+{formatINR(currentLateDeduction)}</span>
                </div>
              )}
              {waiveMissingPunch && currentMissingPunchDeduction > 0 && !payroll.waiveMissingPunchDeduction && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '0.3rem' }}>
                  <span>Missing Punch Waived:</span>
                  <span className="font-mono">+{formatINR(currentMissingPunchDeduction)}</span>
                </div>
              )}
              {waiveSuddenLeave && currentSuddenDeduction > 0 && !payroll.waiveSuddenLeaveDeduction && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '0.3rem' }}>
                  <span>Sudden Leave 2x Waived:</span>
                  <span className="font-mono">+{formatINR(currentSuddenDeduction)}</span>
                </div>
              )}
              {parsedShortHours > 0 && (
                <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                  <span>Short Hours Deduction:</span>
                  <span className="font-mono">-{formatINR(parsedShortHours)}</span>
                </div>
              )}
              {advanceVal > 0 && (
                <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                  <span>Advance Payment:</span>
                  <span className="font-mono">-{formatINR(advanceVal)}</span>
                </div>
              )}
              {pfVal > 0 && (
                <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                  <span>ESIC Deduction:</span>
                  <span className="font-mono">-{formatINR(pfVal)}</span>
                </div>
              )}
              {tdsVal > 0 && (
                <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                  <span>TDS Deduction:</span>
                  <span className="font-mono">-{formatINR(tdsVal)}</span>
                </div>
              )}
              {waivePt && Number(payroll.ptDeduction || 0) > 0 && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '0.3rem' }}>
                  <span>Professional Tax (PT) Waived:</span>
                  <span className="font-mono">+{formatINR(Number(payroll.ptDeduction || 0))}</span>
                </div>
              )}
              {ptVal > 0 && (
                <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                  <span>Professional Tax (PT):</span>
                  <span className="font-mono">-{formatINR(ptVal)}</span>
                </div>
              )}
              {otherVal > 0 && (
                <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                  <span>Other Deduction:</span>
                  <span className="font-mono">-{formatINR(otherVal)}</span>
                </div>
              )}
              {holdVal > 0 && (
                <div className="flex-between" style={{ color: '#d97706', marginBottom: '0.3rem' }}>
                  <span>SD:</span>
                  <span className="font-mono">-{formatINR(holdVal)}</span>
                </div>
              )}
              {tdsVal > 0 && (
                <div className="flex-between" style={{ color: '#3b82f6', marginBottom: '0.3rem' }}>
                  <span>Tax Deducted at Source (TDS):</span>
                  <span className="font-mono">-{formatINR(tdsVal)}</span>
                </div>
              )}
              <div className="flex-between" style={{ color: '#ef4444', fontWeight: 600, borderTop: '1px dashed rgba(6,182,212,0.2)', paddingTop: '0.3rem', marginTop: '0.3rem' }}>
                <span>Total Deductions (with TDS):</span>
                <span className="font-mono">-{formatINR(computedTotalDeduction)}</span>
              </div>
              <div className="flex-between" style={{
                borderTop: '1px solid rgba(6,182,212,0.2)', paddingTop: '0.4rem', marginTop: '0.4rem',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Updated Net Salary:</span>
                <span className="font-mono" style={{ fontWeight: 700, fontSize: '1.1rem', color: '#06b6d4' }}>
                  {formatINR(computedNetSalary)}
                </span>
              </div>
              {tdsVal > 0 && (
                <div style={{
                  marginTop: '0.5rem',
                  backgroundColor: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                }}>
                  <div className="flex-between" style={{ fontWeight: 600, color: '#2563eb' }}>
                    <span>Salary Slip Net Payable:</span>
                    <span className="font-mono">{formatINR(slipNetSalary)}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    (On salary slip, Net Salary Payable is shown before TDS as {formatINR(slipNetSalary)}, with TDS {formatINR(tdsVal)} displayed separately below)
                  </span>
                </div>
              )}
            </div>

            <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary" disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Check size={16} /> {loading ? 'Saving...' : 'Save & Recalculate'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary btn-sm"
        title="Edit Deductions"
        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', gap: '0.3rem' }}
      >
        <Edit2 size={13} /> Edit Deductions
      </button>
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
