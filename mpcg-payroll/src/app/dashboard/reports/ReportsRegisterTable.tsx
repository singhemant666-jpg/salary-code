'use client';

import { useState, useMemo } from 'react';
import { formatINR } from '@/lib/currency-utils';
import { Search, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ReportsRegisterTable({
  payrolls,
  monthName,
  year,
  month,
}: {
  payrolls: any[];
  monthName: string;
  year: number;
  month: number;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    payrolls.forEach((p) => {
      if (p.employee?.department) set.add(p.employee.department);
    });
    return Array.from(set).sort();
  }, [payrolls]);

  // Filtered rows
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      const name = (p.employee?.name || '').toLowerCase();
      const empId = (p.employee?.employeeId || '').toLowerCase();
      const dept = (p.employee?.department || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || name.includes(term) || empId.includes(term) || dept.includes(term);
      const matchesDept = filterDept === 'ALL' || (p.employee?.department || '') === filterDept;

      return matchesSearch && matchesDept;
    });
  }, [payrolls, searchTerm, filterDept]);

  // Aggregate stats of filtered list
  const totals = useMemo(() => {
    return filteredPayrolls.reduce(
      (acc, p) => {
        acc.gross += Number(p.grossSalary || 0);
        acc.basic += Number(p.basicSalary || 0);
        acc.incentive += Number(p.incentiveAmount || 0);
        acc.overtimePay += Number(p.overtimeAmount || 0);
        acc.lopDed += Number(p.lopDeduction || 0);
        acc.lateDed += Number(p.latePenaltyDeduction || 0);
        acc.suddenDed += Number(p.suddenLeavePenaltyDeduction || 0);
        acc.shortHrsDed += Number(p.shortHoursDeduction || 0);
        acc.pt += Number(p.ptDeduction || 0);
        acc.esic += Number(p.pfDeduction || 0);
        acc.adv += Number(p.advanceDeduction || 0) + Number(p.loanDeduction || 0);
        acc.otherDed += Number(p.otherDeduction || 0);
        acc.totalDed += Number(p.totalDeduction || 0);
        acc.net += Number(p.netSalary || 0);
        acc.presentDays += Number(p.presentDays || 0);
        acc.lopDays += Number(p.lopDays || 0);
        return acc;
      },
      {
        gross: 0,
        basic: 0,
        incentive: 0,
        overtimePay: 0,
        lopDed: 0,
        lateDed: 0,
        suddenDed: 0,
        shortHrsDed: 0,
        pt: 0,
        esic: 0,
        adv: 0,
        otherDed: 0,
        totalDed: 0,
        net: 0,
        presentDays: 0,
        lopDays: 0,
      }
    );
  }, [filteredPayrolls]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Search & Department Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              placeholder="Search by employee name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: '36px',
                width: '100%',
                height: '38px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {departments.length > 0 && (
            <select
              className="form-select"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{ width: '160px', height: '38px', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredPayrolls.length}</strong> of <strong>{payrolls.length}</strong> employees
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-card-static" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ maxHeight: '720px', overflowX: 'auto', overflowY: 'auto' }}>
          <table className="data-table" style={{ fontSize: '0.825rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#0f172a' }}>
              <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ minWidth: '40px', padding: '10px 8px' }}>#</th>
                <th style={{ minWidth: '180px', padding: '10px 12px' }}>Employee</th>
                <th style={{ minWidth: '100px', padding: '10px 10px' }}>ID</th>
                <th style={{ minWidth: '120px', padding: '10px 10px' }}>Dept</th>
                
                {/* Attendance */}
                <th style={{ minWidth: '65px', textAlign: 'center', padding: '10px 6px' }}>Present</th>
                <th style={{ minWidth: '65px', textAlign: 'center', padding: '10px 6px' }}>LOP</th>
                <th style={{ minWidth: '75px', textAlign: 'center', padding: '10px 6px' }}>Sudden</th>
                <th style={{ minWidth: '65px', textAlign: 'center', padding: '10px 6px' }}>Late</th>
                
                {/* Earnings */}
                <th style={{ minWidth: '100px', textAlign: 'right', padding: '10px 10px' }}>Basic (₹)</th>
                <th style={{ minWidth: '90px', textAlign: 'right', padding: '10px 10px' }}>Incentive</th>
                <th style={{ minWidth: '85px', textAlign: 'right', padding: '10px 10px' }}>OT Pay</th>
                <th style={{ minWidth: '110px', textAlign: 'right', padding: '10px 10px', color: '#38bdf8', fontWeight: 700 }}>Gross (₹)</th>
                
                {/* Deductions */}
                <th style={{ minWidth: '100px', textAlign: 'right', padding: '10px 10px', color: '#f59e0b' }}>LOP Ded</th>
                <th style={{ minWidth: '95px', textAlign: 'right', padding: '10px 10px', color: '#f87171' }}>Sudden 2x</th>
                <th style={{ minWidth: '90px', textAlign: 'right', padding: '10px 10px', color: '#f59e0b' }}>Short Hrs</th>
                <th style={{ minWidth: '75px', textAlign: 'right', padding: '10px 10px' }}>P. Tax</th>
                <th style={{ minWidth: '75px', textAlign: 'right', padding: '10px 10px', color: '#ef4444' }}>ESIC (₹)</th>
                <th style={{ minWidth: '90px', textAlign: 'right', padding: '10px 10px' }}>Advance</th>
                <th style={{ minWidth: '110px', textAlign: 'right', padding: '10px 10px', color: '#ef4444', fontWeight: 700 }}>Total Ded</th>
                
                {/* Net */}
                <th style={{ minWidth: '120px', textAlign: 'right', padding: '10px 12px', color: '#34d399', fontWeight: 800 }}>Net Salary (₹)</th>
                <th style={{ minWidth: '120px', padding: '10px 10px' }}>Bank</th>
                <th style={{ minWidth: '130px', padding: '10px 10px' }}>Account No</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={22} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>No payroll records found for this period</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', opacity: 0.8 }}>
                      Select another month from the selector above or generate payroll in the Payroll tab.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((p, idx) => {
                  const emp = p.employee || {};
                  const rawEmpId = (emp.employeeId || '').trim();
                  const cleanEmpId = rawEmpId.startsWith('MPC-') ? rawEmpId : (rawEmpId ? `MPC-${rawEmpId}` : '—');
                  const suddenDays = Number(p.suddenLeavePenaltyDays || 0);

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ color: 'var(--text-secondary)', padding: '8px 8px' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.designation || 'Staff'}</div>
                      </td>
                      <td className="font-mono text-muted" style={{ padding: '8px 10px', fontSize: '0.8rem' }}>
                        {cleanEmpId}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {emp.department || 'General'}
                      </td>

                      {/* Attendance */}
                      <td style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 600 }}>
                        {Number(p.presentDays || 0)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 6px', color: Number(p.lopDays || 0) > 0 ? '#f59e0b' : 'inherit' }}>
                        {Number(p.lopDays || 0)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 6px', color: suddenDays > 0 ? '#ef4444' : 'inherit' }}>
                        {suddenDays > 0 ? `${suddenDays}d (2x)` : '—'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 6px', color: 'var(--text-secondary)' }}>
                        {Number(p.lateCount ?? p.latePenaltyDays ?? 0) || '—'}
                      </td>

                      {/* Earnings */}
                      <td className="text-right font-mono" style={{ padding: '8px 10px' }}>
                        {formatINR(Number(p.basicSalary || 0))}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                        {formatINR(Number(p.incentiveAmount || 0))}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                        {formatINR(Number(p.overtimeAmount || 0))}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px', fontWeight: 700, color: '#38bdf8' }}>
                        {formatINR(Number(p.grossSalary || 0))}
                      </td>

                      {/* Deductions */}
                      <td className="text-right font-mono" style={{ padding: '8px 10px', color: '#f59e0b' }}>
                        {formatINR(Number(p.lopDeduction || 0))}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px', color: '#f87171' }}>
                        {formatINR(Number(p.suddenLeavePenaltyDeduction || 0))}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px', color: '#f59e0b' }}>
                        {formatINR(Number(p.shortHoursDeduction || 0))}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px' }}>
                        {formatINR(Number(p.ptDeduction || 0))}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px', color: Number(p.pfDeduction || 0) > 0 ? '#ef4444' : 'inherit' }}>
                        {Number(p.pfDeduction || 0) > 0 ? formatINR(Number(p.pfDeduction)) : '—'}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px' }}>
                        {formatINR(Number(p.advanceDeduction || 0) + Number(p.loanDeduction || 0))}
                      </td>
                      <td className="text-right font-mono" style={{ padding: '8px 10px', fontWeight: 700, color: '#ef4444' }}>
                        {formatINR(Number(p.totalDeduction || 0))}
                      </td>

                      {/* Net */}
                      <td className="text-right font-mono" style={{ padding: '8px 12px', fontWeight: 800, color: '#34d399', fontSize: '0.9rem' }}>
                        {formatINR(Number(p.netSalary || 0))}
                      </td>

                      {/* Bank Details */}
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {emp.bankName || '—'}
                      </td>
                      <td className="font-mono" style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {emp.accountNumber ? `•••• ${emp.accountNumber.slice(-4)}` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* TOTALS FOOTER */}
              {filteredPayrolls.length > 0 && (
                <tr
                  style={{
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    borderTop: '2px solid rgba(6, 182, 212, 0.3)',
                    fontWeight: 700,
                  }}
                >
                  <td colSpan={4} style={{ padding: '12px 10px', color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TOTAL ({filteredPayrolls.length} EMPLOYEES)
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 6px' }}>{Math.round(totals.presentDays)}</td>
                  <td style={{ textAlign: 'center', padding: '12px 6px', color: '#f59e0b' }}>{Math.round(totals.lopDays)}</td>
                  <td style={{ textAlign: 'center', padding: '12px 6px' }}>—</td>
                  <td style={{ textAlign: 'center', padding: '12px 6px' }}>—</td>
                  
                  {/* Earnings Totals */}
                  <td className="text-right font-mono" style={{ padding: '12px 10px' }}>{formatINR(totals.basic)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px' }}>{formatINR(totals.incentive)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px' }}>{formatINR(totals.overtimePay)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px', color: '#38bdf8', fontSize: '0.9rem' }}>
                    {formatINR(totals.gross)}
                  </td>
                  
                  {/* Deductions Totals */}
                  <td className="text-right font-mono" style={{ padding: '12px 10px', color: '#f59e0b' }}>{formatINR(totals.lopDed)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px', color: '#f87171' }}>{formatINR(totals.suddenDed)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px', color: '#f59e0b' }}>{formatINR(totals.shortHrsDed)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px' }}>{formatINR(totals.pt)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px', color: '#ef4444' }}>{formatINR(totals.esic)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px' }}>{formatINR(totals.adv)}</td>
                  <td className="text-right font-mono" style={{ padding: '12px 10px', color: '#ef4444', fontSize: '0.9rem' }}>
                    {formatINR(totals.totalDed)}
                  </td>
                  
                  {/* Net Total */}
                  <td className="text-right font-mono" style={{ padding: '12px 12px', color: '#34d399', fontSize: '1rem', fontWeight: 800 }}>
                    {formatINR(totals.net)}
                  </td>
                  <td colSpan={2} style={{ padding: '12px 10px' }}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
