import { prisma } from '@/lib/prisma';
import { formatINR, getMonthName } from '@/lib/currency-utils';
import { BarChart3 } from 'lucide-react';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = parseInt(params.month || String(now.getMonth() + 1));
  const year = parseInt(params.year || String(now.getFullYear()));

  // Payroll Summary
  const payrolls = await prisma.monthlyPayroll.findMany({
    where: { month, year },
    include: { employee: { select: { employeeId: true, name: true, designation: true, department: true } } },
    orderBy: { employee: { name: 'asc' } },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">{getMonthName(month)} {year} · Salary Register</p>
        </div>
      </div>

      {/* Salary Register */}
      <div className="glass-card-static">
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={18} style={{ color: '#06b6d4' }} />
          Salary Register — {getMonthName(month)} {year}
        </h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>ID</th>
                <th>Department</th>
                <th className="text-right">Basic</th>
                <th className="text-right">Incentive</th>
                <th className="text-right">OT</th>
                <th className="text-right">Gross</th>
                <th className="text-right">LOP</th>
                <th className="text-right">Short Hrs</th>
                <th className="text-right">Hold Sal</th>
                <th className="text-right">Advance</th>
                <th className="text-right">Other Ded.</th>
                <th className="text-right">Total Ded.</th>
                <th className="text-right">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{p.employee.name}</td>
                  <td className="font-mono text-sm text-muted">{p.employee.employeeId}</td>
                  <td className="text-sm text-muted">{p.employee.department || '—'}</td>
                  <td className="text-right font-mono text-sm">{formatINR(Number(p.basicSalary))}</td>
                  <td className="text-right font-mono text-sm">{formatINR(Number(p.incentiveAmount))}</td>
                  <td className="text-right font-mono text-sm">{formatINR(Number(p.overtimeAmount))}</td>
                  <td className="text-right font-mono text-sm" style={{ fontWeight: 600 }}>{formatINR(Number(p.grossSalary))}</td>
                  <td className="text-right font-mono text-sm" style={{ color: '#f59e0b' }}>{formatINR(Number(p.lopDeduction))}</td>
                  <td className="text-right font-mono text-sm" style={{ color: '#f59e0b' }}>{formatINR(Number(p.shortHoursDeduction || 0))}</td>
                  <td className="text-right font-mono text-sm" style={{ color: '#d97706' }}>{formatINR(Number(p.holdSalaryDeduction || 0))}</td>
                  <td className="text-right font-mono text-sm">{formatINR(Number(p.advanceDeduction))}</td>
                  <td className="text-right font-mono text-sm">{formatINR(Number(p.otherDeduction))}</td>
                  <td className="text-right font-mono text-sm" style={{ color: '#ef4444' }}>{formatINR(Number(p.totalDeduction))}</td>
                  <td className="text-right font-mono text-sm" style={{ fontWeight: 700, color: '#06b6d4' }}>{formatINR(Number(p.netSalary))}</td>
                </tr>
              ))}
              {payrolls.length > 0 && (
                <tr style={{ background: 'rgba(6,182,212,0.05)' }}>
                  <td colSpan={6} style={{ fontWeight: 700 }}>TOTAL</td>
                  <td className="text-right font-mono" style={{ fontWeight: 700 }}>
                    {formatINR(payrolls.reduce((s: number, p: any) => s + Number(p.grossSalary), 0))}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 700, color: '#f59e0b' }}>
                    {formatINR(payrolls.reduce((s: number, p: any) => s + Number(p.lopDeduction), 0))}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 700, color: '#f59e0b' }}>
                    {formatINR(payrolls.reduce((s: number, p: any) => s + Number(p.shortHoursDeduction || 0), 0))}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 700, color: '#d97706' }}>
                    {formatINR(payrolls.reduce((s: number, p: any) => s + Number(p.holdSalaryDeduction || 0), 0))}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 700 }}>
                    {formatINR(payrolls.reduce((s: number, p: any) => s + Number(p.advanceDeduction), 0))}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 700 }}>
                    {formatINR(payrolls.reduce((s: number, p: any) => s + Number(p.otherDeduction), 0))}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 700, color: '#ef4444' }}>
                    {formatINR(payrolls.reduce((s: number, p: any) => s + Number(p.totalDeduction), 0))}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 700, color: '#06b6d4' }}>
                    {formatINR(payrolls.reduce((s: number, p: any) => s + Number(p.netSalary), 0))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
