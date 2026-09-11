'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateEmployee } from '@/actions/employees';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function formatDateForInput(dateVal: any): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal.toISOString().split('T')[0];
  }
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

interface EditEmployeeFormProps {
  employee: {
    id: string;
    employeeId: string;
    biometricId: string;
    name: string;
    dateOfBirth: Date | null;
    gender: string | null;
    mobile: string | null;
    email: string | null;
    panNumber: string | null;
    address: string | null;
    designation: string | null;
    department: string | null;
    joiningDate: Date | null;
    employmentType: string;
    branch: string | null;
    reportingManager: string | null;
    standardWorkingHours: number;
    bankName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    accountHolderName: string | null;
    basicSalary: number;
    hra: number;
    conveyance: number;
    otherAllowance: number;
    initialSalary: number | null;
    incentiveEligible: boolean;
    overtimeEligible: boolean;
    suddenLeavePenalty: boolean;
    holdSalaryOnJoining?: boolean;
  };
}

export default function EditEmployeeForm({ employee }: EditEmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [initialSalary, setInitialSalary] = useState<number | string>(employee.initialSalary ?? '');
  const [basic, setBasic] = useState<number | string>(employee.basicSalary || '');
  const [hra, setHra] = useState<number | string>(employee.hra || '');
  const [conveyance, setConveyance] = useState<number | string>(employee.conveyance || '');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    const result = await updateEmployee(employee.id, formData);

    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => router.push(`/dashboard/employees/${employee.id}`), 1200);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
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

      {/* Personal Information */}
      <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Personal Information</h3>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Employee ID</label>
            <input name="employeeId" className="form-input" defaultValue={employee.employeeId} readOnly style={{ opacity: 0.7 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Biometric ID (RS 70) *</label>
            <input name="biometricId" className="form-input" defaultValue={employee.biometricId} required />
          </div>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input name="name" className="form-input" defaultValue={employee.name} required />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input name="dateOfBirth" type="date" className="form-input" defaultValue={formatDateForInput(employee.dateOfBirth)} />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select name="gender" className="form-select" defaultValue={employee.gender || ''}>
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <input name="mobile" className="form-input" defaultValue={employee.mobile || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" defaultValue={employee.email || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">PAN Card Number</label>
            <input name="panNumber" className="form-input" defaultValue={employee.panNumber || ''} placeholder="e.g. ABCDE1234F" style={{ textTransform: 'uppercase' }} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Address</label>
            <textarea name="address" className="form-textarea" defaultValue={employee.address || ''} rows={2} />
          </div>
        </div>
      </div>

      {/* Employment & Shift Information */}
      <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Employment & Shift Settings</h3>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input name="designation" className="form-input" defaultValue={employee.designation || ''} placeholder="e.g. Physiotherapist" />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input name="department" className="form-input" defaultValue={employee.department || ''} placeholder="e.g. Clinical" />
          </div>
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input name="joiningDate" type="date" className="form-input" defaultValue={formatDateForInput(employee.joiningDate)} />
          </div>
          <div className="form-group">
            <label className="form-label">Employment Type</label>
            <select name="employmentType" className="form-select" defaultValue={employee.employmentType}>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Branch</label>
            <input name="branch" className="form-input" defaultValue={employee.branch || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Reporting Manager</label>
            <input name="reportingManager" className="form-input" defaultValue={employee.reportingManager || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Standard Working Hours *</label>
            <select name="standardWorkingHours" className="form-select" defaultValue={String(employee.standardWorkingHours || '9')}>
              <option value="9">9 Hours / day</option>
              <option value="8">8 Hours / day</option>
              <option value="8.5">8.5 Hours / day</option>
              <option value="10">10 Hours / day</option>
            </select>
            <span className="form-hint">Required hours for full-day shift</span>
          </div>
          <div className="form-group">
            <label className="form-label">Shift Start Time</label>
            <input
              name="shiftStartTime"
              type="time"
              className="form-input"
              defaultValue={(employee as any).shiftStartTime || '09:00'}
            />
            <span className="form-hint">Used for late arrival calculation</span>
          </div>
          <div className="form-group">
            <label className="form-label">Shift End Time</label>
            <input
              name="shiftEndTime"
              type="time"
              className="form-input"
              defaultValue={(employee as any).shiftEndTime || '18:00'}
            />
            <span className="form-hint">Used for early departure calculation</span>
          </div>
          <div className="form-group">
            <label className="form-label">Late Threshold (minutes)</label>
            <input
              name="lateThresholdMinutes"
              type="number"
              className="form-input"
              defaultValue={String((employee as any).lateThresholdMinutes ?? 15)}
            />
            <span className="form-hint">Minutes after shift start = late</span>
          </div>
          <div className="form-group">
            <label className="form-label">Half Day Threshold (hours)</label>
            <input
              name="halfDayThreshold"
              type="number"
              step="0.5"
              className="form-input"
              defaultValue={String((employee as any).halfDayThreshold ?? 5)}
            />
            <span className="form-hint">Minimum hours for half-day</span>
          </div>
          <div className="form-group">
            <label className="form-label">Overtime After (hours)</label>
            <input
              name="overtimeAfterHours"
              type="number"
              step="0.5"
              className="form-input"
              defaultValue={String((employee as any).overtimeAfterHours ?? employee.standardWorkingHours ?? 9)}
            />
            <span className="form-hint">Daily hours after which OT is counted</span>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 3', padding: '0.875rem 1rem', background: 'rgba(234, 179, 8, 0.06)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', margin: 0 }}>
              <input
                name="strictLateRule"
                type="checkbox"
                value="true"
                defaultChecked={(employee as any).strictLateRule === true}
                style={{ width: '1.1rem', height: '1.1rem', accentColor: '#eab308' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                Strict Doctor & Staff Late Penalty (3 Late Arrivals = 0.5 LOP & ≥30m Late = Half Day)
              </span>
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 1.7rem' }}>
              Enforces 0.5 day LOP per 3 late arrivals past 5 mins and converts any working day with ≥30 mins late arrival directly into a Half Day.
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
              value={initialSalary}
              onChange={(e) => setInitialSalary(e.target.value)}
            />
          </div>
          <input name="hra" type="hidden" value="0" />
          <input name="conveyance" type="hidden" value="0" />
          <input name="otherAllowance" type="hidden" value="0" />
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div className="form-checkbox-group">
              <input name="incentiveEligible" type="checkbox" value="true" className="form-checkbox" id="incentiveEligible" defaultChecked={employee.incentiveEligible} />
              <label htmlFor="incentiveEligible" className="form-label" style={{ marginBottom: 0 }}>Incentive Eligible</label>
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div className="form-checkbox-group">
              <input name="overtimeEligible" type="checkbox" value="true" className="form-checkbox" id="overtimeEligible" defaultChecked={employee.overtimeEligible} />
              <label htmlFor="overtimeEligible" className="form-label" style={{ marginBottom: 0 }}>Overtime Eligible</label>
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div className="form-checkbox-group">
              <input name="suddenLeavePenalty" type="checkbox" value="true" className="form-checkbox" id="suddenLeavePenalty" defaultChecked={employee.suddenLeavePenalty} />
              <label htmlFor="suddenLeavePenalty" className="form-label" style={{ marginBottom: 0 }}>Apply Sudden Leave Penalty</label>
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div className="form-checkbox-group">
              <input name="holdSalaryOnJoining" type="checkbox" value="true" className="form-checkbox" id="holdSalaryOnJoining" defaultChecked={employee.holdSalaryOnJoining} />
              <label htmlFor="holdSalaryOnJoining" className="form-label" style={{ marginBottom: 0 }}>Hold 15-Day Salary at Joining</label>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Bank Details</h3>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Bank Name</label>
            <input name="bankName" className="form-input" defaultValue={employee.bankName || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Account Number</label>
            <input name="accountNumber" className="form-input" defaultValue={employee.accountNumber || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">IFSC Code</label>
            <input name="ifscCode" className="form-input" defaultValue={employee.ifscCode || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Account Holder Name</label>
            <input name="accountHolderName" className="form-input" defaultValue={employee.accountHolderName || ''} />
          </div>
        </div>
      </div>

      <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
        <Link href={`/dashboard/employees/${employee.id}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          <Save size={16} />
          {loading ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
