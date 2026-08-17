'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee } from '@/actions/employees';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [totalSalary, setTotalSalary] = useState<number | string>('');
  const [basic, setBasic] = useState<number | string>('');
  const [hra, setHra] = useState<number | string>('');
  const [conveyance, setConveyance] = useState<number | string>('');

  const handleTotalSalaryChange = (valStr: string) => {
    setTotalSalary(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      autoBifurcateSalary(num);
    }
  };

  const autoBifurcateSalary = (totalVal: number) => {
    if (!totalVal || isNaN(totalVal) || totalVal <= 0) return;
    const b = Math.round(totalVal * 0.50); // Basic = 50%
    const c = Math.min(1600, Math.round(totalVal * 0.05)); // Conveyance = Rs 1600 max
    const h = Math.max(0, totalVal - b - c); // HRA = Balance

    setBasic(b);
    setHra(h);
    setConveyance(c);
  };

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
              <input name="designation" className="form-input" placeholder="e.g., Physiotherapist" />
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
          </div>
        </div>

        {/* Salary Structure */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Salary Structure</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Type total monthly salary to auto-bifurcate into Basic, HRA, Conveyance, and Allowances.
              </p>
            </div>
          </div>

          {/* Quick Bifurcation Input */}
          <div style={{
            background: 'rgba(6,182,212,0.06)',
            border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label className="form-label" style={{ fontWeight: 600, color: '#0891b2' }}>
                💰 Total Monthly Gross Salary (₹)
              </label>
              <input
                type="number"
                className="form-input"
                style={{ fontWeight: 600, fontSize: '1rem', borderColor: '#06b6d4' }}
                placeholder="e.g. 43000"
                value={totalSalary}
                onChange={(e) => handleTotalSalaryChange(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => autoBifurcateSalary(parseFloat(String(totalSalary)))}
              style={{ height: '42px', marginTop: 'auto', background: '#0891b2', borderColor: '#0891b2', gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              ⚡ Auto-Bifurcate Salary
            </button>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Basic Salary (₹) * <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>(50%)</span></label>
              <input
                name="basicSalary"
                type="number"
                step="0.01"
                className="form-input"
                placeholder="21500"
                value={basic}
                onChange={(e) => setBasic(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">HRA (₹) <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>(Balance)</span></label>
              <input
                name="hra"
                type="number"
                step="0.01"
                className="form-input"
                placeholder="19900"
                value={hra}
                onChange={(e) => setHra(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Conveyance (₹)</label>
              <input
                name="conveyance"
                type="number"
                step="0.01"
                className="form-input"
                placeholder="1600"
                value={conveyance}
                onChange={(e) => setConveyance(e.target.value)}
              />
            </div>
            <input name="otherAllowance" type="hidden" value="0" />
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div className="form-checkbox-group">
                <input name="incentiveEligible" type="checkbox" value="true" className="form-checkbox" id="incentiveEligible" />
                <label htmlFor="incentiveEligible" className="form-label" style={{ marginBottom: 0 }}>Incentive Eligible</label>
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div className="form-checkbox-group">
                <input name="overtimeEligible" type="checkbox" value="true" className="form-checkbox" id="overtimeEligible" />
                <label htmlFor="overtimeEligible" className="form-label" style={{ marginBottom: 0 }}>Overtime Eligible</label>
              </div>
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
