import React from 'react';
import { formatINR } from '@/lib/currency-utils';
import { Calculator, Clock, Calendar, AlertTriangle, FileText, CheckCircle, ShieldAlert } from 'lucide-react';

interface SalaryCalculationBreakdownProps {
  payroll: any;
  employee: any;
}

export default function SalaryCalculationBreakdown({ payroll, employee }: SalaryCalculationBreakdownProps) {
  const basicSalary = Number(payroll.basicSalary || 0);
  const grossSalary = Number(payroll.grossSalary || 0);
  const netSalary = Number(payroll.netSalary || 0);
  const totalDays = Number(payroll.totalDays || 30);
  
  // Rate calculations
  const perDayRate = basicSalary / 30; // Company standard: 30 days divisor
  const stdHours = Number(employee.standardWorkingHours || 9);
  const hourlyRate = perDayRate / stdHours;

  // Attendance numbers
  const presentDays = Number(payroll.presentDays || 0);
  const paidLeaveDays = Number(payroll.paidLeaveDays || 0);
  const weeklyOffs = Number(payroll.weeklyOffs || 0);
  const holidays = Number(payroll.holidays || 0);
  const missingPunchDays = Number(payroll.missingPunchDays || 0);
  const lopDays = Number(payroll.lopDays || 0);
  const paidLeaveAdjustment = Number(payroll.paidLeaveAdjustment || 0);
  const sandwichedDays = Number(payroll.sandwichedDays || 0);

  // Hours
  const totalWorkingHours = Number(payroll.totalWorkingHours || 0);
  const expectedHours = presentDays * stdHours;
  const shortWorkingHours = Number(payroll.shortWorkingHours || 0);
  const shortHoursDeduction = Number(payroll.shortHoursDeduction || 0);

  // Deductions
  const lopDeduction = Number(payroll.lopDeduction || 0);
  const holdSalaryDeduction = Number(payroll.holdSalaryDeduction || 0);
  const advanceDeduction = Number(payroll.advanceDeduction || 0);
  const loanDeduction = Number(payroll.loanDeduction || 0);
  const otherDeduction = Number(payroll.otherDeduction || 0);
  const pfDeduction = Number(payroll.pfDeduction || 0);
  const totalDeduction = Number(payroll.totalDeduction || 0);

  const isStrictLate = Boolean(employee.strictLateRule);

  return (
    <div
      className="glass-card-static"
      style={{
        marginTop: '1.5rem',
        border: '1px solid rgba(8, 145, 178, 0.3)',
        borderRadius: '16px',
        padding: '1.5rem',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(8, 145, 178, 0.04) 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div
          style={{
            padding: '10px',
            borderRadius: '12px',
            backgroundColor: 'rgba(8, 145, 178, 0.15)',
            color: '#06b6d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Calculator size={24} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Detailed Salary Calculation & Step-by-Step Breakdown
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Transparent multiplication formulas, rate calculations, and deduction logic for {employee.name}.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        {/* Step 1: Base Rates */}
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>
            <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '6px' }}>STEP 1</span>
            Base Rates & Daily / Hourly Formulas
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '0.875rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>1. Per-Day Salary Rate</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa', margin: '0.25rem 0' }}>
                {formatINR(perDayRate)} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/ day</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                Formula: Basic Salary ({formatINR(basicSalary)}) ÷ 30 days
              </div>
              <div style={{ fontSize: '0.75rem', color: '#93c5fd', marginTop: '0.3rem' }}>
                Calculation: ₹{basicSalary.toLocaleString('en-IN')} ÷ 30 = ₹{perDayRate.toFixed(4)}
              </div>
            </div>

            <div style={{ padding: '0.875rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>2. Standard Hourly Rate</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa', margin: '0.25rem 0' }}>
                ₹{hourlyRate.toFixed(3)} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/ hour</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                Formula: Per-Day Rate (₹{perDayRate.toFixed(2)}) ÷ Shift Hours ({stdHours}h)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#c4b5fd', marginTop: '0.3rem' }}>
                Calculation: ₹{perDayRate.toFixed(2)} ÷ {stdHours}h = ₹{hourlyRate.toFixed(3)}/hr
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: LOP & Leave Deductions */}
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>
            <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '6px' }}>STEP 2</span>
            Leave & LOP Deduction Calculations
          </div>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <div style={{ padding: '0.875rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Loss of Pay (LOP) Days Breakdown
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    LOP Days = 30 Base Days − (Present: {presentDays}d + Paid Leave: {paidLeaveDays}d + Offs: {weeklyOffs}d + Holidays: {holidays}d + Single Punch Paid: {missingPunchDays}d)
                  </div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171' }}>
                  {lopDays} LOP Day(s)
                </div>
              </div>

              {paidLeaveAdjustment > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', fontSize: '0.78rem', color: '#4ade80' }}>
                  ✓ Paid Leave Adjusted: -{paidLeaveAdjustment} day(s) credited against LOP
                </div>
              )}

              {sandwichedDays > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', fontSize: '0.78rem', color: '#fca5a5' }}>
                  ⚠️ Sandwich Rule: {sandwichedDays} weekly-off day(s) surrounded by leave converted to LOP
                </div>
              )}

              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  Multiplication: {lopDays} LOP Day(s) × ₹{perDayRate.toFixed(2)} / day
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>
                  = {formatINR(lopDeduction)}
                </div>
              </div>
            </div>

            {/* Special Policy Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {/* Sandwich Leave Rule */}
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#f87171' }}>
                  <AlertTriangle size={14} /> Sandwich Leave Policy
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: '1.4' }}>
                  • Taking full leave on <b>Saturday AND Monday</b> converts the intervening <b>Sunday (Weekly Off) into an Unpaid LOP day</b>.<br />
                  • Status: {sandwichedDays > 0 ? `⚠️ ${sandwichedDays} Sandwiched Off(s) Applied` : '✓ No Sandwich Leave Penalty Active'}.
                </div>
              </div>

              {/* Sudden Leave Policy */}
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.05)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#eab308' }}>
                  <ShieldAlert size={14} /> Unapproved Leave Rule (2x Penalty)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: '1.4' }}>
                  • Day 1 of unapproved leave = 1 day salary deduction.<br />
                  • Day 2 & consecutive unapproved leave days without prior letter = 2 days salary deduction per day.
                </div>
              </div>

              {/* Half Day & Late Mark Rule */}
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#c084fc' }}>
                  <Clock size={14} /> Half-Day & Late Mark Policy (Cumulative)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: '1.4' }}>
                  • <b>Every 3 Mild Lates (5–30m)</b>: Deducts 0.5 day salary (3 lates = 0.5d LOP, 6 lates = 1.0d LOP, 9 lates = 1.5d LOP).<br />
                  • <b>Severe Late ($\ge$30m)</b>: Each occurrence marks that day as Half Day (1st time = 0.5d LOP, 2nd time = another 0.5d LOP, 3rd time = another 0.5d LOP).
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Short Working Hours / Late Mark Hourly Deduction */}
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>
            <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '2px 8px', borderRadius: '6px' }}>STEP 3</span>
            Short Working Hours & Under-time Deduction
          </div>

          <div style={{ padding: '0.875rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Expected Shift Hours</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {expectedHours.toFixed(2)}h <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>({presentDays}d × {stdHours}h)</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Actual Hours Worked</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: totalWorkingHours < expectedHours ? '#f87171' : '#4ade80' }}>
                  {totalWorkingHours.toFixed(2)}h
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Average Daily Hours</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: (presentDays > 0 ? (totalWorkingHours / presentDays) : 0) >= 8.9 ? '#4ade80' : '#f87171' }}>
                  {presentDays > 0 ? (totalWorkingHours / presentDays).toFixed(2) : '0.00'}h / day
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Shortfall Hours</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: shortWorkingHours > 0 ? '#f87171' : '#4ade80' }}>
                  {shortWorkingHours > 0 ? `${shortWorkingHours.toFixed(2)}h shortfall` : '0h (Full Shift Completed)'}
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  Rule: If Average Working Hours ≥ 8.90h/day → Shortfall Deduction = ₹0.00 (Waived) | OT considered if Average &gt; 9.10h/day
                </div>
                <div style={{ fontSize: '0.78rem', color: (presentDays > 0 ? (totalWorkingHours / presentDays) : 0) >= 8.9 ? '#4ade80' : '#f87171', marginTop: '0.25rem', fontWeight: 600 }}>
                  {(presentDays > 0 ? (totalWorkingHours / presentDays) : 0) >= 8.9
                    ? `✓ Average Working Hours (${(presentDays > 0 ? (totalWorkingHours / presentDays) : 0).toFixed(2)}h/day) is ≥ 8.90h/day threshold — Short Hours Deduction is Waived (₹0.00)!`
                    : shortHoursDeduction > 0
                    ? `⚠️ Average Working Hours (${(presentDays > 0 ? (totalWorkingHours / presentDays) : 0).toFixed(2)}h/day) is below 8.90h/day — Shortfall Deduction Applied (${shortWorkingHours.toFixed(2)}h × ₹${hourlyRate.toFixed(3)} = ${formatINR(shortHoursDeduction)}).`
                    : '✓ Short working hours deduction is ₹0.00.'}
                </div>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: shortHoursDeduction > 0 ? '#ef4444' : '#4ade80' }}>
                = {formatINR(shortHoursDeduction)}
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Summary of All Deductions */}
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ec4899', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>
            <span style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', padding: '2px 8px', borderRadius: '6px' }}>STEP 4</span>
            Total Deductions & Final Net Salary Reconciliation
          </div>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <DeductionItem label="1. LOP / Unpaid Leave Deduction" value={lopDeduction} formula={`${lopDays} day(s) × ₹${perDayRate.toFixed(2)}`} />
            <DeductionItem label="2. Short Working Hours Deduction" value={shortHoursDeduction} formula={`${shortWorkingHours.toFixed(2)}h × ₹${hourlyRate.toFixed(3)}`} />
            {holdSalaryDeduction > 0 && (
              <DeductionItem label="3. Joining 15-Days Salary Hold" value={holdSalaryDeduction} formula="15 days × Per-Day Rate" />
            )}
            {advanceDeduction > 0 && (
              <DeductionItem label="4. Advance Recovery" value={advanceDeduction} formula="Monthly Salary Advance Installment" />
            )}
            {loanDeduction > 0 && (
              <DeductionItem label="5. Loan EMI Recovery" value={loanDeduction} formula="Monthly Loan EMI Installment" />
            )}
            {pfDeduction > 0 && (
              <DeductionItem label="6. Provident Fund (PF)" value={pfDeduction} formula="Statutory PF Contribution" />
            )}
            {otherDeduction > 0 && (
              <DeductionItem label="7. Other Deductions" value={otherDeduction} formula={payroll.otherDeductionNote || 'Manual adjustment'} />
            )}

            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '2px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL DEDUCTIONS</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{formatINR(totalDeduction)}</span>
            </div>
          </div>
        </div>

        {/* Step 5: Net Payable Formula */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(8, 145, 178, 0.1)',
            border: '1px solid rgba(8, 145, 178, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', color: '#06b6d4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Final Net Payable Calculation
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
              Gross Salary ({formatINR(grossSalary)}) − Total Deductions ({formatINR(totalDeduction)})
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>NET PAYABLE SALARY</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#06b6d4' }}>
              {formatINR(netSalary)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeductionItem({ label, value, formula }: { label: string; value: number; formula: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', backgroundColor: 'rgba(0, 0, 0, 0.15)', borderRadius: '6px' }}>
      <div>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.75rem', fontFamily: 'monospace' }}>({formula})</span>
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: value > 0 ? '#f87171' : 'var(--text-secondary)' }}>
        {formatINR(value)}
      </span>
    </div>
  );
}
