import { getEmployees, getDepartments } from '@/actions/employees';
import { formatINR } from '@/lib/currency-utils';
import Link from 'next/link';
import { UserPlus, Search } from 'lucide-react';
import EmployeeSearch from './EmployeeSearch';
import ClearSampleButton from './ClearSampleButton';

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const search = params.search || '';
  const status = params.status || '';
  const department = params.department || '';
  const page = parseInt(params.page || '1');

  const [{ data: employees, total, totalPages }, departments] = await Promise.all([
    getEmployees({ search, status, department, page, pageSize: 20 }),
    getDepartments(),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{total} employees registered</p>
        </div>
        <div className="flex-gap">
          <ClearSampleButton />
          <Link href="/dashboard/employees/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <UserPlus size={16} />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <EmployeeSearch departments={departments} />

      {/* Table */}
      <div className="table-container" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Biometric ID</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Monthly Salary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted" style={{ padding: '3rem' }}>
                  No employees found. Click &quot;Add Employee&quot; to get started.
                </td>
              </tr>
            ) : (
              employees.map((emp: any) => {
                const salary = emp.salaryStructures[0];
                const monthlyTotal = salary
                  ? Number(salary.basicSalary) + Number(salary.hra) + Number(salary.conveyance) + Number(salary.otherAllowance)
                  : 0;

                return (
                  <tr key={emp.id}>
                    <td>
                      <span className="font-mono" style={{ color: '#06b6d4', fontWeight: 600 }}>
                        {emp.employeeId}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{emp.name}</td>
                    <td className="font-mono text-muted">{emp.biometricId}</td>
                    <td className="text-muted">{emp.designation || '—'}</td>
                    <td className="text-muted">{emp.department || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{formatINR(monthlyTotal)}</td>
                    <td>
                      <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/employees/${emp.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/dashboard/employees?page=${p}&search=${search}&status=${status}&department=${department}`}
              className={`pagination-btn ${p === page ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
