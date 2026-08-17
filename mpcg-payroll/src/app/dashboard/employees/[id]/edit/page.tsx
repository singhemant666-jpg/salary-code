import { getEmployeeById } from '@/actions/employees';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EditEmployeeForm from './EditEmployeeForm';

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawEmployee = await getEmployeeById(id);

  if (!rawEmployee) notFound();

  // Convert Prisma Decimal and Date objects to plain JSON
  const employee = JSON.parse(JSON.stringify(rawEmployee));

  const activeSalary = employee.salaryStructures?.find((s: any) => s.isActive) || employee.salaryStructures?.[0] || {
    basicSalary: 0,
    hra: 0,
    conveyance: 0,
    otherAllowance: 0,
    incentiveEligible: false,
    overtimeEligible: false,
  };

  const plainEmployee = {
    ...employee,
    basicSalary: Number(activeSalary.basicSalary || 0),
    hra: Number(activeSalary.hra || 0),
    conveyance: Number(activeSalary.conveyance || 0),
    otherAllowance: Number(activeSalary.otherAllowance || 0),
    incentiveEligible: Boolean(activeSalary.incentiveEligible),
    overtimeEligible: Boolean(activeSalary.overtimeEligible),
    standardWorkingHours: Number(employee.standardWorkingHours || 8),
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/dashboard/employees/${employee.id}`} className="btn btn-ghost btn-icon" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">Edit Employee Profile — {employee.name}</h1>
            <p className="page-subtitle">Update working hours, salary structure, department & details</p>
          </div>
        </div>
      </div>

      <EditEmployeeForm employee={plainEmployee} />
    </div>
  );
}
