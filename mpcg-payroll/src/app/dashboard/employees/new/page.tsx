'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee } from '@/actions/employees';
import { isDefaultTdsDesignation } from '@/lib/salary-calculator';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [initialSalary, setInitialSalary] = useState<number | string>('');
  const [basic, setBasic] = useState<number | string>('');
  const [hra, setHra] = useState<number | string>('');
  const [conveyance, setConveyance] = useState<number | string>('');

  const [designation, setDesignation] = useState('');
  const [tdsEnabledManuallyChanged, setTdsEnabledManuallyChanged] = useState(false);
  const [tdsEnabled, setTdsEnabled] = useState(false);

  const isDocOrPhysio = isDefaultTdsDesignation(designation);

  useEffect(() => {
    if (!tdsEnabledManuallyChanged) {
      setTdsEnabled(isDocOrPhysio);
    }
  }, [designation, isDocOrPhysio, tdsEnabledManuallyChanged]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    const result = await createEmployee(formData);

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => router.push('/dashboard/employees'), 1500);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/employees" className="btn btn-ghost btn-icon" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">Add New Employee</h1>
            <p className="page-subtitle">Create a new employee record with salary structure</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px',
          color: '#fca5a5',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '10px',
          color: '#86efac',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Personal Information</h3>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Employee ID *</label>
              <input name="employeeId" className="form-input" placeholder="MPC-001" required />
            </div>
            <div className="form-group">
              <label className="form-label">Biometric ID (RS 70) *</label>
              <input name="biometricId" className="form-input" placeholder="001" required />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input name="name" className="form-input" placeholder="Rahul Sharma" required />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input name="dateOfBirth" type="date" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-select">
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input name="mobile" className="form-input" placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-input" placeholder="rahul@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">PAN Card Number</label>
              <input name="panNumber" className="form-input" placeholder="e.g. ABCDE1234F" style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Address</label>
              <textarea name="address" className="form-textarea" placeholder="Full address" rows={2} />
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Employment Information</h3>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input
                name="designation"
                className="form-input"
                placeholder="e.g., Jr. Treating Physiotherapist, Doctor"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
              {isDocOrPhysio && (
                <span className="text-xs" style={{ color: '#2563eb', fontWeight: 600, display: 'inline-block', marginTop: '0.25rem' }}>
                  ⚡ Auto-enables 10% TDS deduction
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input name="department" className="form-input" placeholder="e.g., Clinical" />
            </div>
            <div className="form-group">
              <label className="form-label">Joining Date</label>
              <input name="joiningDate" type="date" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Exit / Relieving Date</label>
              <input name="exitDate" type="date" className="form-input" />
              <span className="form-hint" style={{ color: '#06b6d4' }}>Last working day (leave blank for active staff)</span>
            </div>
            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select name="employmentType" className="form-select">
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Branch</label>
              <input name="branch" className="form-input" placeholder="e.g., Main Branch" />
            </div>
            <div className="form-group">
              <label className="form-label">Reporting Manager</label>
              <input name="reportingManager" className="form-input" placeholder="e.g., Dr. Ajay" />
            </div>
            <div className="form-group">
              <label className="form-label">Standard Working Hours *</label>
              <select name="standardWorkingHours" className="form-select" defaultValue="9">
                <option value="9">9 Hours / day</option>
                <option value="8">8 Hours / day</option>
                <option value="8.5">8.5 Hours / day</option>
                <option value="10">10 Hours / day</option>
              </select>
              <span className="form-hint">Daily required hours for attendance & LOP</span>
            </div>
            <div className="form-group">
              <label className="form-label">Shift Start Time</label>
              <input name="shiftStartTime" type="time" className="form-input" defaultValue="09:00" />
              <span className="form-hint">Used for late arrival calculation</span>
            </div>
            <div className="form-group">
              <label className="form-label">Shift End Time</label>
              <input name="shiftEndTime" type="time" className="form-input" defaultValue="18:00" />
              <span className="form-hint">Used for early departure calculation</span>
            </div>
            <div className="form-group">
              <label className="form-label">Late Threshold (minutes)</label>
              <input name="lateThresholdMinutes" type="number" className="form-input" defaultValue="10" />
              <span className="form-hint">Minutes after shift start = late</span>
            </div>
            <div className="form-group">
              <label className="form-label">Half Day Threshold (hours)</label>
              <input name="halfDayThreshold" type="number" step="0.5" className="form-input" defaultValue="5" />
              <span className="form-hint">Minimum hours for half-day</span>
            </div>
            <div className="form-group">
              <label className="form-label">Overtime After (hours)</label>
              <input name="overtimeAfterHours" type="number" step="0.5" className="form-input" defaultValue="9" />
              <span className="form-hint">Daily hours after which OT is counted</span>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3', padding: '0.875rem 1rem', background: 'rgba(234, 179, 8, 0.06)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', margin: 0 }}>
                <input
                  name="strictLateRule"
                  type="checkbox"
                  value="true"
                  defaultChecked={false}
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: '#eab308' }}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  Strict Doctor & Staff Late Penalty (Max 4 Grace; 5+ Lates = 0.5 LOP per Late Day)
                </span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 1.7rem' }}>
                First 4 late arrivals past threshold are allowed as grace. If late 5 or more times in a month, ALL late days are penalized with 0.5 day LOP (half day salary deduction) each.
              </p>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3', padding: '0.875rem 1rem', background: 'rgba(124, 58, 237, 0.06)', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', margin: 0 }}>
                <input
                  name="sandwichRule"
                  type="checkbox"
                  value="true"
                  defaultChecked={false}
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: '#7c3aed' }}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  Apply Sandwich Leave Rule (Weekly-offs between leaves/absences count as LOP)
                </span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 1.7rem' }}>
                When ON (checked), weekly-off days surrounded by absences or unpaid leaves are converted to LOP. When OFF (unchecked), the sandwich rule does not apply to this employee.
              </p>
            </div>
          </div>
        </div>

        {/* Salary Structure */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Salary Structure</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Specify the employee's basic salary structure and configuration.
              </p>
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Basic Salary (₹) *</label>
              <input
                name="basicSalary"
                type="number"
                step="0.01"
                className="form-input"
                placeholder="32000"
                value={basic}
                onChange={(e) => setBasic(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Initial Salary (Fixed) (₹)</label>
              <input
                name="initialSalary"
                type="number"
                step="0.01"
                className="form-input"
                placeholder="32000"
                value={initialSalary}
                onChange={(e) => setInitialSalary(e.target.value)}
              />
            </div>
            <input name="hra" type="hidden" value="0" />
            <input name="conveyance" type="hidden" value="0" />
            <input name="otherAllowance" type="hidden" value="0" />
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div className="form-checkbox-group">
                <input name="incentiveEligible" type="checkbox" value="true" className="form-checkbox" id="incentiveEligible" />
                <label htmlFor="incentiveEligible" className="form-label" style={{ marginBottom: 0 }}>Incentive Eligible</label>
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div className="form-checkbox-group">
                <input name="overtimeEligible" type="checkbox" value="true" className="form-checkbox" id="overtimeEligible" defaultChecked={true} />
                <label htmlFor="overtimeEligible" className="form-label" style={{ marginBottom: 0 }}>Overtime Eligible</label>
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div className="form-checkbox-group">
                <input name="suddenLeavePenalty" type="checkbox" value="true" className="form-checkbox" id="suddenLeavePenalty" defaultChecked={true} />
                <label htmlFor="suddenLeavePenalty" className="form-label" style={{ marginBottom: 0 }}>Apply Sudden Leave Penalty</label>
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div className="form-checkbox-group">
                <input name="holdSalaryOnJoining" type="checkbox" value="true" className="form-checkbox" id="holdSalaryOnJoining" />
                <label htmlFor="holdSalaryOnJoining" className="form-label" style={{ marginBottom: 0 }}>Hold 15-Day Salary at Joining</label>
              </div>
            </div>
          </div>
        </div>

        {/* TDS Configuration (Profile-based) */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.25)', background: 'rgba(59, 130, 246, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2563eb' }}>⚡</span> TDS Deduction Settings (Profile-based)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Configure monthly TDS deduction behavior for this employee.
              </p>
            </div>
          </div>

          <div style={{ padding: '0.875rem 1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', margin: 0 }}>
              <input
                name="tdsEnabled"
                type="checkbox"
                value="true"
                checked={tdsEnabled}
                onChange={(e) => {
                  setTdsEnabledManuallyChanged(true);
                  setTdsEnabled(e.target.checked);
                }}
                style={{ width: '1.15rem', height: '1.15rem', accentColor: '#2563eb' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                Enable TDS Deduction for this Employee {isDocOrPhysio ? '(Auto-enabled by Designation)' : ''}
              </span>
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 1.75rem' }}>
              When enabled, TDS is automatically computed during monthly payroll calculation based on the options below (default 10% for Doctors &amp; Physiotherapists).
            </p>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">TDS Calculation Mode</label>
              <select name="tdsMode" className="form-select" defaultValue="PERCENTAGE">
                <option value="PERCENTAGE">Percentage of Net Salary (Default 10%)</option>
                <option value="FIXED">Fixed Manual Amount (₹)</option>
              </select>
              <span className="form-hint">Choose percentage of net or fixed monthly amount</span>
            </div>
            <div className="form-group">
              <label className="form-label">TDS Percentage (%)</label>
              <input name="tdsPercentage" type="number" step="0.01" min="0" max="100" className="form-input" defaultValue="10" />
              <span className="form-hint">Default 10% calculated from net salary</span>
            </div>
            <div className="form-group">
              <label className="form-label">Fixed TDS Amount (₹)</label>
              <input name="tdsAmount" type="number" step="0.01" min="0" className="form-input" placeholder="e.g. 2500" />
              <span className="form-hint">Used if Fixed Mode is selected</span>
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Bank Information</h3>
          <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
            🔒 This information is restricted to authorized personnel only.
          </p>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input name="bankName" className="form-input" placeholder="e.g., State Bank of India" />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input name="accountNumber" className="form-input" placeholder="1234567890" />
            </div>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input name="ifscCode" className="form-input" placeholder="SBIN0001234" />
            </div>
            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input name="accountHolderName" className="form-input" placeholder="Name as per bank records" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
          <Link href="/dashboard/employees" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            <Save size={16} />
            {loading ? 'Creating...' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
